import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Plus, Sparkles, Thermometer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { TaskRow } from "@/components/TaskRow";
import { FocusScoreboard } from "@/components/FocusScoreboard";
import { actions, fmt, localToday, taskDone, useStore, type DayZone, type Task } from "@/lib/store";
import { addDays, overlaps, sortTasks, toHHMM, toMin, zoneAt, zonesFor } from "@/lib/schedule";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [
    { title: "Study planner — Learning Journey Tracker" },
    { name: "description", content: "Time-block lessons into study zones, focus with Pomodoros and carry unfinished work forward." },
    { property: "og:title", content: "Study planner — Learning Journey Tracker" },
    { property: "og:description", content: "Plan your day in time blocks, track focused Pomodoro time and reschedule what's left." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Planner,
});

const sel = "h-9 rounded-md border bg-background/60 px-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const zoneBg: Record<DayZone["color"], string> = { primary: "bg-primary/10 border-primary/30", secondary: "bg-secondary/10 border-secondary/30", accent: "bg-accent/10 border-accent/30", muted: "bg-muted/60 border-border" };
const HOUR_PX = 56, FROM = 6, TO = 24;
let dragKey: string | null = null; // "new:map|sec|item" or "task:id"

function Planner() {
  const { maps, schedule, dayZones, pomodoro } = useStore();
  const today = localToday();
  const [view, setView] = useState<"week" | "day">("day");
  const [start, setStart] = useState(today);
  const [daily, setDaily] = useState(120);
  const [pick, setPick] = useState<string | null>(null);
  const [form, setForm] = useState({ date: today, time: "" });
  const [zonesOpen, setZonesOpen] = useState(false);
  const days = view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(start, i)) : [start];
  const planned = new Set(schedule.map((t) => t.itemId));
  const isDone = (t: Task) => taskDone(maps, t);
  const overdue = schedule.filter((t) => t.date < today && !isDone(t));

  const place = (key: string, date: string, time = "") => {
    if (key.startsWith("task:")) { actions.updateTask(key.slice(5), { date, start: time || undefined }); warn(date, time); return; }
    const [mapId, sectionId, itemId] = key.slice(4).split("|");
    const item = maps.find((m) => m.id === mapId)?.sections.find((s) => s.id === sectionId)?.items.find((i) => i.id === itemId);
    if (!mapId || !sectionId || !itemId || !item) return;
    actions.scheduleItem({ mapId, sectionId, itemId, date, minutes: item.minutes || 30, ...(time ? { start: time } : {}) });
    warn(date, time);
  };
  const warn = (date: string, time: string) => { const z = time && zoneAt(dayZones, date, time); if (z && z.kind === "work") toast.warning(`That time is inside your ${z.name} zone.`); };

  return <Shell>
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex-1"><p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Plan your study</p><h1 className="mt-2 font-display text-4xl">Study planner</h1></div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">Daily study
        <select className={sel} value={daily} onChange={(e) => setDaily(Number(e.target.value))}>{[30, 60, 90, 120, 180, 240].map((m) => <option key={m} value={m}>{fmt(m)}</option>)}</select>
      </label>
      <Button variant="outline" onClick={() => setZonesOpen(!zonesOpen)}>Day zones & Pomodoro</Button>
      <Button onClick={() => actions.autoPlan(daily)}><Sparkles />Auto-plan</Button>
    </div>

    <div className="mt-6"><FocusScoreboard /></div>
    {zonesOpen && <ZonesEditor zones={dayZones} />}
    {zonesOpen && <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 text-sm">
      <span className="font-display text-lg">Pomodoro</span>
      <label className="flex items-center gap-2">Focus (min) <input type="number" min={5} className={`${sel} w-20`} value={pomodoro.focus} onChange={(e) => actions.setPomoSettings({ focus: Math.max(5, Number(e.target.value) || 25) })} /></label>
      <label className="flex items-center gap-2">Break (min) <input type="number" min={1} className={`${sel} w-20`} value={pomodoro.break} onChange={(e) => actions.setPomoSettings({ break: Math.max(1, Number(e.target.value) || 5) })} /></label>
      <label className="flex items-center gap-2">Weekly target (Pomodoros) <input type="number" min={1} className={`${sel} w-20`} value={pomodoro.weeklyTarget} onChange={(e) => actions.setPomoSettings({ weeklyTarget: Math.max(1, Number(e.target.value) || 1) })} /></label>
    </div>}

    {overdue.length > 0 && <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4">
      <CalendarClock className="text-destructive" />
      <p className="flex-1 text-sm">{overdue.length} unfinished lesson{overdue.length > 1 ? "s" : ""} from earlier days.</p>
      <Button variant="secondary" onClick={() => actions.rollOverOverdue()}>Move all to today as priority</Button>
    </div>}

    <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border bg-card p-4 lg:max-h-[75vh] lg:overflow-y-auto">
        <h2 className="font-display text-xl">Up next</h2>
        <p className="text-xs text-muted-foreground">Drag a lesson onto a day or an hour, or tap Schedule.</p>
        {maps.map((m) => {
          const items = m.sections.flatMap((s) => s.items.filter((i) => !i.done && !planned.has(i.id)).map((i) => ({ s, i })));
          if (!items.length) return null;
          return <div key={m.id} className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{m.title}</p>
            <ul className="mt-2 space-y-1.5">{items.slice(0, 25).map(({ s, i }) => {
              const key = `new:${m.id}|${s.id}|${i.id}`;
              return <li key={i.id} draggable onDragStart={() => { dragKey = key; }} className="cursor-grab rounded-lg border bg-background/50 px-3 py-2 text-sm">
                <div className="flex items-center gap-2"><span className="flex-1 truncate">{i.title}</span>
                  <button className="text-xs text-secondary hover:underline" onClick={() => { setPick(pick === key ? null : key); setForm({ date: start, time: "" }); }}>Schedule</button></div>
                <p className="truncate text-xs text-muted-foreground">{s.title} · {i.type} · {fmt(i.minutes)}</p>
                {pick === key && <div className="mt-2 flex flex-wrap gap-2">
                  <input type="date" className={sel} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  <input type="time" step={900} className={sel} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  <Button size="sm" onClick={() => { place(key, form.date, form.time); setPick(null); }}>Add</Button>
                </div>}
              </li>;
            })}</ul></div>;
        })}
      </aside>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-muted p-1">
            {(["day", "week"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 text-sm capitalize ${view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{v}</button>)}
          </div>
          <Button size="icon" variant="ghost" aria-label="Previous" onClick={() => setStart(addDays(start, view === "week" ? -7 : -1))}><ChevronLeft /></Button>
          <Button size="sm" variant="ghost" onClick={() => setStart(today)}>Today</Button>
          <Button size="icon" variant="ghost" aria-label="Next" onClick={() => setStart(addDays(start, view === "week" ? 7 : 1))}><ChevronRight /></Button>
        </div>
        <div className="space-y-3">
          {days.map((d) => {
            const tasks = sortTasks(schedule.filter((t) => t.date === d));
            const clash = overlaps(tasks);
            const mins = tasks.reduce((a, t) => a + t.minutes, 0);
            const unfinished = tasks.filter((t) => !isDone(t)).length;
            const label = new Date(`${d}T00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
            return <section key={d} onDragOver={(e) => dragKey && e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (dragKey) place(dragKey, d); dragKey = null; }}
              className={`rounded-2xl border bg-card p-4 ${d === today ? "border-primary/60" : ""}`}>
              <div className="flex flex-wrap items-center gap-3"><h3 className="flex-1 font-display text-lg">{d === today ? "Today · " : ""}{label}</h3>
                {unfinished > 0 && d >= today && <Button size="sm" variant="ghost" title="Sick or can't study? Push this day's unfinished tasks and everything after by one day." onClick={() => { actions.skipDay(d); toast.success("Unfinished tasks from this day onwards moved one day later."); }}><Thermometer />Skip day</Button>}
                <span className={`text-xs ${mins > daily ? "text-destructive" : "text-muted-foreground"}`}>{fmt(mins)} / {fmt(daily)}</span></div>
              {view === "day"
                ? <DayTimeline date={d} tasks={tasks} zones={dayZones} clash={clash} maps={maps} onDrop={place} />
                : tasks.length ? <ul className="mt-3 space-y-2">{tasks.map((t) => <TaskRow key={t.id} task={t} maps={maps} clash={clash.has(t.id)} />)}</ul>
                  : <p className="mt-2 text-xs text-muted-foreground">Drop lessons here</p>}
            </section>;
          })}
        </div>
        {overdue.length > 0 && <section className="mt-6"><h3 className="font-display text-lg text-destructive">Overdue</h3>
          <ul className="mt-2 space-y-2">{overdue.map((t) => <TaskRow key={t.id} task={t} maps={maps} overdue />)}</ul></section>}
      </div>
    </div>
  </Shell>;
}

function DayTimeline({ date, tasks, zones, clash, maps, onDrop }: { date: string; tasks: Task[]; zones: DayZone[]; clash: Set<string>; maps: ReturnType<typeof useStore>["maps"]; onDrop: (key: string, date: string, time: string) => void }) {
  const anytime = tasks.filter((t) => !t.start);
  const timed = tasks.filter((t) => t.start);
  const top = (hhmm: string) => ((toMin(hhmm) - FROM * 60) / 60) * HOUR_PX;
  const titleOf = (t: Task) => maps.find((m) => m.id === t.mapId)?.sections.find((s) => s.id === t.sectionId)?.items.find((i) => i.id === t.itemId)?.title ?? "Lesson";
  return <div className="mt-3 space-y-4">
    {anytime.length > 0 && <div><p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Anytime</p>
      <ul className="space-y-2">{anytime.map((t) => <TaskRow key={t.id} task={t} maps={maps} />)}</ul></div>}
    <div className="relative" style={{ height: (TO - FROM) * HOUR_PX }}>
      {zonesFor(zones, date).map((z) => <div key={z.id} className={`absolute left-12 right-0 rounded-md border ${zoneBg[z.color]}`} style={{ top: top(z.start), height: Math.max(8, top(z.end) - top(z.start)) }}>
        <span className="absolute right-2 top-1 text-[10px] uppercase tracking-wider text-muted-foreground">{z.name}</span></div>)}
      {Array.from({ length: (TO - FROM) * 4 }, (_, q) => {
        const time = toHHMM(FROM * 60 + q * 15);
        return <div key={q} onDragOver={(e) => { if (dragKey) { e.preventDefault(); e.stopPropagation(); } }} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragKey) onDrop(dragKey, date, time); dragKey = null; }}
          className={`absolute left-0 right-0 ${q % 4 === 0 ? "border-t border-border/60" : ""}`} style={{ top: q * (HOUR_PX / 4), height: HOUR_PX / 4 }}>
          {q % 4 === 0 && <span className="absolute -top-2 left-0 text-[10px] text-muted-foreground">{time}</span>}
        </div>;
      })}
      {timed.map((t) => {
        const done = taskDone(maps, t);
        return <div key={t.id} draggable onDragStart={() => { dragKey = `task:${t.id}`; }}
          className={`absolute left-14 right-2 cursor-grab overflow-hidden rounded-md border px-2 py-1 text-xs shadow-sm ${clash.has(t.id) ? "border-destructive bg-destructive/20" : t.kind === "review" ? "border-accent/60 bg-accent/20" : "border-primary/60 bg-primary/20"} ${done ? "opacity-50" : ""}`}
          style={{ top: top(t.start!), height: Math.max(20, (t.minutes / 60) * HOUR_PX - 2) }}>
          <p className={`truncate font-medium ${done ? "line-through" : ""}`}>{t.start} – {toHHMM(toMin(t.start!) + t.minutes)} · {t.kind === "review" ? "Review: " : ""}{titleOf(t)}</p>
          {t.pomodoros?.length ? <p className="truncate text-muted-foreground">{t.pomodoros.map((p) => `${p.label} ${p.done}/${p.planned}`).join(" · ")}</p> : null}
        </div>;
      })}
    </div>
    {timed.length > 0 && <details><summary className="cursor-pointer text-xs text-muted-foreground">Edit timed tasks ({timed.length})</summary>
      <ul className="mt-2 space-y-2">{timed.map((t) => <TaskRow key={t.id} task={t} maps={maps} clash={clash.has(t.id)} />)}</ul></details>}
  </div>;
}

function ZonesEditor({ zones }: { zones: DayZone[] }) {
  const add = () => actions.addZone({ name: "Study", kind: "study", color: "primary", start: "18:00", end: "21:00", weekdays: [0, 1, 2, 3, 4, 5, 6] });
  return <div className="mt-6 rounded-2xl border bg-card p-4">
    <div className="flex items-center gap-3"><h2 className="flex-1 font-display text-lg">Day zones</h2>
      {!zones.length && <Button size="sm" variant="outline" onClick={() => { actions.addZone({ name: "Work", kind: "work", color: "muted", start: "07:00", end: "16:00", weekdays: [0, 1, 2, 3, 4] }); add(); }}>Use example (Work 7–16, Study 18–21)</Button>}
      <Button size="sm" onClick={add}><Plus />Add zone</Button></div>
    <p className="text-xs text-muted-foreground">Auto-plan books lessons only inside Study zones.</p>
    <ul className="mt-3 space-y-2">{zones.map((z) => <li key={z.id} className="flex flex-wrap items-center gap-2 text-sm">
      <input className={`${sel} w-28`} value={z.name} onChange={(e) => actions.updateZone(z.id, { name: e.target.value })} />
      <select className={sel} value={z.kind} onChange={(e) => actions.updateZone(z.id, { kind: e.target.value as DayZone["kind"] })}><option value="study">Study</option><option value="work">Work</option><option value="other">Other</option></select>
      <select className={sel} value={z.color} onChange={(e) => actions.updateZone(z.id, { color: e.target.value as DayZone["color"] })}><option value="primary">Teal</option><option value="secondary">Pink</option><option value="accent">Gold</option><option value="muted">Grey</option></select>
      <input type="time" className={sel} value={z.start} onChange={(e) => actions.updateZone(z.id, { start: e.target.value })} />–
      <input type="time" className={sel} value={z.end} onChange={(e) => actions.updateZone(z.id, { end: e.target.value })} />
      <div className="flex gap-1">{DAYS.map((d, i) => <button key={d} onClick={() => actions.updateZone(z.id, { weekdays: z.weekdays.includes(i) ? z.weekdays.filter((x) => x !== i) : [...z.weekdays, i] })}
        className={`rounded px-1.5 py-0.5 text-xs ${z.weekdays.includes(i) ? "bg-primary/20 text-foreground" : "bg-muted text-muted-foreground"}`}>{d}</button>)}</div>
      <button aria-label="Remove zone" onClick={() => actions.removeZone(z.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
    </li>)}</ul>
  </div>;
}
