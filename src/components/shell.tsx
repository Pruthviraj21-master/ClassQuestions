import { Link } from "@tanstack/react-router";
import { BookOpen, LogOut } from "lucide-react";
import { signOut } from "@/lib/demo";

export function Shell({ children, teacher = false }: { children: React.ReactNode; teacher?: boolean }) {
  function leave() {
    signOut();
    window.location.assign("/");
  }

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-paper">
              <BookOpen size={18} />
            </span>
            <span className="font-display text-xl leading-none">Patra</span>
          </Link>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-muted sm:block">Papers from your own class notes</p>
            {teacher ? (
              <button type="button" className="btn-ghost" onClick={leave}>
                <LogOut size={16} /> Sign out
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
