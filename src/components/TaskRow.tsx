import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRightCircle, Flag, Play, Repeat, Settings2, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { startFocus } from "@/components/FocusTimer";
import { actions, fmt, localToday, taskDone, type Pomo, type StudyMap, type Task } from "@/lib/store";
import { addDays, endTime } from "@/lib/schedule";

const inp = "h-8 rounded-md border bg-background/60 px-2 text-xs outline-none focus:ring-2 focus:ring-ring";
const LABELS = ["Watch", "Apply / Simulate", "Review"];

export function TaskRow({ task, maps, overdue, clash }: { task: Task; maps: StudyMap[]; overdue?: boolean; clash?: boolean }) {
  const [edit, setEdit] = useState(false);
  const map = maps.find((m) => m.id === task.mapId);
  const sec = map?.sections.find((s) => s.id === task.sectionId);
  const item = sec?.items.find((i) => i.id === task.itemId);
  if (!map || !sec || !item) return null;
  const done = taskDone(maps, task);
  const pomos = task.pomodoros ?? [];
  const left = pomos.reduce((a, p) => a + Math.max(p.planned - p.done, 0), 0);
  const setP = (p: Pomo[]) => actions.setPomodoros(task.id, p);
  const tomorrow = addDays(localToday(), 1);
  return (
    <li className={`rounded-lg border bg-background/50 px-3 py-2 ${task.priority ? "border-secondary/60" : ""} ${overdue || clash ? "border-destructive/60" : ""}`}>
      <div className="flex items-center gap-3">
        {task.kind === "review" ? <Repeat size={16} className="text-accent" /> : <Checkbox checked={item.done} onCheckedChange={() => actions.toggleItem(map.id, sec.id, item.id)} aria-label="Mark complete" />}
        <div className="min-w-0 flex-1">
          <Link to="/maps/$id/$sid/items/$iid" params={{ id: map.id, sid: sec.id, iid: item.id }} className={`block truncate text-sm font-medium hover:text-primary ${done ? "line-through text-muted-foreground" : ""}`}>{task.kind === "review" ? "Review: " : ""}{item.title}</Link>
          <p className="truncate text-xs text-muted-foreground">
            <span className="text-primary">{task.start ? `${task.start} – ${endTime(task.start, task.minutes)}` : "Anytime"} · </span>{map.title} › {sec.title} · {fmt(task.minutes)}
            {task.priority && <span className="ml-2 inline-flex items-center gap-0.5 text-secondary"><Flag size={11} />Priority</span>}
            {overdue && <span className="ml-2 text-destructive">Overdue</span>}
            {clash && <span className="ml-2 text-destructive">Overlaps</span>}
          </p>
        </div>
        {!done && <button title="Start a Pomodoro" aria-label="Start a Pomodoro" onClick={() => startFocus(task.id, pomos.find((p) => p.done < p.planned)?.label ?? LABELS[0]!, item.title)} className="text-muted-foreground hover:text-primary"><Play size={17} /></button>}
        {!done && <button title={left ? "Move the remaining Pomodoros to tomorrow" : "Move to tomorrow as priority"} aria-label="Move to tomorrow" onClick={() => actions.moveRemaining(task.id, tomorrow)} className="text-muted-foreground hover:text-secondary"><ArrowRightCircle size={18} /></button>}
        <button aria-label="Edit time and Pomodoros" onClick={() => setEdit(!edit)} className="text-muted-foreground hover:text-foreground"><Settings2 size={16} /></button>
        <button aria-label="Remove from plan" onClick={() => actions.unscheduleItem(task.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
      </div>
      {pomos.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{pomos.map((p, i) => (
        <button key={i} onClick={() => startFocus(task.id, p.label, item.title)} title={`Start ${p.label} Pomodoro`} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-primary/20">
          <span>{p.label}</span>
          <span className="tracking-tighter">{Array.from({ length: p.planned }, (_, k) => <span key={k} className={k < p.done ? "text-primary" : "text-muted-foreground/50"}>●</span>)}</span>
        </button>))}</div>}
      {edit && <div className="mt-3 space-y-3 border-t pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1">Start <input type="time" step={900} className={inp} value={task.start ?? ""} onChange={(e) => actions.updateTask(task.id, { start: e.target.value || undefined })} /></label>
          <label className="flex items-center gap-1">Length (min) <input type="number" min={15} step={15} className={`${inp} w-20`} value={task.minutes} onChange={(e) => actions.updateTask(task.id, { minutes: Math.max(5, Number(e.target.value) || 0) })} /></label>
          <label className="flex items-center gap-1">Day <input type="date" className={inp} value={task.date} onChange={(e) => e.target.value && actions.moveTask(task.id, e.target.value)} /></label>
          <label className="flex items-center gap-1">Move remaining to <input type="date" className={inp} onChange={(e) => e.target.value && actions.moveRemaining(task.id, e.target.value)} /></label>
        </div>
        <div>
          <p className="mb-1 text-muted-foreground">Pomodoro plan</p>
          <div className="space-y-1.5">{pomos.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={`${inp} flex-1`} value={p.label} onChange={(e) => setP(pomos.map((x, k) => k === i ? { ...x, label: e.target.value } : x))} />
              <input type="number" min={1} className={`${inp} w-16`} value={p.planned} onChange={(e) => setP(pomos.map((x, k) => k === i ? { ...x, planned: Math.max(1, Number(e.target.value) || 1) } : x))} />
              <span className="w-12 text-muted-foreground">{p.done} done</span>
              <button aria-label="Remove" onClick={() => setP(pomos.filter((_, k) => k !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
            </div>))}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LABELS.map((l) => <Button key={l} size="sm" variant="outline" onClick={() => setP([...pomos, { label: l, planned: 1, done: 0 }])}>+ {l}</Button>)}
            <Button size="sm" variant="secondary" onClick={() => actions.addReview(task.id, tomorrow)}>+1 Review Pomodoro tomorrow</Button>
          </div>
        </div>
      </div>}
    </li>
  );
}
