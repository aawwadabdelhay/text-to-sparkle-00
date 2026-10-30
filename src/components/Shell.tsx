import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { playlistAccess } from "@/lib/playlist.functions";
import { FocusTimer } from "@/components/FocusTimer";
import { UndoKeys } from "@/components/UndoKeys";

function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return (
    <button
      onClick={async () => {
        await queryClient.cancelQueries(); // stop in-flight queries before the 401s land
        queryClient.clear(); // drop cached protected data
        await supabase.auth.signOut(); // clear session
        router.navigate({ to: "/auth", search: { redirect: undefined }, replace: true }); // history REPLACE — Back must not restore the route
      }}
      className="rounded-full border border-input px-4 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
    >
      Sign out
    </button>
  );
}

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
  const access = useServerFn(playlistAccess);
  const [playlistAllowed, setPlaylistAllowed] = useState(false);
  useEffect(() => { let active = true; access().then((result) => { if (active) setPlaylistAllowed(result.allowed); }).catch(() => {}); return () => { active = false; }; }, [access]);
  const cls = "rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground";
  return (
    <div className="min-h-screen bg-background bg-app">
      <header className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="font-display text-xl tracking-tight">Learning<span className="text-primary">·</span>Journey</Link>
          <nav className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
            <Link to="/" className={cls} activeOptions={{ exact: true }} activeProps={{ className: "bg-card text-foreground shadow-sm" }}>Maps</Link>
            <Link to="/planner" className={cls} activeProps={{ className: "bg-card text-foreground shadow-sm" }}>Planner</Link>
            <Link to="/stats" className={cls} activeProps={{ className: "bg-card text-foreground shadow-sm" }}>Stats</Link>
            {playlistAllowed && <Link to="/playlist" className={cls} activeProps={{ className: "bg-card text-foreground shadow-sm" }}>Playlist URLs</Link>}
          </nav>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-5 py-10 sm:px-8">{children}</main>
      <FocusTimer />
      <UndoKeys />
    </div>
  );
}
