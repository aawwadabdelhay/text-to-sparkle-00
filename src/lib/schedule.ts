// Pure planner helpers (kept separate so they're easy to test).
export interface Pomo { label: string; planned: number; done: number }
export interface Task { id: string; mapId: string; sectionId: string; itemId: string; date: string; start?: string; minutes: number; priority?: boolean; rescheduledFrom?: string; pomodoros?: Pomo[]; kind?: "lesson" | "review" }
export type ZoneKind = "study" | "work" | "other";
export interface DayZone { id: string; name: string; color: "primary" | "secondary" | "accent" | "muted"; kind: ZoneKind; start: string; end: string; weekdays: number[] }
export interface FocusEntry { id: string; taskId: string; itemId: string; date: string; minutes: number; label: string }
export interface PomoSettings { focus: number; break: number; weeklyTarget: number }

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (date: string, n: number) => { const [y, m, d] = date.split("-").map(Number); return dayKey(new Date(y!, m! - 1, d! + n)); };
export const weekday = (date: string) => { const [y, m, d] = date.split("-").map(Number); return new Date(y!, m! - 1, d!).getDay(); };
export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return (h ?? 0) * 60 + (m ?? 0); };
export const toHHMM = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const endTime = (start: string, minutes: number) => toHHMM(Math.min(toMin(start) + minutes, 24 * 60 - 1));

/** Priority first, then by start time, then tasks without a time. */
export function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => Number(!!b.priority) - Number(!!a.priority) || (a.start ?? "99").localeCompare(b.start ?? "99"));
}

/** Ids of timed tasks on the same day whose blocks overlap. */
export function overlaps(tasks: Task[]): Set<string> {
  const out = new Set<string>();
  const timed = tasks.filter((t) => t.start);
  for (let i = 0; i < timed.length; i++) for (let j = i + 1; j < timed.length; j++) {
    const a = timed[i]!, b = timed[j]!;
    if (a.date !== b.date) continue;
    const as = toMin(a.start!), bs = toMin(b.start!);
    if (as < bs + b.minutes && bs < as + a.minutes) { out.add(a.id); out.add(b.id); }
  }
  return out;
}

export const zonesFor = (zones: DayZone[], date: string) => zones.filter((z) => z.weekdays.includes(weekday(date)));
export const zoneAt = (zones: DayZone[], date: string, hhmm: string) => { const m = toMin(hhmm); return zonesFor(zones, date).find((z) => m >= toMin(z.start) && m < toMin(z.end)); };

/** Free [start,end) minute ranges inside study zones on a date, minus timed tasks. */
export function freeStudySlots(zones: DayZone[], tasks: Task[], date: string): [number, number][] {
  let free: [number, number][] = zonesFor(zones, date).filter((z) => z.kind === "study").map((z) => [toMin(z.start), toMin(z.end)] as [number, number]).sort((a, b) => a[0] - b[0]);
  for (const t of tasks) {
    if (t.date !== date || !t.start) continue;
    const s = toMin(t.start), e = s + t.minutes;
    free = free.flatMap(([a, b]) => (e <= a || s >= b ? [[a, b]] : [[a, Math.min(s, b)], [Math.max(e, a), b]].filter(([x, y]) => y! > x!))) as [number, number][];
  }
  return free;
}
export function nextFreeStart(zones: DayZone[], tasks: Task[], date: string, minutes: number): string | null {
  const slot = freeStudySlots(zones, tasks, date).find(([a, b]) => b - a >= minutes);
  return slot ? toHHMM(slot[0]) : null;
}

/** Moves unfinished tasks dated before `today` onto `today`, flagged as priority. */
export function rollOver(tasks: Task[], today: string, isDone: (t: Task) => boolean): Task[] {
  return tasks.map((t) => (t.date < today && !isDone(t) ? { ...t, rescheduledFrom: t.rescheduledFrom ?? t.date, date: today, priority: true } : t));
}

/** Splits a partly done task: the done part stays, the remaining pomodoros become a new task on `date`. */
export function splitRemaining(task: Task, date: string, focus: number, mkId: () => string): { kept: Task; rest: Task | null } {
  const p = task.pomodoros ?? [];
  const done = p.reduce((a, x) => a + Math.min(x.done, x.planned), 0);
  const left = p.reduce((a, x) => a + Math.max(x.planned - x.done, 0), 0);
  if (!left) return { kept: task, rest: null };
  if (!done) return { kept: { ...task, rescheduledFrom: task.rescheduledFrom ?? task.date, date, start: undefined, priority: true }, rest: null };
  const kept: Task = { ...task, minutes: done * focus, pomodoros: p.filter((x) => x.done > 0).map((x) => ({ ...x, planned: Math.min(x.done, x.planned) })) };
  const rest: Task = { ...task, id: mkId(), date, start: undefined, priority: true, rescheduledFrom: task.date, minutes: left * focus, pomodoros: p.filter((x) => x.planned > x.done).map((x) => ({ label: x.label, planned: x.planned - x.done, done: 0 })) };
  return { kept, rest };
}

/** Sick / skip day: every unfinished task from `date` onwards moves one day later (times kept). */
export function shiftDay(tasks: Task[], date: string, isDone: (t: Task) => boolean): Task[] {
  return tasks.map((t) => (t.date >= date && !isDone(t) ? { ...t, date: addDays(t.date, 1), rescheduledFrom: t.rescheduledFrom ?? t.date } : t));
}

export const focusMinutes = (log: FocusEntry[], from: string, to: string) => log.filter((e) => e.date >= from && e.date <= to).reduce((a, e) => a + e.minutes, 0);

export interface Candidate { mapId: string; sectionId: string; itemId: string; minutes: number }
/** Fills days from `from` with candidates, never exceeding `daily` minutes per day (a single longer lesson gets its own day).
 *  When study zones exist, each task also gets a start time in the next free study slot. */
export function autoPlan(existing: Task[], candidates: Candidate[], from: string, daily: number, mkId: () => string, maxDays = 60, zones: DayZone[] = []): Task[] {
  const useZones = zones.some((z) => z.kind === "study");
  const used = new Map<string, number>();
  existing.forEach((t) => used.set(t.date, (used.get(t.date) ?? 0) + t.minutes));
  const planned = new Set(existing.map((t) => t.itemId));
  const all = [...existing];
  const out: Task[] = [];
  let day = from, n = 0;
  for (const c of candidates) {
    if (planned.has(c.itemId)) continue;
    const mins = c.minutes || 30;
    let start: string | null = null;
    while (n < maxDays) {
      const u = used.get(day) ?? 0;
      const fits = u + mins <= daily || (u === 0 && mins > daily);
      start = fits && useZones ? nextFreeStart(zones, all, day, mins) : null;
      if (fits && (!useZones || start)) break;
      day = addDays(day, 1); n++;
    }
    if (n >= maxDays) break;
    used.set(day, (used.get(day) ?? 0) + mins);
    const t: Task = { id: mkId(), ...c, minutes: mins, date: day, ...(start ? { start } : {}) };
    all.push(t); out.push(t);
  }
  return out;
}
