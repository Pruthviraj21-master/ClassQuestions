import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { type PublishedPaper, type QuizResult } from "./exam";

const access = z.object({ id: z.uuid(), key: z.string().regex(/^[a-f0-9]{64}$/) });
const question = z
  .object({
    id: z.string().min(1).max(80),
    type: z.enum(["mcq", "short", "long"]),
    difficulty: z.enum(["easy", "medium", "hard"]),
    prompt: z.string().trim().min(1).max(1000),
    options: z.array(z.string().trim().min(1).max(300)).max(4),
    answer: z.string().trim().min(1).max(800),
    marks: z.number().int().min(1).max(20),
    topic: z.string().trim().min(1).max(100),
  })
  .refine(
    (q) =>
      q.type !== "mcq" ||
      (q.options.length === 4 &&
        new Set(q.options.map(normalize)).size === 4 &&
        q.options.includes(q.answer)),
    "Each MCQ needs four distinct options and a matching answer.",
  );

async function hash(key: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const publishQuiz = createServerFn({ method: "POST" })
  .validator(
    access.extend({
      paper: z.object({
        title: z.string().trim().min(1).max(160),
        tuition: z.string().trim().max(160),
        className: z.string().trim().max(80),
        instructions: z.string().trim().max(2000),
        minutes: z.number().int().min(1).max(180),
        questions: z
          .array(question)
          .min(1)
          .max(30)
          .refine((items) => new Set(items.map((item) => item.id)).size === items.length),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const keyHash = await hash(data.key);
    const rows = await sql<{ id: string }>`
      insert into quizzes (id, teacher_key_hash, paper)
      values (${data.id}, ${keyHash}, ${JSON.stringify(data.paper)}::jsonb)
      on conflict (id) do update set id = excluded.id
      where quizzes.teacher_key_hash = excluded.teacher_key_hash
      returning id
    `;
    if (!rows.length) throw new Error("Quiz could not be published.");
  });

export const openQuiz = createServerFn({ method: "GET" })
  .validator(z.uuid())
  .handler(async ({ data }) => {
    const sql = await getSql();
    const [row] = await sql<{
      paper: PublishedPaper;
    }>`select paper from quizzes where id = ${data}`;
    if (!row) return null;
    const { questions, ...header } = row.paper;
    return {
      ...header,
      questions: questions.map(({ id, type, difficulty, prompt, options, marks }) => ({
        id,
        type,
        difficulty,
        prompt,
        options,
        marks,
      })),
    };
  });

export const submitQuiz = createServerFn({ method: "POST" })
  .validator(
    z.object({
      quizId: z.uuid(),
      id: z.uuid(),
      picks: z
        .record(z.string().max(80), z.string().max(2000))
        .refine((picks) => Object.keys(picks).length <= 30),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const [row] = await sql<{
      paper: PublishedPaper;
    }>`select paper from quizzes where id = ${data.quizId}`;
    if (!row) throw new Error("This quiz is unavailable.");
    const items = row.paper.questions.map((q) => {
      const given = data.picks[q.id] ?? "";
      const earned = normalize(given) === normalize(q.answer) ? q.marks : 0;
      return { topic: q.topic, earned, total: q.marks };
    });
    const result: QuizResult = {
      id: data.id,
      score: items.reduce((sum, item) => sum + item.earned, 0),
      total: items.reduce((sum, item) => sum + item.total, 0),
      submittedAt: Date.now(),
      items,
    };
    await sql`insert into quiz_attempts (quiz_id, id, result, submitted_at)
      values (${data.quizId}, ${data.id}, ${JSON.stringify(result)}::jsonb, ${result.submittedAt})
      on conflict (quiz_id, id) do nothing`;
    const [saved] = await sql<{ result: QuizResult }>`
      select result from quiz_attempts where quiz_id = ${data.quizId} and id = ${data.id}`;
    if (!saved) throw new Error("The submission could not be saved.");
    return { id: saved.result.id, score: saved.result.score, total: saved.result.total };
  });

export const quizResults = createServerFn({ method: "POST" })
  .validator(access)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const keyHash = await hash(data.key);
    const [quiz] =
      await sql`select id from quizzes where id = ${data.id} and teacher_key_hash = ${keyHash}`;
    if (!quiz) throw new Error("These results are unavailable on this device.");
    const rows = await sql<{ result: QuizResult }>`
      select a.result from quiz_attempts a join quizzes q on q.id = a.quiz_id
      where q.id = ${data.id} and q.teacher_key_hash = ${keyHash}
      order by a.submitted_at desc`;
    return rows.map(({ result }) => result);
  });

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/[.!?]+$/, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
