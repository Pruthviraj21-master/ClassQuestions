import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { type QuizResult } from "@/lib/exam";
import { quizResults } from "@/lib/quizzes";

export function QuizDashboard({ id, accessKey }: { id: string; accessKey: string }) {
  const [link, setLink] = useState("");
  const [qr, setQr] = useState("");
  const [attempts, setAttempts] = useState<QuizResult[]>();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setAttempts(await quizResults({ data: { id, key: accessKey } }));
    } catch {
      setError("Could not load results. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const path = window.location.pathname.replace(/\/paper\/[^/]+\/?$/, "/exam/" + id);
    const url = new URL(path, window.location.origin).href;
    setLink(url);
    QRCode.toDataURL(url, { margin: 2, width: 260 })
      .then(setQr)
      .catch(() => setQr(""));
    void refresh();
  }, [id, accessKey]);

  const topics = new Map<string, { earned: number; total: number }>();
  for (const attempt of attempts ?? []) {
    for (const item of attempt.items) {
      const topic = topics.get(item.topic) ?? { earned: 0, total: 0 };
      topic.earned += item.earned;
      topic.total += item.total;
      topics.set(item.topic, topic);
    }
  }
  const weakest = [...topics]
    .filter(([, marks]) => marks.earned < marks.total)
    .sort(([, a], [, b]) => a.earned / a.total - b.earned / b.total);
  const average = attempts?.length
    ? Math.round(
        (attempts.reduce((sum, item) => sum + item.score / item.total, 0) / attempts.length) * 100,
      )
    : null;

  async function share() {
    setStatus("");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Patra quiz", url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setStatus("Quiz link copied.");
      }
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) {
        setStatus("Select the link below to copy it.");
      }
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0">
        <h3 className="text-xl">Share with students</h3>
        <p className="mt-1 text-sm text-muted">
          Students receive their own marks and an attempt code.
        </p>
        {qr && (
          <img
            src={qr}
            alt="QR code for the student quiz"
            className="mt-3 w-44 rounded-lg border border-line"
          />
        )}
        <label className="mt-3 block text-sm text-muted">
          Student quiz link
          <input
            className="field mt-1"
            readOnly
            value={link}
            onFocus={(event) => event.target.select()}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={share} disabled={!link}>
            Share quiz link
          </button>
          <Link className="btn-ghost" to="/exam/$paperId" params={{ paperId: id }}>
            Open student quiz
          </Link>
        </div>
        {status && (
          <p className="mt-2 text-sm" role="status">
            {status}
          </p>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl">Class performance</h3>
          <button type="button" className="btn-ghost" onClick={refresh} disabled={loading}>
            {loading ? "Loading…" : "Refresh results"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-warn" role="alert">
            {error}
          </p>
        )}
        {attempts?.length === 0 && (
          <p className="mt-2 text-muted">Results appear here after the first submission.</p>
        )}
        {!!attempts?.length && (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-bg p-3">
                <dt>Class average</dt>
                <dd className="text-2xl text-leaf">{average}%</dd>
              </div>
              <div className="rounded-lg bg-bg p-3">
                <dt>Attempts</dt>
                <dd className="text-2xl text-leaf">{attempts.length}</dd>
              </div>
            </dl>
            <h4 className="mt-4 font-semibold">Topics to revisit</h4>
            {weakest.length ? (
              <ul className="mt-1 space-y-1">
                {weakest.map(([topic, { earned, total }]) => (
                  <li key={topic} className="flex justify-between gap-3">
                    <span className="min-w-0 break-words">{topic}</span>
                    <span>{Math.round((earned / total) * 100)}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">All topics scored full marks.</p>
            )}
            <h4 className="mt-4 font-semibold">Attempt history</h4>
            <ul className="mt-2 divide-y divide-line">
              {attempts.map((item) => (
                <li key={item.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <div>
                    <p className="font-medium">Attempt {item.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted">
                      {new Date(item.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <strong>
                    {item.score} / {item.total}
                  </strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
