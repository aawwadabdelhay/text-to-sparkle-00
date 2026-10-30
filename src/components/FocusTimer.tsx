import { useEffect, useState, useSyncExternalStore } from "react";
import { Pause, Play, Square, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { actions, getState, useStore } from "@/lib/store";

// Timer runs from timestamps so it survives reloads; kept in its own browser key.
interface TimerState { taskId: string; label: string; phase: "focus" | "break"; endsAt: number; pausedLeft?: number | undefined; title: string }
const KEY = "ljt-focus-timer";
let cur: TimerState | null = null;
let loaded = false;
const ls = new Set<() => void>();
const load = () => { if (loaded || typeof window === "undefined") return; loaded = true; try { cur = JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { cur = null; } };
const save = (t: TimerState | null) => { cur = t; t ? localStorage.setItem(KEY, JSON.stringify(t)) : localStorage.removeItem(KEY); ls.forEach((l) => l()); };
const useTimer = () => useSyncExternalStore((l) => { load(); ls.add(l); return () => ls.delete(l); }, () => { load(); return cur; }, () => null);

export function startFocus(taskId: string, label: string, title: string) {
  const { focus } = getState().pomodoro;
  save({ taskId, label, title, phase: "focus", endsAt: Date.now() + focus * 60_000 });
}

export function FocusTimer() {
  const t = useTimer();
  const { pomodoro } = useStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (!t || t.pausedLeft != null || now < t.endsAt) return;
    if (t.phase === "focus") {
      actions.logFocus(t.taskId, t.label, pomodoro.focus);
      toast.success(`Pomodoro done: ${t.title} (${t.label}). Take a ${pomodoro.break}-minute break.`);
      save({ ...t, phase: "break", endsAt: Date.now() + pomodoro.break * 60_000 });
    } else { toast("Break over. Ready for the next focus session."); save(null); }
  }, [now, t, pomodoro]);
  if (!t) return null;
  const left = Math.max(0, t.pausedLeft ?? t.endsAt - now);
  const mm = String(Math.floor(left / 60000)).padStart(2, "0"), ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  return <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-lg ${t.phase === "focus" ? "border-primary/60" : "border-accent/60"}`}>
    <Timer className={t.phase === "focus" ? "text-primary" : "text-accent"} />
    <div className="min-w-0"><p className="font-display text-2xl tabular-nums">{mm}:{ss}</p>
      <p className="max-w-[200px] truncate text-xs text-muted-foreground">{t.phase === "focus" ? `${t.label} · ${t.title}` : "Break"}</p></div>
    {t.pausedLeft != null
      ? <Button size="icon" variant="ghost" aria-label="Resume" onClick={() => save({ ...t, endsAt: Date.now() + t.pausedLeft!, pausedLeft: undefined })}><Play /></Button>
      : <Button size="icon" variant="ghost" aria-label="Pause" onClick={() => save({ ...t, pausedLeft: t.endsAt - Date.now() })}><Pause /></Button>}
    <Button size="icon" variant="ghost" aria-label="Stop timer" onClick={() => save(null)}><Square /></Button>
  </div>;
}
