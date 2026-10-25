import { Link } from "@tanstack/react-router";
import { ArrowRightCircle, Flag, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { actions, fmt, type StudyMap, type Task } from "@/lib/store";

export function TaskRow({ task, maps, overdue }: { task: Task; maps: StudyMap[]; overdue?: boolean }) {
  const map = maps.find((m) => m.id === task.mapId);
  const sec = map?.sections.find((s) => s.id === task.sectionId);
  const item = sec?.items.find((i) => i.id === task.itemId);
  if (!map || !sec || !item) return null;
  return (
    <li className={`flex items-center gap-3 rounded-lg border bg-background/50 px-3 py-2 ${task.priority ? "border-secondary/60" : ""} ${overdue ? "border-destructive/60" : ""}`}>
      <Checkbox checked={item.done} onCheckedChange={() => actions.toggleItem(map.id, sec.id, item.id)} aria-label="Mark complete" />
      <div className="min-w-0 flex-1">
        <Link to="/maps/$id/$sid/items/$iid" params={{ id: map.id, sid: sec.id, iid: item.id }} className={`block truncate text-sm font-medium hover:text-primary ${item.done ? "line-through text-muted-foreground" : ""}`}>{item.title}</Link>
        <p className="truncate text-xs text-muted-foreground">
          {task.start && <span className="text-primary">{task.start} · </span>}{map.title} › {sec.title} · {item.type} · {fmt(task.minutes)}
          {task.priority && <span className="ml-2 inline-flex items-center gap-0.5 text-secondary"><Flag size={11} />Priority</span>}
          {overdue && <span className="ml-2 text-destructive">Overdue</span>}
        </p>
      </div>
      {!item.done && <button title="Move to tomorrow as priority" aria-label="Move to tomorrow" onClick={() => actions.moveToTomorrow(task.id)} className="text-muted-foreground hover:text-secondary"><ArrowRightCircle size={18} /></button>}
      <input type="date" aria-label="Pick another day" value={task.date} onChange={(e) => e.target.value && actions.moveTask(task.id, e.target.value)} className="w-8 cursor-pointer bg-transparent text-xs text-muted-foreground [&::-webkit-datetime-edit]:hidden" />
      <button aria-label="Remove from plan" onClick={() => actions.unscheduleItem(task.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
    </li>
  );
}
