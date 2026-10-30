import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Check, ClipboardCheck, HelpCircle, PlayCircle, StickyNote } from "lucide-react";
import { Shell, Progress, Ring } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { actions, fmt, localToday, mapItems, stats, useStore, type ItemType } from "@/lib/store";
import { dayKey } from "@/lib/schedule";

export const Route = createFileRoute("/_authenticated/maps_/$id/plan")({
  head: () => ({ meta: [
    { title: "Course tree plan — Learning Journey Tracker" },
    { name: "description", content: "Follow your course section by section with a visual tree plan and track each lesson's completion." },
    { property: "og:title", content: "Course tree plan — Learning Journey Tracker" },
    { property: "og:description", content: "A connected course plan with videos, readings, quizzes, assignments and notes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CoursePlanPage,
});

const types: Record<ItemType, { icon: typeof PlayCircle; label: string; color: string }> = {
  video: { icon: PlayCircle, label: "Video", color: "text-primary border-primary/40 bg-primary/10" },
  reading: { icon: BookOpen, label: "Reading", color: "text-accent border-accent/40 bg-accent/10" },
  quiz: { icon: HelpCircle, label: "Quiz", color: "text-secondary border-secondary/40 bg-secondary/10" },
  assignment: { icon: ClipboardCheck, label: "Assignment", color: "text-chart-4 border-chart-4/40 bg-chart-4/10" },
  note: { icon: StickyNote, label: "Note", color: "text-chart-5 border-chart-5/40 bg-chart-5/10" },
};

function CoursePlanPage() {
  const { id } = Route.useParams();
  const { maps, wig } = useStore();
  const [drag, setDrag] = useState<{ sid: string; iid: string } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const map = maps.find((entry) => entry.id === id);
  if (!map) return <Shell><p>Course not found.</p><Link to="/" className="text-primary">All courses</Link></Shell>;
  const summary = stats(mapItems(map));

  return <Shell>
    <Button variant="outline" size="sm" asChild>
      <Link to="/maps/$id" params={{ id }}>Course sections</Link>
    </Button>
    <div className="mt-5 flex items-start gap-4 sm:items-center">
      <Ring value={summary.pct} size={72} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Course tree plan{wig && map.pathId === wig.pathId && <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-accent">WIG · {wig.title}</span>}</p>
        <h1 className="mt-1 break-words font-display text-3xl sm:text-4xl">{map.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{summary.done}/{summary.total} complete · {fmt(summary.leftMin)} remaining</p>
      </div>
    </div>
    <div className="mt-5"><Progress value={summary.pct} thick /></div>
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Item types">
      {Object.entries(types).map(([type, detail]) => {
        const Icon = detail.icon;
        return <span key={type} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Icon size={14} />{detail.label}</span>;
      })}
    </div>

    <ol className="relative ml-3 mt-9 border-l-2 border-accent/35 pb-2">
      {map.sections.map((section, index) => {
        const progress = stats(section.items);
        return <li key={section.id} className="relative pb-7 pl-6 last:pb-0 sm:pl-8">
          <span className={`absolute -left-[11px] top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 ${progress.total > 0 && progress.pct === 100 ? "border-primary bg-primary text-primary-foreground" : "border-accent bg-background text-accent"}`}>
            {progress.total > 0 && progress.pct === 100 && <Check size={12} />}
          </span>
          <span className="absolute left-0 top-6 w-6 border-t-2 border-accent/35 sm:w-8" />
          <div className="grid items-start gap-3 sm:grid-cols-[210px_minmax(0,1fr)]">
            <div>
              <Link to="/maps/$id/$sid" params={{ id, sid: section.id }} className="flex min-h-12 items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20">
                <span className="shrink-0 text-xs opacity-70">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 break-words">{section.title}</span>
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">{progress.done}/{progress.total} complete · {progress.pct}%</p>
              {section.items.length > 1 && <div className="mt-2 flex gap-1">
                <button onClick={() => actions.sortItems(id, section.id, "asc")} className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">Sort 1→9</button>
                <button onClick={() => actions.sortItems(id, section.id, "reverse")} className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">Reverse</button>
              </div>}
            </div>
            <div className="relative">
              <span className="absolute -left-3 top-6 hidden w-3 border-t-2 border-accent/35 sm:block" />
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {section.items.map((item) => {
                  const detail = types[item.type];
                  const Icon = detail.icon;
                  return <li key={item.id} draggable
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", item.id); setDrag({ sid: section.id, iid: item.id }); }}
                    onDragEnd={() => { setDrag(null); setOver(null); }}
                    onDragOver={(e) => { if (drag?.sid === section.id) { e.preventDefault(); setOver(item.id); } }}
                    onDrop={(e) => { e.preventDefault(); if (drag && drag.sid === section.id && drag.iid !== item.id) actions.reorderItem(id, section.id, drag.iid, item.id); setDrag(null); setOver(null); }}
                    className={`flex min-w-0 cursor-grab flex-col rounded-md border transition active:cursor-grabbing ${item.done ? (item.doneAt && dayKey(new Date(item.doneAt)) === localToday() ? "border-accent bg-accent/15 glow-accent" : "border-primary/60 bg-primary/15 glow-primary") : detail.color} ${drag?.iid === item.id ? "opacity-40" : ""} ${over === item.id && drag?.iid !== item.id ? "ring-2 ring-accent" : ""}`}>
                    <Link draggable={false} to="/maps/$id/$sid/items/$iid" params={{ id, sid: section.id, iid: item.id }} title={item.title} className="flex min-h-20 flex-1 flex-col gap-2 p-2.5 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase"><Icon size={13} />{detail.label}</span>
                      <span className={`break-words text-xs leading-5 ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.title}</span>
                    </Link>
                    <div className="flex items-center justify-between gap-2 border-t border-current/15 px-2.5 py-2">
                      <span className="text-[10px] text-muted-foreground">{fmt(item.minutes)}</span>
                      <Checkbox checked={item.done} onCheckedChange={() => actions.toggleItem(id, section.id, item.id)} aria-label={`Mark ${item.title} complete`} />
                    </div>
                  </li>;
                })}
              </ul>
              {section.items.length === 0 && <p className="py-3 text-sm text-muted-foreground">No items yet.</p>}
            </div>
          </div>
        </li>;
      })}
    </ol>
    {map.sections.length === 0 && <p className="mt-6 text-muted-foreground">No sections yet.</p>}
  </Shell>;
}