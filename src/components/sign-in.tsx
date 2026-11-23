import { useState } from "react";
import { BookOpen, LogIn, Sparkles } from "lucide-react";
import { DEMO_EMAIL, DEMO_PASSWORD, signIn } from "@/lib/demo";

/** Teacher lock screen for the local build, with the demo credential shown. */
export function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = signIn(email, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    onSignedIn();
  }

  function useDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper/90">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-paper">
            <BookOpen size={18} />
          </span>
          <span className="font-display text-xl leading-none">Patra</span>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-saffron">Teacher sign in</p>
        <h1 className="mt-1 text-4xl text-ink">Welcome back.</h1>
        <p className="mt-2 text-muted">
          Your drafts and teacher access are saved in this browser. Published quizzes can be opened by students on their devices.
        </p>

        <form onSubmit={submit} className="mt-6 rounded-xl border border-line bg-paper p-5">
          <label className="block text-sm text-muted">
            Email
            <input
              className="field mt-1"
              type="email"
              autoComplete="username"
              value={email}
              placeholder="teacher@patra.app"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm text-muted">
            Password
            <input
              className="field mt-1"
              type="password"
              autoComplete="current-password"
              value={password}
              placeholder="Your password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error ? <p className="mt-3 text-sm text-warn">{error}</p> : null}

          <button type="submit" className="btn-primary mt-4 w-full">
            <LogIn size={16} /> Sign in
          </button>
          <button type="button" className="btn-ghost mt-2 w-full justify-center" onClick={useDemo}>
            <Sparkles size={16} /> Fill demo details
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-dashed border-line bg-paper/60 p-4 text-sm">
          <p className="font-semibold text-ink">Demo credential</p>
          <p className="mt-1 text-muted">
            Email: <span className="font-mono text-ink">{DEMO_EMAIL}</span>
            <br />
            Password: <span className="font-mono text-ink">{DEMO_PASSWORD}</span>
          </p>
          <p className="mt-2 text-muted">
            Signing in opens the paper editor and sample drafts.
          </p>
        </div>
      </main>
    </div>
  );
}
