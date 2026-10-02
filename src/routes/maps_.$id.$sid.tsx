import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, ClipboardCheck, HelpCircle, Pencil, PlayCircle, Trash2 } from "lucide-react";
import { Shell, Progress, Ring } from "@/components/Shell";
import { actions, fmt, mapItems, stats, useStore, type ItemType } from "@/lib/store";

export const Route = createFileRoute("/maps_/$id/$sid")({
  head: () => ({
    meta: [
      { title: "Module breakdown — Learning Journey Tracker" },
      { name: "description", content: "Videos, readings and quizzes in this module with live completion tracking." },
      { property: "og:title", content: "Module breakdown — Learning Journey Tracker" },
      { property: "og:description", content: "Tick off learning items and watch module, diploma and overall progress update." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SectionPage,
});

const icons: Record<ItemType, typeof PlayCircle> = { video: PlayCircle, reading: BookOpen, quiz: HelpCircle, assignment: ClipboardCheck };
const labels: Record<ItemType, string> = { video: "Video", reading: "Reading", quiz: "Quiz", assignment: "Assignment" };
const input = "rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function SectionPage() {
  const { id, sid } = Route.useParams();
  const { maps } = useStore();
  const [title, setTitle] = useState(""); const [min, setMin] = useState("15"); const [type, setType] = useState<ItemType>("video");
  const m = maps.find((x) => x.id === id);
  const sec = m?.sections.find((x) => x.id === sid);
  if (!m || !sec) return <Shell><p className="text-muted-foreground">Module not found. <Link to="/" className="text-primary underline">Back</Link></p></Shell>;
  const s = stats(sec.items), d = stats(mapItems(m)), all = stats(maps.flatMap(mapItems));
  const byType = (Object.keys(labels) as ItemType[]).map((t) => ({ t, ...stats(sec.items.filter((i) => i.type === t)) })).filter((x) => x.total);

  return (
    <Shell>
      <Link to="/maps/$id" params={{ id }} className="text-sm text-muted-foreground hover:text-foreground">← {m.title}</Link>
      <div className="mt-3 flex items-center gap-3">
        <h1 className="flex-1 font-display text-4xl">{sec.title}</h1>
        <button aria-label="Rename" className="text-muted-foreground hover:text-foreground" onClick={() => { const t = prompt("Module title", sec.title); if (t?.trim()) actions.renameSection(id, sid, t.trim()); }}><Pencil size={18} /></button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[["This module", s.pct, `${fmt(s.leftMin)} left`], ["Diploma", d.pct, `${d.done}/${d.total} items`], ["Overall", all.pct, `${fmt(all.leftMin)} left`]].map(([k, v, sub]) => (
          <div key={k as string} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
            <Ring value={v as number} />
            <div><p className="text-xs uppercase tracking-widest text-muted-foreground">{k}</p><p className="text-sm">{sub}</p></div>
          </div>
        ))}
      </div>

      {byType.length > 0 && (
        <div className="mt-4 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
          {byType.map((x) => { const Icon = icons[x.t]; return (
            <div key={x.t} className="text-sm"><div className="mb-1 flex items-center gap-2"><Icon size={14} className="text-primary" />{labels[x.t]}<span className="ml-auto text-xs text-muted-foreground">{x.done}/{x.total} · {fmt(x.totalMin)}</span></div><Progress value={x.pct} /></div>
          ); })}
        </div>
      )}

      <ul className="mt-6 divide-y rounded-2xl border bg-card">
        {sec.items.map((it) => {
          const Icon = icons[it.type];
          return (
            <li key={it.id} className="group flex items-center gap-3 px-4 py-3">
              <input type="checkbox" checked={it.done} onChange={() => actions.toggleItem(id, sid, it.id)} className="h-5 w-5 cursor-pointer accent-[var(--primary)]" />
              <Icon size={17} className="text-primary" />
              <span className={`flex-1 text-sm transition ${it.done ? "text-muted-foreground line-through" : ""}`}>{it.title}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{labels[it.type]} · {fmt(it.minutes)}</span>
              <button onClick={() => actions.deleteItem(id, sid, it.id)} className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" aria-label="Delete item"><Trash2 size={14} /></button>
            </li>
          );
        })}
        {sec.items.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground">No items yet — add a video, reading or quiz below.</li>}
      </ul>

      <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; actions.addItem(id, sid, { title: title.trim(), type, minutes: Math.max(1, Number(min) || 0) }); setTitle(""); }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Item title" className={`min-w-40 flex-1 ${input}`} />
        <select value={type} onChange={(e) => setType(e.target.value as ItemType)} className={input}>
          {(Object.keys(labels) as ItemType[]).map((t) => <option key={t} value={t}>{labels[t]}</option>)}
        </select>
        <input type="number" min={1} value={min} onChange={(e) => setMin(e.target.value)} className={`w-20 ${input}`} aria-label="Minutes" />
        <button className="rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Add</button>
      </form>
    </Shell>
  );
}
