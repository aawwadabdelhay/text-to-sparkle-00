import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Progress({ value, thick }: { value: number; thick?: boolean }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-muted ${thick ? "h-3" : "h-1.5"}`}>
      <div className="h-full rounded-full bg-progress transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Ring({ value, size = 64 }: { value: number; size?: number }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={6} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--primary)" strokeWidth={6} fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} className="transition-all duration-500" />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="var(--foreground)" fontSize={size / 4.5} fontWeight={700}
        transform={`rotate(90 ${size / 2} ${size / 2})`}>{value}%</text>
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const cls = "rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground";
  return (
    <div className="min-h-screen bg-background bg-app">
      <header className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="font-display text-xl tracking-tight">Learning<span className="text-primary">·</span>Journey</Link>
          <nav className="flex gap-1 rounded-full bg-muted p-1">
            <Link to="/" className={cls} activeOptions={{ exact: true }} activeProps={{ className: "bg-card text-foreground shadow-sm" }}>Maps</Link>
            <Link to="/stats" className={cls} activeProps={{ className: "bg-card text-foreground shadow-sm" }}>Stats</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
