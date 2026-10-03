import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Shell, Progress, Ring } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, fmt, mapItems, stats, useStore } from "@/lib/store";

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

function MapPage() {
  const { id } = Route.useParams();
  const { maps } = useStore();
  const map = maps.find((entry) => entry.id === id);
  const [sectionTitle, setSectionTitle] = useState("");
  if (!map) return <Shell><p className="text-muted-foreground">Course not found. <Link to="/" className="text-primary underline">Back</Link></p></Shell>;
  const summary = stats(mapItems(map));

  return <Shell>
    <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← All paths & courses</Link>
    <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center"><Ring value={summary.pct} size={80} /><div className="flex-1"><div className="flex items-start gap-3"><h1 className="flex-1 font-display text-4xl">{map.title}</h1><Button size="icon" variant="ghost" aria-label="Edit course" onClick={() => { const title = prompt("Course title", map.title); if (title === null) return; const description = prompt("Description", map.description) ?? map.description; actions.updateMap(map.id, title.trim() || map.title, description); }}><Pencil /></Button></div>{map.description && <p className="mt-1 text-muted-foreground">{map.description}</p>}<p className="mt-2 text-sm text-muted-foreground">{summary.done}/{summary.total} items · {fmt(summary.leftMin)} remaining · {map.sections.length} sections</p></div></div>

    <div className="mt-6 space-y-3">
      {map.sections.map((section, i) => { const st = stats(section.items); return (
        <div key={section.id} className="rounded-xl border bg-card p-4 transition hover:border-primary">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{i + 1}</span>
            <Link to="/maps/$id/$sid" params={{ id: map.id, sid: section.id }} className="flex-1 font-display text-xl hover:text-primary">{section.title}</Link>
            <Button size="icon" variant="ghost" onClick={() => actions.moveSection(map.id, section.id, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp /></Button>
            <Button size="icon" variant="ghost" onClick={() => actions.moveSection(map.id, section.id, 1)} disabled={i === map.sections.length - 1} aria-label="Move down"><ArrowDown /></Button>
            <Button size="icon" variant="ghost" onClick={() => confirm("Delete section?") && actions.deleteSection(map.id, section.id)} aria-label="Delete section"><Trash2 /></Button>
          </div>
          <div className="mt-3 flex items-center gap-3"><Progress value={st.pct} /><span className="w-40 shrink-0 text-right text-xs text-muted-foreground">{st.done}/{st.total} · {st.pct}% · {fmt(st.leftMin)} left</span></div>
        </div>); })}
      {map.sections.length === 0 && <p className="text-muted-foreground">No sections yet — add one below.</p>}
    </div>

    <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (sectionTitle.trim()) { actions.addSection(map.id, sectionTitle.trim()); setSectionTitle(""); } }}><Input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} placeholder="Add section (e.g. Week 1 — Foundations)" className="h-10 bg-card" /><Button><Plus />Section</Button></form>
  </Shell>;
}
