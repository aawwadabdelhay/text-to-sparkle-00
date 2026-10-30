import { Target } from "lucide-react";
import { Progress } from "@/components/Shell";
import { fmt, localToday, useStore } from "@/lib/store";
import { addDays, focusMinutes, weekday } from "@/lib/schedule";

/** Lead measure: focused Pomodoro time today and this week vs the weekly target. */
export function FocusScoreboard() {
  const { focusLog, pomodoro } = useStore();
  const today = localToday();
  const weekStart = addDays(today, -((weekday(today) + 6) % 7)); // Monday
  const day = focusMinutes(focusLog, today, today);
  const week = focusMinutes(focusLog, weekStart, today);
  const weekPomos = Math.round(week / pomodoro.focus);
  const pct = Math.min(100, Math.round((weekPomos / Math.max(1, pomodoro.weeklyTarget)) * 100));
  return <div className="rounded-2xl border bg-card p-4">
    <div className="flex items-center gap-2"><Target size={18} className="text-accent" /><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lead measure · focused time</p></div>
    <div className="mt-3 grid grid-cols-3 gap-3 text-center">
      <div><p className="font-display text-2xl">{fmt(day)}</p><p className="text-xs text-muted-foreground">Today</p></div>
      <div><p className="font-display text-2xl">{fmt(week)}</p><p className="text-xs text-muted-foreground">This week</p></div>
      <div><p className="font-display text-2xl text-primary">{weekPomos}/{pomodoro.weeklyTarget}</p><p className="text-xs text-muted-foreground">Pomodoros</p></div>
    </div>
    <div className="mt-3"><Progress value={pct} /></div>
  </div>;
}
