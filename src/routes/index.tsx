import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FolderTree, GripVertical, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { Shell, Progress, Ring } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [pathTitle, setPathTitle] = useState("");
  const [view, setView] = useState<"cards" | "tree">("cards");
  const [draggedMap, setDraggedMap] = useState<string | null>(null);
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { actions.addMap(title.trim()); setTitle(""); } }}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New diploma or study plan" className="h-11 bg-card" />
          <Button className="h-11"><Plus />Add</Button>
        </form>
        <div className="flex rounded-lg border bg-card p-1" aria-label="Homepage view">
          <Button type="button" size="icon" variant={view === "cards" ? "secondary" : "ghost"} onClick={() => setView("cards")} title="Card view"><LayoutGrid /></Button>
          <Button type="button" size="icon" variant={view === "tree" ? "secondary" : "ghost"} onClick={() => setView("tree")} title="Learning path view"><FolderTree /></Button>
        </div>
      </div>

      {view === "cards" ? <div className="grid gap-4 sm:grid-cols-2">
        {maps.map((m) => {
          const s = stats(mapItems(m));
          return (
            <div key={m.id} draggable onDragStart={() => setDraggedMap(m.id)} onDragEnd={() => setDraggedMap(null)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (draggedMap) actions.groupMaps(draggedMap, m.id); }} className="group relative rounded-xl border bg-card p-6 backdrop-blur transition hover:-translate-y-0.5 hover:border-primary">
              <Link to="/maps/$id" params={{ id: m.id }} className="absolute inset-0" aria-label={m.title} />
              <div className="flex items-start gap-4">
                <Ring value={s.pct} />
                <h2 className="flex-1 font-display text-2xl leading-snug">{m.title}</h2>
                <GripVertical className="relative z-[1] mt-1 text-muted-foreground" size={17} aria-label="Drag study plan" />
                <Button size="icon" variant="ghost" className="relative z-[1] opacity-0 group-hover:opacity-100" onClick={() => confirm(`Delete "${m.title}"?`) && actions.deleteMap(m.id)} aria-label="Delete map"><Trash2 /></Button>
              </div>
              {m.description && <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>}
              <div className="mt-5 flex items-baseline justify-between text-sm"><span className="font-semibold">{mapItems(m).filter((i) => i.done).length}/{mapItems(m).length} items</span><span className="text-muted-foreground">{m.sections.length} modules · {fmt(s.leftMin)} left</span></div>
              <div className="mt-2"><Progress value={s.pct} /></div>
            </div>
          );
        })}
        {maps.length === 0 && <p className="text-muted-foreground">No study maps yet — create your first above.</p>}
      </div> : <div className="space-y-4">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (pathTitle.trim()) { actions.addLearningPath(pathTitle.trim()); setPathTitle(""); } }}>
          <Input value={pathTitle} onChange={(e) => setPathTitle(e.target.value)} placeholder="Learning path name" className="bg-card" />
          <Button><Plus />Path</Button>
        </form>
        {useStore().learningPaths.map((path) => {
          const pathMaps = maps.filter((m) => m.pathId === path.id);
          return <section key={path.id} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (draggedMap) actions.assignMapToPath(draggedMap, path.id); }} className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2"><FolderTree className="text-secondary" /><h2 className="flex-1 font-display text-xl">{path.title}</h2><span className="text-xs text-muted-foreground">{pathMaps.length} plans</span><Button size="icon" variant="ghost" onClick={() => actions.deleteLearningPath(path.id)} aria-label="Delete learning path"><Trash2 /></Button></div>
            <div className="ml-3 space-y-2 border-l border-secondary/40 pl-5">{pathMaps.map((m) => <Link draggable onDragStart={() => setDraggedMap(m.id)} onDragEnd={() => setDraggedMap(null)} key={m.id} to="/maps/$id" params={{ id: m.id }} className="flex items-center gap-3 rounded-lg border bg-background/40 p-3 hover:border-primary"><GripVertical size={16} className="text-muted-foreground" /><span className="flex-1 font-medium">{m.title}</span><span className="text-sm text-muted-foreground">{stats(mapItems(m)).pct}%</span></Link>)}{pathMaps.length === 0 && <p className="py-3 text-sm text-muted-foreground">Drag a study plan here.</p>}</div>
          </section>;
        })}
        {maps.filter((m) => !m.pathId).map((m) => <Link draggable onDragStart={() => setDraggedMap(m.id)} onDragEnd={() => setDraggedMap(null)} key={m.id} to="/maps/$id" params={{ id: m.id }} className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary"><GripVertical className="text-muted-foreground" /><span className="flex-1 font-display text-xl">{m.title}</span><span className="text-muted-foreground">{stats(mapItems(m)).pct}%</span></Link>)}
      </div>}
    </Shell>
  );
}
