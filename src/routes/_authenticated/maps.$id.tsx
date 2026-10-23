import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, ChevronDown, ChevronRight, ClipboardCheck, FolderTree, HelpCircle, Pencil, PlayCircle, Plus, StickyNote, Trash2 } from "lucide-react";
import { Shell, Progress, Ring } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { actions, deleteItemUndoable, deleteSectionUndoable, fmt, mapItems, stats, useStore, type ItemType, type Section, type StudyMap } from "@/lib/store";

export const Route = createFileRoute("/maps/$id")({
  head: () => ({ meta: [
    { title: "Course sections — Learning Journey Tracker" },
    { name: "description", content: "Organize a course into ordered sections with videos, quizzes, assignments and notes." },
    { property: "og:title", content: "Course sections — Learning Journey Tracker" },
    { property: "og:description", content: "Structure your course into ordered, bite-sized sections." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }), component: MapPage,
});

const icons: Record<ItemType, typeof PlayCircle> = { video: PlayCircle, reading: BookOpen, quiz: HelpCircle, assignment: ClipboardCheck, note: StickyNote };

function SectionCard({ map, section, index, expanded, onToggle }: {
  map: StudyMap;
  section: Section;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const st = stats(section.items);
  return (
    <div className="rounded-xl border bg-card p-4 transition hover:border-primary">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onToggle} aria-expanded={expanded} aria-label={expanded ? `Collapse ${section.title}` : `Expand ${section.title}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background/60 text-muted-foreground transition hover:border-primary hover:text-primary">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{index + 1}</span>
        <Link to="/maps/$id/$sid" params={{ id: map.id, sid: section.id }} className="flex-1 font-display text-xl hover:text-primary">{section.title}</Link>
        <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">{st.done}/{st.total} items</span>
        <Button size="icon" variant="ghost" onClick={() => actions.moveSection(map.id, section.id, -1)} disabled={index === 0} aria-label="Move up"><ArrowUp /></Button>
        <Button size="icon" variant="ghost" onClick={() => actions.moveSection(map.id, section.id, 1)} disabled={index === map.sections.length - 1} aria-label="Move down"><ArrowDown /></Button>
        <Button size="icon" variant="ghost" onClick={() => deleteSectionUndoable(map.id, section.id)} aria-label="Delete section"><Trash2 /></Button>
      </div>
      <div className="mt-3 flex items-center gap-3"><Progress value={st.pct} /><span className="w-40 shrink-0 text-right text-xs text-muted-foreground">{st.done}/{st.total} · {st.pct}% · {fmt(st.leftMin)} left</span></div>

      {expanded && (
        <ul className="ml-3 mt-3 space-y-1 border-l border-secondary/30 pl-4">
          {section.items.map((it) => {
            const Icon = icons[it.type];
            return (
              <li key={it.id} className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition hover:bg-primary/5">
                <Checkbox checked={it.done} onCheckedChange={() => actions.toggleItem(map.id, section.id, it.id)} aria-label={`Mark ${it.title} complete`} />
                <Icon size={16} className="shrink-0 text-primary" />
                <Link to="/maps/$id/$sid/items/$iid" params={{ id: map.id, sid: section.id, iid: it.id }}
                  className={`flex-1 truncate text-sm transition hover:text-primary ${it.done ? "text-muted-foreground line-through" : ""}`}>{it.title}</Link>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{fmt(it.minutes)}</span>
                <Button size="icon" variant="ghost" onClick={() => deleteItemUndoable(map.id, section.id, it.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete item"><Trash2 /></Button>
              </li>
            );
          })}
          {section.items.length === 0 && <li className="px-2 py-2 text-sm text-muted-foreground">No items yet — open the section to add videos, quizzes and more.</li>}
        </ul>
      )}
    </div>
  );
}

function MapPage() {
  const { id } = Route.useParams();
  const { maps } = useStore();
  const map = maps.find((entry) => entry.id === id);
  const [sectionTitle, setSectionTitle] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  if (!map) return <Shell><p className="text-muted-foreground">Course not found. <Link to="/" className="text-primary underline">Back</Link></p></Shell>;
  const summary = stats(mapItems(map));
  const allExpanded = map.sections.every((s) => collapsed[s.id]);
  const toggle = (sid: string) => setCollapsed((c) => ({ ...c, [sid]: !c[sid] }));

  return <Shell>
    <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← All paths & courses</Link>
    <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center"><Ring value={summary.pct} size={80} /><div className="flex-1"><div className="flex items-start gap-3"><h1 className="flex-1 font-display text-4xl">{map.title}</h1><Button size="icon" variant="ghost" aria-label="Edit course" onClick={() => { const title = prompt("Course title", map.title); if (title === null) return; const description = prompt("Description", map.description) ?? map.description; actions.updateMap(map.id, title.trim() || map.title, description); }}><Pencil /></Button></div>{map.description && <p className="mt-1 text-muted-foreground">{map.description}</p>}<p className="mt-2 text-sm text-muted-foreground">{summary.done}/{summary.total} items · {fmt(summary.leftMin)} remaining · {map.sections.length} sections</p></div></div>

    <div className="mt-5"><Button asChild variant="outline"><Link to="/maps/$id/plan" params={{ id }}><FolderTree />Tree plan</Link></Button></div>

    {map.sections.length > 0 && (
      <div className="mt-5 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(allExpanded ? {} : Object.fromEntries(map.sections.map((s) => [s.id, true])))}>
          {allExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{allExpanded ? "Expand all" : "Collapse all"}
        </Button>
      </div>
    )}

    <div className="mt-2 space-y-3">
      {map.sections.map((section, i) => (
        <SectionCard key={section.id} map={map} section={section} index={i} expanded={!collapsed[section.id]} onToggle={() => toggle(section.id)} />
      ))}
      {map.sections.length === 0 && <p className="text-muted-foreground">No sections yet — add one below.</p>}
    </div>

    <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (sectionTitle.trim()) { actions.addSection(map.id, sectionTitle.trim()); setSectionTitle(""); } }}><Input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} placeholder="Add section (e.g. Week 1 — Foundations)" className="h-10 bg-card" /><Button><Plus />Section</Button></form>
  </Shell>;
}
