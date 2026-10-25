// Pure planner helpers (kept separate so they're easy to test).
export interface Task { id: string; mapId: string; sectionId: string; itemId: string; date: string; start?: string; minutes: number; priority?: boolean; rescheduledFrom?: string }

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (date: string, n: number) => { const [y, m, d] = date.split("-").map(Number); return dayKey(new Date(y!, m! - 1, d! + n)); };

/** Priority first, then by start time, then tasks without a time. */
export function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => Number(!!b.priority) - Number(!!a.priority) || (a.start ?? "99").localeCompare(b.start ?? "99"));
}

/** Moves unfinished tasks dated before `today` onto `today`, flagged as priority. */
export function rollOver(tasks: Task[], today: string, isDone: (t: Task) => boolean): Task[] {
  return tasks.map((t) => (t.date < today && !isDone(t) ? { ...t, rescheduledFrom: t.rescheduledFrom ?? t.date, date: today, priority: true } : t));
}

export interface Candidate { mapId: string; sectionId: string; itemId: string; minutes: number }
/** Fills days from `from` with candidates, never exceeding `daily` minutes per day (a single longer lesson gets its own day). */
export function autoPlan(existing: Task[], candidates: Candidate[], from: string, daily: number, mkId: () => string, maxDays = 60): Task[] {
  const used = new Map<string, number>();
  existing.forEach((t) => used.set(t.date, (used.get(t.date) ?? 0) + t.minutes));
  const planned = new Set(existing.map((t) => t.itemId));
  const out: Task[] = [];
  let day = from, n = 0;
  for (const c of candidates) {
    if (planned.has(c.itemId)) continue;
    const mins = c.minutes || 30;
    while (n < maxDays) {
      const u = used.get(day) ?? 0;
      if (u + mins <= daily || (u === 0 && mins > daily)) break;
      day = addDays(day, 1); n++;
    }
    if (n >= maxDays) break;
    used.set(day, (used.get(day) ?? 0) + mins);
    out.push({ id: mkId(), ...c, minutes: mins, date: day });
  }
  return out;
}
