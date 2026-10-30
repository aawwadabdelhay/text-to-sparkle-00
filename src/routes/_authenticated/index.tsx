import { WigBoard } from "@/components/WigBoard";
import { FocusScoreboard } from "@/components/FocusScoreboard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import type React from "react";
import {
  ArrowDown, ArrowLeft, ArrowUp, BookOpen, Check, ClipboardCheck, FolderTree, GraduationCap,
  HelpCircle, LayoutGrid, ListTree, Pencil, PlayCircle, Plus, StickyNote, Trash2,
} from "lucide-react";
import { Shell, Progress, Ring } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { actions, fmt, mapItems, stats, streak, useStore, type Item, type ItemType, type StudyMap } from "@/lib/store";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { importFromUrl } from "@/lib/import.functions";
import { HabitCircle } from "@/components/HabitCircle";
import { TaskRow } from "@/components/TaskRow";
import { localToday } from "@/lib/store";
import { sortTasks } from "@/lib/schedule";

function TodayTasks() {
  const { maps, schedule } = useStore();
  const today = localToday();
  const tasks = sortTasks(schedule.filter((t) => t.date === today));
  const overdue = schedule.filter((t) => t.date < today && !maps.find((m) => m.id === t.mapId)?.sections.find((s) => s.id === t.sectionId)?.items.find((i) => i.id === t.itemId)?.done);
  return <section className="mb-10 space-y-4"><WigBoard /><FocusScoreboard /><div className="rounded-2xl border bg-card p-5">
    <div className="flex flex-wrap items-center gap-3"><div className="flex-1"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tasks</p><h2 className="font-display text-2xl">Today's study</h2></div>
      {overdue.length > 0 && <Button size="sm" variant="secondary" onClick={() => actions.rollOverOverdue()}>Move {overdue.length} unfinished to today</Button>}
      <Link to="/planner" className="text-sm text-primary hover:underline">Open planner →</Link></div>
    {tasks.length ? <ul className="mt-4 space-y-2">{tasks.map((t) => <TaskRow key={t.id} task={t} maps={maps} />)}</ul>
      : <p className="mt-3 text-sm text-muted-foreground">Nothing planned for today. Use the planner to assign lessons to time slots.</p>}
  </div></section>;
}

export const Route = createFileRoute("/_authenticated/")({
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

const itemTypes: Record<ItemType, { icon: typeof PlayCircle; label: string; color: string }> = {
  video: { icon: PlayCircle, label: "Video", color: "text-primary border-primary/40 bg-primary/10" },
  reading: { icon: BookOpen, label: "Reading", color: "text-accent border-accent/40 bg-accent/10" },
  quiz: { icon: HelpCircle, label: "Quiz", color: "text-secondary border-secondary/40 bg-secondary/10" },
  assignment: { icon: ClipboardCheck, label: "Assignment", color: "text-chart-4 border-chart-4/40 bg-chart-4/10" },
  note: { icon: StickyNote, label: "Note", color: "text-chart-5 border-chart-5/40 bg-chart-5/10" },
};

function Tag({ kind }: { kind: "path" | "course" }) {
  return kind === "path"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-secondary"><FolderTree size={12} />Learning path</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary"><GraduationCap size={12} />Course</span>;
}

let dragId: string | null = null;
function useDrop(pathId: string | undefined, beforeId?: string) {
  const [over, setOver] = useState(false);
  return { over, props: {
    onDragOver: (e: React.DragEvent) => { if (!dragId) return; e.preventDefault(); e.stopPropagation(); setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setOver(false); if (dragId) actions.placeMap(dragId, pathId, beforeId); dragId = null; },
  } };
}
const dragProps = (id: string) => ({
  draggable: true,
  onDragStart: (e: React.DragEvent) => { dragId = id; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); },
  onDragEnd: () => { dragId = null; },
});

function CourseControls({ m }: { m: StudyMap }) {
  return <div className="relative z-[1] flex items-center gap-1">
    <Button size="icon" variant="ghost" onClick={() => confirm(`Delete "${m.title}"?`) && actions.deleteMap(m.id)} aria-label="Delete course"><Trash2 /></Button>
  </div>;
}

function PathCourse({ m, pathId }: { m: StudyMap; pathId: string }) {
  const d = useDrop(pathId, m.id); const cs = stats(mapItems(m));
  return <div {...dragProps(m.id)} {...d.props} className={`relative flex cursor-grab flex-wrap items-center gap-3 rounded-lg border bg-background/40 p-3 hover:border-primary active:cursor-grabbing ${d.over ? "border-t-4 border-t-primary" : ""}`}>
    <Link to="/maps/$id" params={{ id: m.id }} draggable={false} className="absolute inset-0" aria-label={m.title} />
    <Tag kind="course" />
    <span className="min-w-32 flex-1 font-medium">{m.title}</span>
    <span className="text-sm text-muted-foreground">{cs.pct}%</span>
    <CourseControls m={m} />
  </div>;
}

function StandaloneCard({ m }: { m: StudyMap }) {
  const d = useDrop(undefined, m.id); const s = stats(mapItems(m));
  return <div {...dragProps(m.id)} {...d.props} className={`relative cursor-grab rounded-xl border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary active:cursor-grabbing ${d.over ? "ring-2 ring-primary" : ""}`}>
    <Link to="/maps/$id" params={{ id: m.id }} draggable={false} className="absolute inset-0" aria-label={m.title} />
    <div className="flex items-start gap-4"><Ring value={s.pct} /><div className="flex-1"><Tag kind="course" /><h2 className="mt-2 font-display text-2xl leading-snug">{m.title}</h2></div></div>
    {m.description && <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>}
    <div className="mt-5 flex items-baseline justify-between text-sm"><span className="font-semibold">{s.done}/{s.total} items</span><span className="text-muted-foreground">{m.sections.length} sections · {fmt(s.leftMin)} left</span></div>
    <div className="mt-2"><Progress value={s.pct} /></div>
    <div className="mt-4 flex justify-end"><CourseControls m={m} /></div>
  </div>;
}

function PathCourses({ pathId, courses }: { pathId: string; courses: StudyMap[] }) {
  const d = useDrop(pathId);
  return <div {...d.props} className={`mt-4 space-y-2 rounded-lg border-l-2 border-secondary/40 pl-4 pb-2 ${d.over ? "bg-secondary/10" : ""}`}>
    {courses.map((m) => <PathCourse key={m.id} m={m} pathId={pathId} />)}
    <p className="py-2 text-xs text-muted-foreground">{courses.length === 0 ? "Drag a course here to add it to this path." : "Drop here to add at the end."}</p>
  </div>;
}

function StandaloneZone({ list }: { list: StudyMap[] }) {
  const d = useDrop(undefined);
  return <div {...d.props} className={`rounded-xl p-1 ${d.over ? "bg-primary/10 ring-2 ring-dashed ring-primary" : ""}`}>
    <p className="mb-3 text-sm uppercase tracking-[0.2em] text-muted-foreground">Standalone courses — drop here to remove from a path</p>
    <div className="grid gap-4 sm:grid-cols-2">{list.map((m) => <StandaloneCard key={m.id} m={m} />)}</div>
    {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No standalone courses.</p>}
  </div>;
}

// ---- Journey map view: the whole learning journey as one tree plan ----

function ItemTile({ mid, sid, item }: { mid: string; sid: string; item: Item }) {
  const detail = itemTypes[item.type];
  const Icon = detail.icon;
  return <li className={`flex min-w-0 flex-col rounded-md border ${item.done ? "border-primary/50 bg-primary/15" : detail.color}`}>
    <Link to="/maps/$id/$sid/items/$iid" params={{ id: mid, sid, iid: item.id }} title={item.title} className="flex min-h-20 flex-1 flex-col gap-2 p-2.5 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase"><Icon size={13} />{detail.label}</span>
      <span className={`break-words text-xs leading-5 ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.title}</span>
    </Link>
    <div className="flex items-center justify-between gap-2 border-t border-current/15 px-2.5 py-2">
      <span className="text-[10px] text-muted-foreground">{fmt(item.minutes)}</span>
      <Checkbox checked={item.done} onCheckedChange={() => actions.toggleItem(mid, sid, item.id)} aria-label={`Mark ${item.title} complete`} />
    </div>
  </li>;
}

function CourseSpine({ m }: { m: StudyMap }) {
  const s = stats(mapItems(m));
  return <div className="rounded-xl border bg-card/70 p-4 sm:p-5">
    <div className="flex items-center gap-3">
      <Ring value={s.pct} size={44} />
      <Link to="/maps/$id" params={{ id: m.id }} className="min-w-0 flex-1 transition hover:opacity-90">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Course</p>
        <h3 className="break-words font-display text-xl leading-snug">{m.title}</h3>
        <p className="text-xs text-muted-foreground">{s.done}/{s.total} complete · {fmt(s.leftMin)} left</p>
      </Link>
    </div>
    <ol className="relative ml-3 mt-6 border-l-2 border-accent/35 pb-1">
      {m.sections.map((section, index) => {
        const p = stats(section.items);
        return <li key={section.id} className="relative pb-6 pl-5 last:pb-0 sm:pl-6">
          <span className={`absolute -left-[11px] top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 ${p.total > 0 && p.pct === 100 ? "border-primary bg-primary text-primary-foreground" : "border-accent bg-background text-accent"}`}>
            {p.total > 0 && p.pct === 100 && <Check size={12} />}
          </span>
          <span className="absolute left-0 top-5 w-5 border-t-2 border-accent/35 sm:w-6" />
          <Link to="/maps/$id/$sid" params={{ id: m.id, sid: section.id }} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent/20">
            <span className="shrink-0 text-xs opacity-70">{String(index + 1).padStart(2, "0")}</span>
            <span className="min-w-0 break-words">{section.title}</span>
          </Link>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{p.done}/{p.total} complete · {p.pct}%</p>
          <ul className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {section.items.map((item) => <ItemTile key={item.id} mid={m.id} sid={section.id} item={item} />)}
          </ul>
          {section.items.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No items yet.</p>}
        </li>;
      })}
      {m.sections.length === 0 && <p className="pb-1 pl-5 text-sm text-muted-foreground">No sections yet — open the course to add some.</p>}
    </ol>
  </div>;
}

function JourneyMap({ onBack }: { onBack: () => void }) {
  const { maps, learningPaths } = useStore();
  const standalone = maps.filter((m) => !m.pathId || !learningPaths.some((p) => p.id === m.pathId));
  return <div>
    <Button variant="ghost" onClick={onBack} className="-ml-2 mb-6 text-muted-foreground hover:text-foreground" aria-label="Back to default view">
      <ArrowLeft />Back to default view
    </Button>
    <div className="mb-8 flex flex-wrap gap-x-5 gap-y-2" aria-label="Item types">
      {Object.entries(itemTypes).map(([type, detail]) => {
        const Icon = detail.icon;
        return <span key={type} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Icon size={14} />{detail.label}</span>;
      })}
    </div>

    <div className="space-y-8">
      {learningPaths.map((path) => {
        const courses = maps.filter((m) => m.pathId === path.id);
        const s = stats(courses.flatMap(mapItems));
        return <section key={path.id} className="rounded-2xl border border-secondary/40 bg-secondary/5 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Ring value={s.pct} size={52} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Learning path</p>
              <h2 className="break-words font-display text-2xl leading-snug">{path.title}</h2>
              <p className="text-xs text-muted-foreground">{courses.length} courses · {s.done}/{s.total} items · {fmt(s.leftMin)} left</p>
            </div>
          </div>
          <div className="mt-4 space-y-4 border-l-2 border-secondary/30 pl-3 sm:pl-4">
            {courses.map((m) => <CourseSpine key={m.id} m={m} />)}
            {courses.length === 0 && <p className="py-2 text-sm text-muted-foreground">No courses in this path yet.</p>}
          </div>
        </section>;
      })}

      {standalone.length > 0 && <section>
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Standalone courses</p>
        <div className="space-y-4">{standalone.map((m) => <CourseSpine key={m.id} m={m} />)}</div>
      </section>}

      {maps.length === 0 && learningPaths.length === 0 && <p className="text-muted-foreground">Nothing yet — go back and add a course or learning path.</p>}
    </div>
  </div>;
}

function Index() {
  const { maps, studyDays, learningPaths } = useStore();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"course" | "path" | "link">("course");
  const [importing, setImporting] = useState(false);
  const importFn = useServerFn(importFromUrl);
  const [view, setView] = useState<"cards" | "map">("cards");
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
        <div className="mt-6 inline-flex rounded-full border bg-card p-1" role="tablist" aria-label="Home view">
          <Button size="sm" variant={view === "cards" ? "secondary" : "ghost"} onClick={() => setView("cards")} aria-pressed={view === "cards"}>
            <LayoutGrid size={16} />Default
          </Button>
          <Button size="sm" variant={view === "map" ? "secondary" : "ghost"} onClick={() => setView("map")} aria-pressed={view === "map"}>
            <ListTree size={16} />Journey map
          </Button>
        </div>
      </section>

      {view === "map" ? (
        <JourneyMap onBack={() => setView("cards")} />
      ) : (
        <>
          <TodayTasks />
          <section className="mb-10 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <HabitCircle />
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">In progress</p>
              <h2 className="font-display text-2xl">Active learning paths</h2>
              <ul className="mt-4 space-y-4">
                {learningPaths.map((p) => {
                  const courses = maps.filter((m) => m.pathId === p.id); const s = stats(courses.flatMap(mapItems));
                  return { p, courses, s };
                }).filter(({ s }) => s.pct < 100).map(({ p, courses, s }) => (
                  <li key={p.id}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{p.title}</span><span className="text-muted-foreground">{s.pct}%</span></div>
                    <div className="mt-1.5"><Progress value={s.pct} /></div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {courses.map((m) => (
                        <Link key={m.id} to="/maps/$id" params={{ id: m.id }} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground">{m.title} · {stats(mapItems(m)).pct}%</Link>
                      ))}
                    </div>
                  </li>
                ))}
                {!learningPaths.length && <li className="text-sm text-muted-foreground">No learning paths yet — add one below.</li>}
              </ul>
            </div>
          </section>
          <form className="mb-8 flex flex-col gap-2 sm:flex-row" onSubmit={async (e) => {
            e.preventDefault(); const t = title.trim(); if (!t || importing) return;
            if (kind === "link") {
              setImporting(true);
              try {
                const r = await importFn({ data: { url: t } });
                if (r.error || !r.result) toast.error(r.error ?? "Import failed");
                else { actions.importCourses(r.result); setTitle(""); toast.success(`Imported “${r.result.title}” — ${r.result.courses.reduce((a, c) => a + c.sections.reduce((b, s) => b + s.items.length, 0), 0)} lessons`); }
              } catch { toast.error("That doesn't look like a valid link."); } finally { setImporting(false); }
              return;
            }
            if (kind === "path") actions.addLearningPath(t); else actions.addMap(t); setTitle("");
          }}>
            <select value={kind} onChange={(e) => setKind(e.target.value as "course" | "path" | "link")} className="h-11 rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" aria-label="What to add">
              <option value="course">Course</option>
              <option value="path">Learning path</option>
              <option value="link">Import from link</option>
            </select>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "link" ? "Paste a course link (YouTube playlist, Udemy, Coursera, LinkedIn Learning…)" : kind === "path" ? "New learning path name" : "New course name"} className="h-11 flex-1 bg-card" />
            <Button className="h-11" disabled={importing}>{kind === "link" ? <><Download />{importing ? "Importing… (up to a minute)" : "Import"}</> : <><Plus />Add</>}</Button>
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
                <PathCourses pathId={path.id} courses={courses} />
              </section>;
            })}

            <StandaloneZone list={standalone} />
            {maps.length === 0 && learningPaths.length === 0 && <p className="text-muted-foreground">Nothing yet — add a course or learning path above.</p>}
          </div>
        </>
      )}
    </Shell>
  );
}
