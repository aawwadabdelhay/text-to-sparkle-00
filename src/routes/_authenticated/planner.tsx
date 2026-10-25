import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { TaskRow } from "@/components/TaskRow";
import { actions, fmt, localToday, useStore } from "@/lib/store";
import { addDays, sortTasks } from "@/lib/schedule";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [
    { title: "Study planner — Learning Journey Tracker" },
    { name: "description", content: "Schedule lectures and assignments into time slots and reschedule unfinished lessons." },
    { property: "og:title", content: "Study planner — Learning Journey Tracker" },
    { property: "og:description", content: "Plan what to learn each day and roll unfinished lessons into tomorrow." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Planner,
});

const sel = "h-9 rounded-md border bg-background/60 px-2 text-sm outline-none focus:ring-2 focus:ring-ring";
let dragKey: string | null = null;

function Planner() {
  const { maps, schedule } = useStore();
  const today = localToday();
  const [start, setStart] = useState(today);
  const [daily, setDaily] = useState(120);
  const [pick, setPick] = useState<string | null>(null);
  const [form, setForm] = useState({ date: today, time: "" });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const planned = new Set(schedule.map((t) => t.itemId));
  const isDone = (t: { mapId: string; sectionId: string; itemId: string }) => !!maps.find((m) => m.id === t.mapId)?.sections.find((s) => s.id === t.sectionId)?.items.find((i) => i.id === t.itemId)?.done;
  const overdue = schedule.filter((t) => t.date < today && !isDone(t));

  const place = (key: string, date: string, time = "") => {
    const [mapId, sectionId, itemId] = key.split("|");
    const item = maps.find((m) => m.id === mapId)?.sections.find((s) => s.id === sectionId)?.items.find((i) => i.id === itemId);
    if (!mapId || !sectionId || !itemId || !item) return;
    actions.scheduleItem({ mapId, sectionId, itemId, date, minutes: item.minutes || 30, ...(time ? { start: time } : {}) });
  };

  return <Shell>
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex-1"><p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Plan your study</p><h1 className="mt-2 font-display text-4xl">Study planner</h1></div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">Daily study
        <select className={sel} value={daily} onChange={(e) => setDaily(Number(e.target.value))}>{[30, 60, 90, 120, 180, 240].map((m) => <option key={m} value={m}>{fmt(m)}</option>)}</select>
      </label>
      <Button onClick={() => actions.autoPlan(daily)}><Sparkles />Auto-plan</Button>
    </div>

    {overdue.length > 0 && <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4">
      <CalendarClock className="text-destructive" />
      <p className="flex-1 text-sm">{overdue.length} unfinished lesson{overdue.length > 1 ? "s" : ""} from earlier days.</p>
      <Button variant="secondary" onClick={() => actions.rollOverOverdue()}>Move all to today as priority</Button>
    </div>}

    <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border bg-card p-4 lg:max-h-[75vh] lg:overflow-y-auto">
        <h2 className="font-display text-xl">Up next</h2>
        <p className="text-xs text-muted-foreground">Drag a lesson onto a day, or tap Schedule.</p>
        {maps.map((m) => {
          const items = m.sections.flatMap((s) => s.items.filter((i) => !i.done && !planned.has(i.id)).map((i) => ({ s, i })));
          if (!items.length) return null;
          return <div key={m.id} className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{m.title}</p>
            <ul className="mt-2 space-y-1.5">{items.slice(0, 25).map(({ s, i }) => {
              const key = `${m.id}|${s.id}|${i.id}`;
              return <li key={i.id} draggable onDragStart={() => { dragKey = key; }} className="cursor-grab rounded-lg border bg-background/50 px-3 py-2 text-sm">
                <div className="flex items-center gap-2"><span className="flex-1 truncate">{i.title}</span>
                  <button className="text-xs text-secondary hover:underline" onClick={() => { setPick(pick === key ? null : key); setForm({ date: today, time: "" }); }}>Schedule</button></div>
                <p className="truncate text-xs text-muted-foreground">{s.title} · {i.type} · {fmt(i.minutes)}</p>
                {pick === key && <div className="mt-2 flex flex-wrap gap-2">
                  <input type="date" className={sel} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  <input type="time" className={sel} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  <Button size="sm" onClick={() => { place(key, form.date, form.time); setPick(null); }}>Add</Button>
                </div>}
              </li>;
            })}</ul></div>;
        })}
      </aside>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Previous week" onClick={() => setStart(addDays(start, -7))}><ChevronLeft /></Button>
          <Button size="sm" variant="ghost" onClick={() => setStart(today)}>This week</Button>
          <Button size="icon" variant="ghost" aria-label="Next week" onClick={() => setStart(addDays(start, 7))}><ChevronRight /></Button>
        </div>
        <div className="space-y-3">
          {days.map((d) => {
            const tasks = sortTasks(schedule.filter((t) => t.date === d));
            const mins = tasks.reduce((a, t) => a + t.minutes, 0);
            const label = new Date(`${d}T00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
            return <section key={d} onDragOver={(e) => dragKey && e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (dragKey) place(dragKey, d); dragKey = null; }}
              className={`rounded-2xl border bg-card p-4 ${d === today ? "border-primary/60" : ""}`}>
              <div className="flex items-baseline justify-between"><h3 className="font-display text-lg">{d === today ? "Today · " : ""}{label}</h3><span className={`text-xs ${mins > daily ? "text-destructive" : "text-muted-foreground"}`}>{fmt(mins)} / {fmt(daily)}</span></div>
              {tasks.length ? <ul className="mt-3 space-y-2">{tasks.map((t) => <TaskRow key={t.id} task={t} maps={maps} />)}</ul>
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
