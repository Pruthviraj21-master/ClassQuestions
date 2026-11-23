import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/shell";
import { openQuiz, submitQuiz } from "@/lib/quizzes";

export const Route = createFileRoute("/exam/$paperId")({ component: ExamPage });

type StudentPaper = NonNullable<Awaited<ReturnType<typeof openQuiz>>>;

function ExamPage() {
  const { paperId } = Route.useParams();
  const [paper, setPaper] = useState<StudentPaper | null>();
  useEffect(() => {
    let active = true;
    setPaper(undefined);
    openQuiz({ data: paperId }).then(
      (next) => { if (active) setPaper(next); },
      () => { if (active) setPaper(null); },
    );
    return () => { active = false; };
  }, [paperId]);

  return <Shell>
    {paper ? <StudentQuiz key={paperId} paper={paper} paperId={paperId} />
      : <p role="status">{paper === undefined ? "Loading quiz…" : "This quiz is unavailable. Ask your teacher for the current link."}</p>}
  </Shell>;
}

function StudentQuiz({ paper, paperId }: { paper: StudentPaper; paperId: string }) {
  const attempt = useRef("");
  const submitting = useRef(false);
  const [order, setOrder] = useState(paper.questions);
  const [deadline, setDeadline] = useState(0);
  const [left, setLeft] = useState(paper.minutes * 60);
  const [position, setPosition] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitQuiz>>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = useRef<() => void>(() => {});

  function start() {
    attempt.current = crypto.randomUUID();
    setOrder(shuffle(paper.questions).map((q) => ({ ...q, options: shuffle(q.options) })));
    setDeadline(Date.now() + paper.minutes * 60000);
  }

  async function finish() {
    if (submitting.current || result) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      setResult(await submitQuiz({ data: { quizId: paperId, id: attempt.current, picks } }));
    } catch {
      setError("Your answers are still here. Tap Submit to try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  submit.current = finish;

  useEffect(() => {
    if (!deadline || result) return;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(seconds);
      if (!seconds) {
        window.clearInterval(timer);
        submit.current();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [deadline, result]);

  if (result) return <section className="mx-auto max-w-md rounded-xl border border-line bg-paper p-5 text-center">
    <h1 className="text-3xl">Quiz submitted</h1>
    <p className="mt-4 text-4xl text-leaf">{result.score} / {result.total}</p>
    <p className="mt-3">Attempt code <strong>{result.id.slice(0, 8)}</strong></p>
    <p className="mt-2 text-sm text-muted">You can give this code to your teacher to discuss your marks.</p>
  </section>;

  if (!deadline) return <section className="mx-auto max-w-md rounded-xl border border-line bg-paper p-5">
    <p className="text-muted">{paper.tuition}</p>
    <h1 className="mt-1 text-3xl">{paper.title}</h1>
    <p className="mt-2 text-muted">{paper.className} · {paper.minutes} minutes · {paper.questions.length} questions</p>
    {paper.instructions && <p className="mt-4 whitespace-pre-wrap break-words">{paper.instructions}</p>}
    {paper.questions.some((item) => item.type !== "mcq") &&
      <p className="mt-3 text-sm text-muted">Written responses use exact answer matching, ignoring case, spacing and final punctuation.</p>}
    <button type="button" className="btn-primary mt-5 w-full" onClick={start}>Start quiz</button>
  </section>;

  const q = order[position];
  if (!q) return null;

  return <section className="mx-auto max-w-xl">
    <div className="flex justify-between gap-2 text-sm text-muted">
      <span>Question {position + 1} of {order.length}</span>
      <span>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span>
    </div>
    <article className="mt-4 rounded-xl border border-line bg-paper p-5">
      <p className="text-sm text-muted">{q.marks} {q.marks === 1 ? "mark" : "marks"}</p>
      <h2 className="mt-1 break-words text-2xl">{q.prompt}</h2>
      {q.type === "mcq" ? <div className="mt-4 grid gap-2">
        {q.options.map((option) => <button type="button" key={option}
          className={`min-h-11 break-words rounded-lg border px-3 py-3 text-left ${picks[q.id] === option ? "border-leaf bg-leaf-soft" : "border-line"}`}
          disabled={!left || busy} aria-pressed={picks[q.id] === option}
          onClick={() => setPicks({ ...picks, [q.id]: option })}>{option}</button>)}
      </div> : <textarea aria-label="Your answer" className="field mt-4 min-h-32" maxLength={2000}
        disabled={!left || busy} value={picks[q.id] ?? ""}
        onChange={(event) => setPicks({ ...picks, [q.id]: event.target.value })} />}
    </article>
    {error && <p className="mt-3 text-warn" role="alert">{error}</p>}
    <div className="mt-4 flex justify-between gap-2">
      <button type="button" className="btn-ghost" disabled={!left || busy || position === 0} onClick={() => setPosition(position - 1)}>Back</button>
      {left > 0 && position < order.length - 1
        ? <button type="button" className="btn-primary" disabled={busy} onClick={() => setPosition(position + 1)}>Next</button>
        : <button type="button" className="btn-primary" disabled={busy} onClick={finish}>{busy ? "Submitting…" : "Submit"}</button>}
    </div>
  </section>;
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
