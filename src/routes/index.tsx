import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic, ImagePlus, Sparkles, Trash2, Printer, QrCode, ClipboardList } from "lucide-react";
import { Shell } from "@/components/shell";
import { SignIn } from "@/components/sign-in";
import { isSignedIn, seedDemoData } from "@/lib/demo";
import {
  SAMPLE_NOTES,
  deletePaper,
  listPapers,
  loadStudio,
  savePaper,
  saveStudio,
  totalMarks,
  uid,
  type Paper,
  type Studio,
} from "@/lib/exam";
import { generateQuestions } from "@/lib/generate";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [signed, setSigned] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedDemoData();
    setSigned(isSignedIn());
    setReady(true);
  }, []);

  if (!ready) return <div className="min-h-screen" />;
  if (!signed) return <SignIn onSignedIn={() => setSigned(true)} />;
  return <Dashboard />;
}

function Dashboard() {
  const navigate = useNavigate();
  const [studio, setStudio] = useState<Studio>({ teacher: "", tuition: "Sunrise Tuition" });
  const [papers, setPapers] = useState<Paper[]>([]);
  const [ready, setReady] = useState(false);

  const [subject, setSubject] = useState("Science");
  const [className, setClassName] = useState("Class 8");
  const [notes, setNotes] = useState("");
  const [count, setCount] = useState(8);
  const [mix, setMix] = useState<"mcq" | "mixed" | "long">("mixed");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [minutes, setMinutes] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);

  useEffect(() => {
    setStudio(loadStudio());
    setPapers(listPapers());
    setReady(true);
  }, []);

  function persistStudio(next: Studio) {
    setStudio(next);
    saveStudio(next);
  }

  function speak() {
    const Ctor = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec; SpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition
      || (window as unknown as { SpeechRecognition?: new () => SpeechRec }).SpeechRecognition;
    if (!Ctor) {
      setError("This browser has no speech recognition. Type or paste notes instead.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => {
      const said = Array.from(ev.results).map((r) => r[0].transcript).join(" ");
      setNotes((n) => (n ? `${n.trim()} ${said}` : said));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    setListening(true);
    setError("");
    rec.start();
    window.setTimeout(() => rec.stop(), 20000);
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    const text = await file.text().catch(() => "");
    if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
      setNotes((n) => (n ? `${n}\n\n${text}` : text));
      return;
    }
    setError("Photos stay on this device as a reminder. Type or dictate the key points so questions stay faithful to your class. (OCR comes later.)");
  }

  async function make() {
    setBusy(true);
    setError("");
    try {
      const result = generateQuestions({ notes, count: Math.max(4, Math.min(12, count)), mix, difficulty });
      if (!result.questions.length) {
        setError(result.warnings.join(" "));
        return;
      }
      const paper: Paper = {
        id: uid(),
        title: `${subject} test`,
        subject,
        className,
        tuition: studio.tuition || "Tuition",
        notes,
        minutes: Math.max(5, Math.min(180, minutes)),
        questions: result.questions,
        warnings: result.warnings,
        teacher: studio.teacher,
        createdAt: Date.now(),
      };
      savePaper(paper);
      navigate({ to: "/paper/$paperId", params: { paperId: paper.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell teacher>
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-saffron">For tuition teachers</p>
          <h1 className="mt-1 text-4xl text-ink sm:text-5xl">Questions from the class you actually taught.</h1>
          <p className="mt-3 max-w-xl text-lg text-muted">
            Speak, paste, or drop your notes. Patra writes MCQs and long answers only from that material. Review each answer, download the PDF, or share a live quiz with your class.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-paper p-4">
          <label className="block text-sm text-muted">Your name</label>
          <input
            className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-3"
            value={studio.teacher}
            placeholder="e.g. Anita Sharma"
            onChange={(e) => persistStudio({ ...studio, teacher: e.target.value })}
          />
          <label className="mt-3 block text-sm text-muted">Tuition / school name on the paper</label>
          <input
            className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-3"
            value={studio.tuition}
            onChange={(e) => persistStudio({ ...studio, tuition: e.target.value })}
          />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-line bg-paper p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl">New paper</h2>
          <button
            type="button"
            className="text-sm font-semibold text-leaf underline-offset-2 hover:underline"
            onClick={() => setNotes(SAMPLE_NOTES)}
          >
            Load sample Class 8 notes
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Subject">
            <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Class">
            <input className="field" value={className} onChange={(e) => setClassName(e.target.value)} />
          </Field>
          <Field label="Questions">
            <input className="field" type="number" min={4} max={12} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </Field>
          <Field label="Minutes">
            <input className="field" type="number" min={5} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          </Field>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Mix">
            <select className="field" value={mix} onChange={(e) => setMix(e.target.value as typeof mix)}>
              <option value="mixed">MCQ + short + long</option>
              <option value="mcq">MCQ only</option>
              <option value="long">Written only</option>
            </select>
          </Field>
          <Field label="Difficulty">
            <select className="field" value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
              <option value="mixed">Easy, medium and hard</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
        </div>

        <label htmlFor="teacher-notes" className="mt-4 block text-sm text-muted">Your notes — the only source of questions</label>
        <textarea
          className="mt-1 min-h-48 w-full rounded-lg border border-line bg-bg px-3 py-3"
          placeholder="Paste or dictate notes. Use one complete fact per sentence."
          id="teacher-notes" value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={speak} className="btn-ghost">
            <Mic size={16} /> {listening ? "Listening…" : "Speak notes"}
          </button>
          <label className="btn-ghost">
            <ImagePlus size={16} /> Upload .txt
            <input
              type="file"
              accept="text/plain,.txt"
              className="hidden"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-warn">{error}</p>}

        <button type="button" disabled={busy || notes.trim().length < 40} onClick={make} className="btn-primary mt-4 w-full sm:w-auto">
          <Sparkles size={16} /> {busy ? "Writing from your notes…" : "Generate paper"}
        </button>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl">Your papers</h2>
        {!ready ? null : papers.length === 0 ? (
          <p className="mt-2 text-muted">Nothing yet. Generate one from the notes above.</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {papers.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 rounded-xl border border-line bg-paper p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-xl">{p.title}</p>
                  <p className="text-sm text-muted">
                    {p.className} · {p.subject} · {p.questions.length} questions · {totalMarks(p.questions)} marks
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/paper/$paperId" params={{ paperId: p.id }} className="btn-ghost">
                    <ClipboardList size={16} /> Edit
                  </Link>
                  <Link to="/paper/$paperId" params={{ paperId: p.id }} className="btn-ghost">
                    <Printer size={16} /> PDF
                  </Link>
                  <Link to="/paper/$paperId" params={{ paperId: p.id }} hash="quiz" className="btn-ghost">
                    <QrCode size={16} /> Results
                  </Link>
                  <button
                    type="button"
                    className="btn-ghost"
                    aria-label="Delete draft" disabled={!!p.publication}
                    onClick={() => {
                      deletePaper(p.id);
                      setPapers(listPapers());
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
