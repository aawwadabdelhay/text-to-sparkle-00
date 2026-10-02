import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Progress({ value, thick }: { value: number; thick?: boolean }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-muted ${thick ? "h-3" : "h-1.5"}`}>
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const cls = "rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground";
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="font-display text-xl tracking-tight">Learning<span className="text-primary">·</span>Journey</Link>
          <nav className="flex gap-1 rounded-full bg-muted p-1">
            <Link to="/" className={cls} activeOptions={{ exact: true }} activeProps={{ className: "bg-card text-foreground shadow-sm" }}>Maps</Link>
            <Link to="/stats" className={cls} activeProps={{ className: "bg-card text-foreground shadow-sm" }}>Stats</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    </div>
  );
}
