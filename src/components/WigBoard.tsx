import { useEffect, useState } from "react";
import { Flame, Trophy, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/Shell";
import { actions, localToday, mapItems, stats, taskDone, useStore, fmt } from "@/lib/store";
import { addDays } from "@/lib/schedule";
import { dayWon, pomosOn, streak, weekStart, weekWins } from "@/lib/goals";

const inp = "h-9 rounded-md border bg-background/60 px-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const CELEBRATED = "ljt-celebrated-day";

/** 4DX scoreboard: the WIG (a learning path) as lag measure, and today's small goal as lead measure. */
export function WigBoard() {
  const { maps, learningPaths, wig, schedule, focusLog, pomodoro } = useStore();
  const today = localToday();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ pathId: learningPaths[0]?.id ?? "", title: "", deadline: addDays(today, 60), dailyPomos: 4, weeklyWinDays: 5 });
  const [party, setParty] = useState(false);

  const dailyPomos = wig?.dailyPomos ?? 4;
  const info = (d: string) => {
    const tasks = schedule.filter((t) => t.date === d);
    return { planned: tasks.length, plannedDone: tasks.filter((t) => taskDone(maps, t)).length, pomos: pomosOn(focusLog, d, pomodoro.focus), dailyPomos };
  };
  const won = (d: string) => dayWon(info(d));
  const t = info(today);
  const todayWon = dayWon(t);

  useEffect(() => {
    if (!todayWon || localStorage.getItem(CELEBRATED) === today) return;
    localStorage.setItem(CELEBRATED, today);
    setParty(true); const id = setTimeout(() => setParty(false), 2600); return () => clearTimeout(id);
  }, [todayWon, today]);

  if (!wig || editing) {
    return <section className="rounded-2xl border border-accent/40 bg-card p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Discipline 1 · Wildly Important Goal</p>
      <h2 className="font-display text-2xl">Set your WIG</h2>
      <p className="mt-1 text-sm text-muted-foreground">Pick the learning path you'll finish, by when, and your daily small goal.</p>
      {!learningPaths.length ? <p className="mt-3 text-sm text-muted-foreground">Create a learning path first, then come back here.</p> :
      <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">Learning path<select className={inp} value={form.pathId} onChange={(e) => setForm({ ...form, pathId: e.target.value })}>{learningPaths.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label className="flex flex-col gap-1">Goal (from X to Y by when)<input className={`${inp} w-72`} placeholder="Finish Hydraulics Vol 1 & Vol 3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="flex flex-col gap-1">Deadline<input type="date" className={inp} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
        <label className="flex flex-col gap-1">Daily Pomodoros<input type="number" min={1} className={`${inp} w-20`} value={form.dailyPomos} onChange={(e) => setForm({ ...form, dailyPomos: Math.max(1, Number(e.target.value) || 1) })} /></label>
        <label className="flex flex-col gap-1">Winning days / week<input type="number" min={1} max={7} className={`${inp} w-20`} value={form.weeklyWinDays} onChange={(e) => setForm({ ...form, weeklyWinDays: Math.min(7, Math.max(1, Number(e.target.value) || 5)) })} /></label>
        <Button disabled={!form.pathId} onClick={() => { const p = learningPaths.find((x) => x.id === form.pathId); actions.setWig({ ...form, title: form.title || `Finish ${p?.title ?? "my path"}` }); setEditing(false); }}>Save WIG</Button>
        {wig && <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
      </div>}
    </section>;
  }

  const path = learningPaths.find((p) => p.id === wig.pathId);
  const s = stats(maps.filter((m) => m.pathId === wig.pathId).flatMap(mapItems));
  const daysLeft = Math.max(0, Math.round((new Date(`${wig.deadline}T00:00`).getTime() - new Date(`${today}T00:00`).getTime()) / 86400000));
  const pace = daysLeft ? Math.ceil(s.leftMin / daysLeft) : s.leftMin;
  const st = streak(today, won);
  const wins = weekWins(today, won);
  const ws = weekStart(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const weekStatus = wins >= wig.weeklyWinDays ? "Won" : 7 - weekDays.filter((d) => d < today).length + wins < wig.weeklyWinDays ? "Lost" : "In play";

  return <section className="relative overflow-hidden rounded-2xl border border-accent/40 bg-card p-5">
    {party && <div aria-hidden className="pointer-events-none absolute inset-0">{Array.from({ length: 24 }, (_, i) =>
      <span key={i} className="animate-win-pop absolute bottom-0 text-xl" style={{ left: `${(i * 41) % 100}%`, animationDelay: `${(i % 6) * 0.12}s` }}>{["🎉", "⭐", "🔥", "✅"][i % 4]}</span>)}</div>}
    <div className="flex flex-wrap items-start gap-3">
      <div className="flex-1"><p className="text-xs uppercase tracking-[0.2em] text-accent">WIG · {path?.title ?? "Learning path"}</p>
        <h2 className="font-display text-2xl">{wig.title}</h2>
        <p className="text-sm text-muted-foreground">by {new Date(`${wig.deadline}T00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {daysLeft} days left · needs ~{fmt(pace)}/day</p></div>
      <Button size="sm" variant="ghost" onClick={() => { setForm({ ...wig }); setEditing(true); }}>Edit WIG</Button>
    </div>
    <div className="mt-3"><div className="flex justify-between text-xs text-muted-foreground"><span>Lag measure: {s.done}/{s.total} lessons</span><span>{s.pct}%</span></div><div className="mt-1"><Progress value={s.pct} thick /></div></div>

    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <div className={`rounded-xl border p-3 ${todayWon ? "border-accent bg-accent/10 glow-accent" : ""}`}>
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground"><Target size={14} />Today's small goal</p>
        <p className="mt-1 font-display text-xl">{todayWon ? "Goal hit! ✅" : "Not yet"}</p>
        <p className="text-xs text-muted-foreground">Lessons {t.plannedDone}/{t.planned} · or Pomodoros {t.pomos}/{dailyPomos}</p>
      </div>
      <div className="rounded-xl border p-3">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground"><Flame size={14} className="text-secondary" />Streak</p>
        <p className="mt-1 font-display text-xl">{st} day{st === 1 ? "" : "s"}</p>
        <p className="text-xs text-muted-foreground">{st ? "Keep the chain going." : "Win today to start a streak."}</p>
      </div>
      <div className="rounded-xl border p-3">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground"><Trophy size={14} className="text-accent" />This week: <span className={weekStatus === "Won" ? "text-primary" : weekStatus === "Lost" ? "text-destructive" : "text-foreground"}>{weekStatus}</span></p>
        <div className="mt-2 flex gap-1.5">{weekDays.map((d) => <span key={d} title={d} className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] ${won(d) ? "bg-primary text-primary-foreground" : d < today ? "bg-destructive/20 text-destructive" : d === today ? "border border-accent text-accent" : "bg-muted text-muted-foreground"}`}>{new Date(`${d}T00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}</span>)}</div>
        <p className="mt-1 text-xs text-muted-foreground">{wins}/{wig.weeklyWinDays} winning days</p>
      </div>
    </div>
  </section>;
}
