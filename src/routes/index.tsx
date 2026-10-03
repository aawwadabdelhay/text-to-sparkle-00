import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUp, FolderTree, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { Shell, Progress, Ring } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, fmt, mapItems, stats, streak, useStore, type LearningPath, type StudyMap } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Learning Journey Tracker — Paths & courses" },
      { name: "description", content: "Organize courses into learning paths, sections and items, and track your progress." },
      { property: "og:title", content: "Learning Journey Tracker" },
      { property: "og:description", content: "Track learning paths and courses with live progress, streaks and time remaining." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const sel = "h-9 rounded-md border bg-background/60 px-2 text-xs outline-none focus:ring-2 focus:ring-ring";

function Tag({ kind }: { kind: "path" | "course" }) {
  return kind === "path"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-secondary"><FolderTree size={12} />Learning path</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary"><GraduationCap size={12} />Course</span>;
}

function CourseControls({ m, paths }: { m: StudyMap; paths: LearningPath[] }) {
  return <div className="relative z-[1] flex items-center gap-1">
    <select className={sel} value={m.pathId ?? ""} onChange={(e) => actions.assignMapToPath(m.id, e.target.value || undefined)} aria-label="Move course to learning path">
      <option value="">Standalone</option>
      {paths.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
    </select>
    <Button size="icon" variant="ghost" onClick={() => actions.moveMap(m.id, -1)} aria-label="Move up"><ArrowUp /></Button>
    <Button size="icon" variant="ghost" onClick={() => actions.moveMap(m.id, 1)} aria-label="Move down"><ArrowDown /></Button>
    <Button size="icon" variant="ghost" onClick={() => confirm(`Delete "${m.title}"?`) && actions.deleteMap(m.id)} aria-label="Delete course"><Trash2 /></Button>
  </div>;
}

function Index() {
  const { maps, studyDays, learningPaths } = useStore();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"course" | "path">("course");
  const all = stats(maps.flatMap(mapItems));
  const standalone = maps.filter((m) => !m.pathId || !learningPaths.some((p) => p.id === m.pathId));
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

      <form className="mb-8 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); const t = title.trim(); if (!t) return; if (kind === "path") actions.addLearningPath(t); else actions.addMap(t); setTitle(""); }}>
        <select value={kind} onChange={(e) => setKind(e.target.value as "course" | "path")} className="h-11 rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" aria-label="What to add">
          <option value="course">Course</option>
          <option value="path">Learning path</option>
        </select>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "path" ? "New learning path name" : "New course name"} className="h-11 flex-1 bg-card" />
        <Button className="h-11"><Plus />Add</Button>
      </form>

      <div className="space-y-5">
        {learningPaths.map((path) => {
          const courses = maps.filter((m) => m.pathId === path.id);
          const s = stats(courses.flatMap(mapItems));
          return <section key={path.id} className="rounded-xl border border-secondary/40 bg-card p-5">
            <div className="flex items-start gap-4">
              <Ring value={s.pct} />
              <div className="flex-1"><Tag kind="path" /><h2 className="mt-2 font-display text-2xl">{path.title}</h2><p className="mt-1 text-sm text-muted-foreground">{courses.length} courses · {s.done}/{s.total} items · {fmt(s.leftMin)} left</p></div>
              <div className="flex">
                <Button size="icon" variant="ghost" onClick={() => actions.movePath(path.id, -1)} aria-label="Move path up"><ArrowUp /></Button>
                <Button size="icon" variant="ghost" onClick={() => actions.movePath(path.id, 1)} aria-label="Move path down"><ArrowDown /></Button>
                <Button size="icon" variant="ghost" onClick={() => { const t = prompt("Learning path name", path.title); if (t?.trim()) actions.renameLearningPath(path.id, t.trim()); }} aria-label="Rename path"><Pencil /></Button>
                <Button size="icon" variant="ghost" onClick={() => confirm(`Delete path "${path.title}"? Its courses stay as standalone.`) && actions.deleteLearningPath(path.id)} aria-label="Delete path"><Trash2 /></Button>
              </div>
            </div>
            <div className="mt-3"><Progress value={s.pct} /></div>
            <div className="mt-4 space-y-2 border-l-2 border-secondary/40 pl-4">
              {courses.map((m) => { const cs = stats(mapItems(m)); return (
                <div key={m.id} className="relative flex flex-wrap items-center gap-3 rounded-lg border bg-background/40 p-3 hover:border-primary">
                  <Link to="/maps/$id" params={{ id: m.id }} className="absolute inset-0" aria-label={m.title} />
                  <Tag kind="course" />
                  <span className="min-w-32 flex-1 font-medium">{m.title}</span>
                  <span className="text-sm text-muted-foreground">{cs.pct}%</span>
                  <CourseControls m={m} paths={learningPaths} />
                </div>); })}
              {courses.length === 0 && <p className="py-2 text-sm text-muted-foreground">No courses yet — move a course here using its “Standalone” selector.</p>}
            </div>
          </section>;
        })}

        <div className="grid gap-4 sm:grid-cols-2">
          {standalone.map((m) => {
            const s = stats(mapItems(m));
            return (
              <div key={m.id} className="relative rounded-xl border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary">
                <Link to="/maps/$id" params={{ id: m.id }} className="absolute inset-0" aria-label={m.title} />
                <div className="flex items-start gap-4">
                  <Ring value={s.pct} />
                  <div className="flex-1"><Tag kind="course" /><h2 className="mt-2 font-display text-2xl leading-snug">{m.title}</h2></div>
                </div>
                {m.description && <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>}
                <div className="mt-5 flex items-baseline justify-between text-sm"><span className="font-semibold">{s.done}/{s.total} items</span><span className="text-muted-foreground">{m.sections.length} sections · {fmt(s.leftMin)} left</span></div>
                <div className="mt-2"><Progress value={s.pct} /></div>
                <div className="mt-4 flex justify-end"><CourseControls m={m} paths={learningPaths} /></div>
              </div>
            );
          })}
        </div>
        {maps.length === 0 && learningPaths.length === 0 && <p className="text-muted-foreground">Nothing yet — add a course or learning path above.</p>}
      </div>
    </Shell>
  );
}
