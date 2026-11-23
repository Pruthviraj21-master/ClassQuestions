import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { Shell } from "@/components/shell";
import { SignIn } from "@/components/sign-in";
import { QuizDashboard } from "@/components/quiz-dashboard";
import { isSignedIn } from "@/lib/demo";
import { getPaper, loadStudio, reviewProblem, savePaper, totalMarks, uid, type Paper, type Question } from "@/lib/exam";
import { publishQuiz } from "@/lib/quizzes";

export const Route = createFileRoute("/paper/$paperId")({ component: Editor });

function Editor() {
  const { paperId } = Route.useParams();
  const [paper, setPaper] = useState<Paper | null>();
  const [signed, setSigned] = useState<boolean>();
  useEffect(() => { setSigned(isSignedIn()); }, []);
  useEffect(() => { setPaper(getPaper(paperId) ?? null); }, [paperId]);

  if (signed === undefined || paper === undefined) return <Shell><p role="status">Loading paper…</p></Shell>;
  if (!signed) return <SignIn onSignedIn={() => setSigned(true)} />;
  if (!paper) return <Shell teacher>
    <p>This paper is unavailable on this device.</p>
    <Link to="/" className="btn-primary mt-4">Back to papers</Link>
  </Shell>;
  return <Draft key={paperId} initial={paper} />;
}

function Draft({ initial }: { initial: Paper }) {
  const [paper, setPaper] = useState(initial);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const reviewed = paper.questions.filter((q) => q.reviewed && !reviewProblem(q, paper.notes)).length;
  const ready = reviewed > 0 && reviewed === paper.questions.length && !!paper.title.trim();
  const instructions = paper.instructions ?? "Answer all questions. Write clearly and show your working where appropriate.";

  function update(next: Paper) {
    try {
      savePaper(next);
      setPaper(next);
      setError("");
    } catch {
      setError("This browser could not save the change. Free some storage and try again.");
    }
  }

  function patch(id: string, changes: Partial<Question>) {
    update({ ...paper, questions: paper.questions.map((q) =>
      q.id === id ? { ...q, reviewed: false, ...changes } : q) });
  }

  async function setLogo(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 750000) {
      setError("Choose a PNG or JPEG logo under 750 KB.");
      return;
    }
    try {
      const image = await createImageBitmap(file);
      const scale = Math.min(1, 400 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      update({ ...paper, logo: canvas.toDataURL("image/png") });
    } catch {
      setError("Could not read that logo. Choose another PNG or JPEG.");
    }
  }

  async function download(withKey: boolean) {
    setBusy("pdf");
    setError("");
    try {
      const { downloadPaper } = await import("@/lib/paper-pdf");
      await downloadPaper({ ...paper, teacher: paper.teacher ?? loadStudio().teacher, instructions }, withKey);
    } catch {
      setError("Could not create the PDF. Try again or choose another logo.");
    } finally {
      setBusy("");
    }
  }

  async function publish() {
    setBusy("publish");
    setError("");
    try {
      const publication = paper.publication ?? {
        id: crypto.randomUUID(),
        key: Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, "0")).join(""),
      };
      const pending = { ...paper, publication };
      savePaper(pending);
      setPaper(pending);
      await publishQuiz({ data: {
        ...publication,
        paper: {
          title: paper.title, tuition: paper.tuition, className: paper.className,
          minutes: Math.round(paper.minutes), instructions,
          questions: paper.questions.map(({ id, type, difficulty, prompt, answer, options, marks, topic }) => ({
            id, type, difficulty, prompt, answer, options: type === "mcq" ? options : [], marks,
            topic: topic?.trim() || paper.subject.trim() || "General",
          })),
        },
      } });
      const next = { ...pending, publication: { ...publication, published: true } };
      savePaper(next);
      setPaper(next);
    } catch {
      setError("Could not publish the quiz. Check your connection and paper fields, then try again.");
    } finally {
      setBusy("");
    }
  }

  function addQuestion() {
    update({ ...paper, questions: [...paper.questions, {
      id: uid(), type: "short", difficulty: "medium", marks: 2, prompt: "", options: [], answer: "",
    }] });
  }

  return <Shell teacher>
    <Link to="/" className="btn-ghost"><ArrowLeft size={16} /> Papers</Link>
    <h1 className="mt-4 text-3xl">Review your paper</h1>
    <p className="mt-1 text-muted">{reviewed} of {paper.questions.length} questions verified · {totalMarks(paper.questions)} marks</p>
    {error && <p className="mt-4 rounded-lg border border-line bg-paper p-3 text-warn" role="alert">{error}</p>}
    <fieldset disabled={!!busy} className="mt-4 min-w-0 space-y-5">
      <section className="rounded-xl border border-line bg-paper p-4 sm:p-6">
        <h2 className="text-xl">Paper details</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label>Paper title<input className="field mt-1" maxLength={160} value={paper.title}
            onChange={(e) => update({ ...paper, title: e.target.value })} /></label>
          <label>School or tuition name<input className="field mt-1" maxLength={160} value={paper.tuition}
            onChange={(e) => update({ ...paper, tuition: e.target.value })} /></label>
          <label>Teacher name<input className="field mt-1" maxLength={160} value={paper.teacher ?? loadStudio().teacher}
            onChange={(e) => update({ ...paper, teacher: e.target.value })} /></label>
          <label>School logo<input className="field mt-1" type="file" accept="image/png,image/jpeg"
            onChange={(e) => { void setLogo(e.target.files?.[0]); e.target.value = ""; }} /></label>
        </div>
        {paper.logo && <div className="mt-3 flex items-center gap-3">
          <img src={paper.logo} alt="School logo" className="h-12 max-w-28 object-contain" />
          <button className="btn-ghost" type="button" onClick={() => update({ ...paper, logo: undefined })}>Remove logo</button>
        </div>}
        <label className="mt-3 block">Student instructions<textarea className="field mt-1" rows={3} maxLength={2000}
          value={instructions} onChange={(e) => update({ ...paper, instructions: e.target.value })} /></label>
      </section>
      <details className="rounded-xl border border-line bg-paper p-4">
        <summary className="cursor-pointer font-semibold">Teacher notes</summary>
        <label className="mt-3 block">Original material<textarea className="field mt-1" rows={8}
          value={paper.notes} onChange={(e) => update({ ...paper, notes: e.target.value, questions: paper.questions.map((q) => ({ ...q, reviewed: false })) })} /></label>
      </details>
      {!!paper.warnings?.length && <ul className="space-y-1 rounded-lg border border-line bg-paper p-3 text-warn">
        {paper.warnings.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>}
      <ol className="space-y-4">
        {paper.questions.map((q, i) => {
          const problem = reviewProblem(q, paper.notes);
          return <li key={q.id} className="min-w-0 rounded-xl border border-line bg-paper p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl">Question {i + 1}</h2>
              <button className="btn-ghost text-warn" type="button" onClick={() =>
                update({ ...paper, questions: paper.questions.filter((item) => item.id !== q.id) })}>Remove</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label>Format<select className="field mt-1" value={q.type}
                onChange={(e) => patch(q.id, { type: e.target.value as Question["type"] })}>
                <option value="mcq">MCQ</option><option value="short">Short</option><option value="long">Long</option>
              </select></label>
              <label>Marks<input className="field mt-1" type="number" min={1} max={20} value={q.marks}
                onChange={(e) => patch(q.id, { marks: Number(e.target.value) })} /></label>
              <label>Difficulty<select className="field mt-1" value={q.difficulty}
                onChange={(e) => patch(q.id, { difficulty: e.target.value as Question["difficulty"] })}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select></label>
              <label>Topic<input className="field mt-1" maxLength={100} value={q.topic ?? ""}
                placeholder={paper.subject} onChange={(e) => patch(q.id, { topic: e.target.value })} /></label>
            </div>
            <label className="mt-3 block">Question text<textarea className="field mt-1" rows={2} maxLength={1000}
              value={q.prompt} onChange={(e) => patch(q.id, { prompt: e.target.value })} /></label>
            {q.type === "mcq" && <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => <label key={index}>Option {String.fromCharCode(65 + index)}
                <input className="field mt-1" value={q.options[index] ?? ""} maxLength={300} onChange={(e) => {
                  const options = Array.from({ length: 4 }, (_, oi) => oi === index ? e.target.value : q.options[oi] ?? "");
                  patch(q.id, { options });
                }} /></label>)}
            </div>}
            <label className="mt-3 block font-semibold text-leaf">Correct answer<textarea className="field mt-1 font-normal" rows={2}
              maxLength={800} value={q.answer} onChange={(e) => patch(q.id, { answer: e.target.value })} /></label>
            <label className="mt-3 block">Exact supporting excerpt<textarea className="field mt-1" rows={2}
              value={q.source ?? ""} onChange={(e) => patch(q.id, { source: e.target.value })} /></label>
            {problem && <p className="mt-2 text-sm text-warn">{problem}</p>}
            <label className="mt-2 flex min-h-11 items-center gap-2">
              <input className="size-5 shrink-0 accent-leaf" type="checkbox" disabled={!!problem} checked={!!q.reviewed && !problem}
                onChange={(e) => patch(q.id, { reviewed: e.target.checked })} />
              I verified the question and answer against the excerpt
            </label>
          </li>;
        })}
      </ol>
      <button type="button" className="btn-ghost" disabled={paper.questions.length >= 30} onClick={addQuestion}>Add question</button>
      <section className="rounded-xl border border-line bg-paper p-4 sm:p-6">
        <h2 className="text-xl">Download PDF</h2>
        {!ready && <p className="mt-1 text-sm text-muted">Verify every question before exporting or publishing.</p>}
        <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
          <button type="button" className="btn-primary" disabled={!ready} onClick={() => download(false)}><Download size={16} /> Student PDF</button>
          <button type="button" className="btn-ghost" disabled={!ready} onClick={() => download(true)}><Download size={16} /> PDF with answer key</button>
        </div>
      </section>
      <section id="quiz" className="scroll-mt-24 rounded-xl border border-line bg-paper p-4 sm:p-6">
        <h2 className="mb-3 text-2xl">Live quiz and results</h2>
        {paper.publication?.published
          ? <QuizDashboard id={paper.publication.id} accessKey={paper.publication.key} />
          : <><p className="text-muted">Publishing saves a copy for students. Results are available from this teacher browser.</p>
            <button type="button" className="btn-primary mt-3 w-full sm:w-auto" disabled={!ready} onClick={publish}>
              {busy === "publish" ? "Publishing…" : "Publish quiz"}
            </button></>}
      </section>
    </fieldset>
  </Shell>;
}
