import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Shell, Progress, Ring } from "@/components/Shell";
import { actions, fmt, mapItems, stats, streak, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Learning Journey Tracker — Your study maps" },
      { name: "description", content: "Organize courses and diplomas into study maps, sections and items, and track your progress." },
      { property: "og:title", content: "Learning Journey Tracker" },
      { property: "og:description", content: "Track multi-part courses with live progress, streaks and time remaining." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { maps, studyDays } = useStore();
  const [title, setTitle] = useState("");
  const all = stats(maps.flatMap(mapItems));
  return (
    <Shell>
      <section className="mb-10">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Your journey</p>
        <h1 className="mt-2 font-display text-5xl leading-tight">{all.pct}% <span className="text-muted-foreground">complete</span></h1>
        <div className="mt-5"><Progress value={all.pct} thick /></div>
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span>{all.done}/{all.total} items</span><span>{fmt(all.leftMin)} remaining</span><span>🔥 {streak(studyDays)}-day streak</span>
        </div>
      </section>

      <form className="mb-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { actions.addMap(title.trim()); setTitle(""); } }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New diploma or study plan, e.g. Diesel Engine Diploma"
          className="flex-1 rounded-xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button className="flex items-center gap-1 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"><Plus size={16} />Add</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        {maps.map((m) => {
          const s = stats(mapItems(m));
          return (
            <div key={m.id} className="group relative rounded-2xl border bg-card p-6 backdrop-blur transition hover:-translate-y-0.5 hover:border-primary">
              <Link to="/maps/$id" params={{ id: m.id }} className="absolute inset-0" aria-label={m.title} />
              <div className="flex items-start gap-4">
                <Ring value={s.pct} />
                <h2 className="flex-1 font-display text-2xl leading-snug">{m.title}</h2>
                <button className="relative z-[1] text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                  onClick={() => confirm(`Delete "${m.title}"?`) && actions.deleteMap(m.id)} aria-label="Delete map"><Trash2 size={16} /></button>
              </div>
              {m.description && <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>}
              <div className="mt-5 flex items-baseline justify-between text-sm"><span className="font-semibold">{mapItems(m).filter((i) => i.done).length}/{mapItems(m).length} items</span><span className="text-muted-foreground">{m.sections.length} modules · {fmt(s.leftMin)} left</span></div>
              <div className="mt-2"><Progress value={s.pct} /></div>
            </div>
          );
        })}
        {maps.length === 0 && <p className="text-muted-foreground">No study maps yet — create your first above.</p>}
      </div>
    </Shell>
  );
}
