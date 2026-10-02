import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, ChevronRight, ClipboardCheck, HelpCircle, Pencil, PlayCircle, Plus, Trash2 } from "lucide-react";
import { Shell, Progress } from "@/components/Shell";
import { actions, fmt, mapItems, stats, useStore, type ItemType, type Section } from "@/lib/store";

export const Route = createFileRoute("/maps/$id")({
  head: () => ({
    meta: [
      { title: "Study map — Learning Journey Tracker" },
      { name: "description", content: "Full map view of sections and learning items with live completion tracking." },
      { property: "og:title", content: "Study map — Learning Journey Tracker" },
      { property: "og:description", content: "Check off videos, readings, quizzes and assignments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapPage,
});

const icons: Record<ItemType, typeof PlayCircle> = { video: PlayCircle, reading: BookOpen, quiz: HelpCircle, assignment: ClipboardCheck };
const input = "rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function MapPage() {
  const { id } = Route.useParams();
  const { maps } = useStore();
  const m = maps.find((x) => x.id === id);
  const [sec, setSec] = useState("");
  if (!m) return <Shell><p className="text-muted-foreground">Map not found. <Link to="/" className="text-primary underline">Back</Link></p></Shell>;
  const s = stats(mapItems(m));
  return (
    <Shell>
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← All maps</Link>
      <div className="mt-3 flex items-start gap-3">
        <h1 className="flex-1 font-display text-4xl">{m.title}</h1>
        <button aria-label="Edit map" className="mt-2 text-muted-foreground hover:text-foreground" onClick={() => {
          const t = prompt("Map title", m.title); if (t === null) return; const d = prompt("Description", m.description) ?? m.description;
          actions.updateMap(m.id, t.trim() || m.title, d);
        }}><Pencil size={18} /></button>
      </div>
      {m.description && <p className="mt-1 text-muted-foreground">{m.description}</p>}
      <div className="mt-5 flex items-baseline justify-between text-sm"><span className="font-semibold">{s.pct}% · {s.done}/{s.total}</span><span className="text-muted-foreground">{fmt(s.leftMin)} remaining</span></div>
      <div className="mt-2"><Progress value={s.pct} thick /></div>

      <div className="mt-8 space-y-3">
        {m.sections.map((x, i) => <SectionBlock key={x.id} mapId={m.id} section={x} index={i} last={i === m.sections.length - 1} />)}
      </div>

      <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (sec.trim()) { actions.addSection(m.id, sec.trim()); setSec(""); } }}>
        <input value={sec} onChange={(e) => setSec(e.target.value)} placeholder="Add section / module / week" className={`flex-1 ${input}`} />
        <button className="flex items-center gap-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"><Plus size={16} />Section</button>
      </form>
    </Shell>
  );
}

function SectionBlock({ mapId, section, index, last }: { mapId: string; section: Section; index: number; last: boolean }) {
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState(""); const [min, setMin] = useState("15"); const [type, setType] = useState<ItemType>("video");
  const s = stats(section.items);
  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-2 text-left">
          <ChevronRight size={18} className={`transition ${open ? "rotate-90" : ""}`} />
          <span className="font-medium">{section.title}</span>
          <span className="ml-auto text-xs text-muted-foreground">{s.pct}% · {fmt(s.leftMin)} left</span>
        </button>
        <div className="flex gap-1 text-muted-foreground">
          <button disabled={index === 0} onClick={() => actions.moveSection(mapId, section.id, -1)} className="disabled:opacity-30" aria-label="Move up"><ArrowUp size={15} /></button>
          <button disabled={last} onClick={() => actions.moveSection(mapId, section.id, 1)} className="disabled:opacity-30" aria-label="Move down"><ArrowDown size={15} /></button>
          <button onClick={() => { const t = prompt("Section title", section.title); if (t?.trim()) actions.renameSection(mapId, section.id, t.trim()); }} aria-label="Rename"><Pencil size={15} /></button>
          <button onClick={() => confirm("Delete section?") && actions.deleteSection(mapId, section.id)} className="hover:text-destructive" aria-label="Delete"><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="px-4"><Progress value={s.pct} /></div>
      {open && (
        <div className="p-4 pt-3">
          <ul className="divide-y">
            {section.items.map((it) => {
              const Icon = icons[it.type];
              return (
                <li key={it.id} className="group flex items-center gap-3 py-2.5">
                  <input type="checkbox" checked={it.done} onChange={() => actions.toggleItem(mapId, section.id, it.id)} className="h-4 w-4 accent-[var(--primary)]" />
                  <Icon size={16} className="text-muted-foreground" />
                  <span className={`flex-1 text-sm ${it.done ? "text-muted-foreground line-through" : ""}`}>{it.title}</span>
                  <span className="text-xs text-muted-foreground">{fmt(it.minutes)}</span>
                  <button onClick={() => actions.deleteItem(mapId, section.id, it.id)} className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" aria-label="Delete item"><Trash2 size={14} /></button>
                </li>
              );
            })}
          </ul>
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; actions.addItem(mapId, section.id, { title: title.trim(), type, minutes: Math.max(1, Number(min) || 0) }); setTitle(""); }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Item title" className={`min-w-40 flex-1 ${input}`} />
            <select value={type} onChange={(e) => setType(e.target.value as ItemType)} className={input}>
              <option value="video">Video</option><option value="reading">Reading</option><option value="quiz">Quiz</option><option value="assignment">Assignment</option>
            </select>
            <input type="number" min={1} value={min} onChange={(e) => setMin(e.target.value)} className={`w-20 ${input}`} aria-label="Minutes" />
            <button className="rounded-lg border px-3 text-sm hover:bg-muted">Add</button>
          </form>
        </div>
      )}
    </div>
  );
}
