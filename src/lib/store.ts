import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { type DayZone, type FocusEntry, type PomoSettings, type Pomo, type Task, addDays, autoPlan, dayKey, rollOver, shiftDay, splitRemaining } from "./schedule";
export type { Task, DayZone, FocusEntry, PomoSettings, Pomo } from "./schedule";

export type ItemType = "video" | "reading" | "quiz" | "assignment" | "note";
export interface Material { id: string; title: string; url: string }
export interface QuizQuestion { id: string; question: string; answer: string }
export interface Item { id: string; title: string; type: ItemType; minutes: number; done: boolean; doneAt?: string | undefined; materials?: Material[]; quizzes?: QuizQuestion[]; notes?: string; blocks?: Block[]; url?: string | undefined }
export type BlockType = "text" | "h1" | "h2" | "todo" | "bullet" | "quote" | "divider" | "image" | "file" | "embed";
export interface Block { id: string; type: BlockType; text?: string; richText?: import("@tiptap/core").JSONContent | undefined; checked?: boolean; fileId?: string; fileName?: string; mime?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean; color?: string; font?: string; fontSize?: string | undefined; align?: "left" | "center" | "right" | "justify" | undefined; dir?: "ltr" | "rtl" | "auto" | undefined }
export interface Section { id: string; title: string; items: Item[]; x?: number; y?: number }
export interface Link { from: string; to: string }
export interface StudyMap { id: string; title: string; description: string; sections: Section[]; createdAt: string; links?: Link[]; pathId?: string }
export interface LearningPath { id: string; title: string }
export const nodePos = (s: Section, i: number) => ({ x: s.x ?? 40 + i * 270, y: s.y ?? 60 + (i % 2) * 170 });
interface State { maps: StudyMap[]; studyDays: string[]; learningPaths: LearningPath[]; schedule: Task[]; dayZones: DayZone[]; focusLog: FocusEntry[]; pomodoro: PomoSettings; wig?: Wig | undefined; updatedAt: number }
export interface Wig { pathId: string; title: string; deadline: string; dailyPomos: number; weeklyWinDays: number }
export const defaultPomo: PomoSettings = { focus: 25, break: 5, weeklyTarget: 20 };

const KEY = "ljt-state-v1";
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

const initialState: State = {
  updatedAt: 0,
  schedule: [],
  dayZones: [],
  focusLog: [],
  pomodoro: defaultPomo,
  studyDays: [],
  learningPaths: [{ id: "path-web", title: "Web development" }],
  maps: [{
    id: "map-full-stack", title: "Full-Stack Web Dev Course", description: "From HTML basics to deployed apps.", createdAt: "2026-01-01T00:00:00.000Z", pathId: "path-web",
    sections: [
      { id: "section-foundations", title: "Week 1 — Foundations", items: [
        { id: "item-web", title: "How the web works", type: "video", minutes: 25, done: false },
        { id: "item-html", title: "HTML semantics reading", type: "reading", minutes: 40, done: false },
        { id: "item-quiz", title: "Foundations quiz", type: "quiz", minutes: 15, done: false },
      ]},
      { id: "section-javascript", title: "Week 2 — JavaScript", items: [
        { id: "item-functions", title: "Variables & functions", type: "video", minutes: 50, done: false },
        { id: "item-todo", title: "Build a todo list", type: "assignment", minutes: 120, done: false },
      ]},
    ],
  }],
};

const normalize = (value: Partial<State>): State => ({
  maps: Array.isArray(value.maps)
    ? value.maps.map((m) => (m.title === "Full-Stack Web Dev Diploma" ? { ...m, title: "Full-Stack Web Dev Course" } : m))
    : initialState.maps,
  studyDays: Array.isArray(value.studyDays) ? value.studyDays : [],
  learningPaths: Array.isArray(value.learningPaths) ? value.learningPaths : [],
  schedule: Array.isArray(value.schedule) ? value.schedule : [],
  dayZones: Array.isArray(value.dayZones) ? value.dayZones : [],
  focusLog: Array.isArray(value.focusLog) ? value.focusLog : [],
  pomodoro: { ...defaultPomo, ...(value.pomodoro ?? {}) },
  wig: value.wig && typeof value.wig.pathId === "string" ? value.wig : undefined,
  updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
});

let state: State = initialState;
let loaded = false;
const listeners = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = normalize(JSON.parse(raw) as Partial<State>); } catch {}
}
const persistListeners = new Set<() => void>();
export const onPersist = (cb: () => void) => { persistListeners.add(cb); return () => { persistListeners.delete(cb); }; };
export const getState = () => { load(); return state; };
// Ctrl+Z history: snapshots of earlier states; rapid edits (typing) merge into one step.
const past: State[] = [];
let future: State[] = [];
let lastPush = 0;
function set(fn: (s: State) => State, touch = true, record = true) {
  const prev = state;
  state = fn(state);
  if (touch && record && state !== prev) {
    const now = Date.now();
    if (now - lastPush > 800) { past.push(prev); if (past.length > 100) past.shift(); }
    lastPush = now;
    future = [];
  }
  if (touch) state = { ...state, updatedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
  if (touch) persistListeners.forEach((l) => l());
}
export function undo() {
  const prev = past.pop();
  if (!prev) return false;
  future.push(state); lastPush = 0;
  set(() => prev, true, false);
  return true;
}
export function redo() {
  const next = future.pop();
  if (!next) return false;
  past.push(state); lastPush = 0;
  set(() => next, true, false);
  return true;
}
/** Replaces local data with a copy pulled from the account (no re-push loop). */
export function replaceState(next: unknown) {
  set(() => normalize(next as Partial<State>), false);
}
const serverSnap = initialState;
export function useStore() {
  return useSyncExternalStore(
    (l) => { load(); listeners.add(l); l(); return () => listeners.delete(l); },
    () => { load(); return state; },
    () => serverSnap,
  );
}

const mapMaps = (fn: (m: StudyMap) => StudyMap) => (s: State) => ({ ...s, maps: s.maps.map(fn) });
const onMap = (id: string, fn: (m: StudyMap) => StudyMap) => mapMaps((m) => (m.id === id ? fn(m) : m));
const onSection = (mid: string, sid: string, fn: (s: Section) => Section) =>
  onMap(mid, (m) => ({ ...m, sections: m.sections.map((s) => (s.id === sid ? fn(s) : s)) }));
const onItem = (mid: string, sid: string, iid: string, fn: (i: Item) => Item) =>
  onSection(mid, sid, (s) => ({ ...s, items: s.items.map((i) => i.id === iid ? fn(i) : i) }));
function reorder<T extends { id: string }>(items: T[], sourceId: string, targetId: string) {
  const from = items.findIndex((item) => item.id === sourceId);
  const to = items.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (!moved) return items;
  next.splice(to, 0, moved);
  return next;
}

function shift<T extends { id: string }>(arr: T[], id: string, dir: -1 | 1, same: (a: T, b: T) => boolean = () => true) {
  const i = arr.findIndex((x) => x.id === id); const cur = arr[i]; if (!cur) return arr;
  let j = i + dir; while (j >= 0 && j < arr.length && !same(cur, arr[j] as T)) j += dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr]; next[i] = arr[j] as T; next[j] = cur; return next;
}

/** Imported playlists often list newest first (e.g. Lecture 11 … Lecture 01); flip them so lecture 1 comes first. */
export function oldestFirst<T extends { title: string }>(items: T[]): T[] {
  const nums = items.map((i) => { const m = i.title.match(/(\d+)(?!.*\d)/); return m ? Number(m[1]) : NaN; }).filter((n) => !Number.isNaN(n));
  if (nums.length < 2) return items;
  let down = 0, up = 0;
  for (let k = 1; k < nums.length; k++) { if (nums[k]! < nums[k - 1]!) down++; else if (nums[k]! > nums[k - 1]!) up++; }
  return down > up ? [...items].reverse() : items;
}

const findItem = (s: State, t: { mapId: string; sectionId: string; itemId: string }) =>
  s.maps.find((m) => m.id === t.mapId)?.sections.find((x) => x.id === t.sectionId)?.items.find((i) => i.id === t.itemId);
export const localToday = () => dayKey(new Date());
/** A task is done when its lesson is done, or (for review tasks) when all its pomodoros are done. */
export function taskDone(maps: StudyMap[], t: Task) {
  if (t.kind === "review") return !!t.pomodoros?.length && t.pomodoros.every((p) => p.done >= p.planned);
  return !!maps.find((m) => m.id === t.mapId)?.sections.find((x) => x.id === t.sectionId)?.items.find((i) => i.id === t.itemId)?.done;
}

export const actions = {
  scheduleItem: (t: Omit<Task, "id">) => set((s) => ({ ...s, schedule: [...s.schedule, { ...t, id: uid() }] })),
  unscheduleItem: (id: string) => set((s) => ({ ...s, schedule: s.schedule.filter((t) => t.id !== id) })),
  updateTask: (id: string, patch: Partial<Task>) => set((s) => ({ ...s, schedule: s.schedule.map((t) => t.id === id ? { ...t, ...patch } : t) })),
  moveTask: (id: string, date: string, priority = false) => set((s) => ({ ...s, schedule: s.schedule.map((t) => t.id === id ? { ...t, rescheduledFrom: t.rescheduledFrom ?? t.date, date, priority } : t) })),
  moveToTomorrow: (id: string) => actions.moveTask(id, addDays(localToday(), 1), true),
  rollOverOverdue: () => set((s) => ({ ...s, schedule: rollOver(s.schedule, localToday(), (t) => taskDone(s.maps, t)) })),
  autoPlan: (daily: number, from = localToday()) => set((s) => {
    const cands = s.maps.flatMap((m) => m.sections.flatMap((sec) => sec.items.filter((i) => !i.done).map((i) => ({ mapId: m.id, sectionId: sec.id, itemId: i.id, minutes: i.minutes }))));
    const existing = s.schedule.filter((t) => t.date >= from);
    return { ...s, schedule: [...s.schedule, ...autoPlan(existing, cands, from, daily, uid, 60, s.dayZones)] };
  }),
  /** Moves only the unfinished pomodoros of a task to another day. */
  moveRemaining: (id: string, date: string) => set((s) => {
    const t = s.schedule.find((x) => x.id === id); if (!t) return s;
    if (!t.pomodoros?.length) return { ...s, schedule: s.schedule.map((x) => x.id === id ? { ...x, rescheduledFrom: x.rescheduledFrom ?? x.date, date, start: undefined, priority: true } : x) };
    const { kept, rest } = splitRemaining(t, date, s.pomodoro.focus, uid);
    return { ...s, schedule: [...s.schedule.map((x) => (x.id === id ? kept : x)), ...(rest ? [rest] : [])] };
  }),
  skipDay: (date: string) => set((s) => ({ ...s, schedule: shiftDay(s.schedule, date, (t) => taskDone(s.maps, t)) })),
  setPomodoros: (id: string, pomodoros: Pomo[]) => set((s) => ({ ...s, schedule: s.schedule.map((t) => t.id === id ? { ...t, pomodoros } : t) })),
  addReview: (taskId: string, date: string, count = 1) => set((s) => {
    const t = s.schedule.find((x) => x.id === taskId); if (!t) return s;
    const r: Task = { id: uid(), mapId: t.mapId, sectionId: t.sectionId, itemId: t.itemId, date, minutes: count * s.pomodoro.focus, kind: "review", pomodoros: [{ label: "Review", planned: count, done: 0 }] };
    return { ...s, schedule: [...s.schedule, r] };
  }),
  logFocus: (taskId: string, label: string, minutes: number) => set((s) => {
    const t = s.schedule.find((x) => x.id === taskId);
    const entry: FocusEntry = { id: uid(), taskId, itemId: t?.itemId ?? "", date: localToday(), minutes, label };
    const schedule = s.schedule.map((x) => {
      if (x.id !== taskId) return x;
      const p = [...(x.pomodoros ?? [])];
      const i = p.findIndex((y) => y.label === label && y.done < y.planned);
      const j = i >= 0 ? i : p.findIndex((y) => y.label === label);
      if (j >= 0) p[j] = { ...p[j]!, done: p[j]!.done + 1 }; else p.push({ label, planned: 1, done: 1 });
      return { ...x, pomodoros: p };
    });
    return { ...s, schedule, focusLog: [...s.focusLog, entry] };
  }),
  setPomoSettings: (patch: Partial<PomoSettings>) => set((s) => ({ ...s, pomodoro: { ...s.pomodoro, ...patch } })),
  setWig: (wig: Wig | undefined) => set((s) => ({ ...s, wig })),
  addZone: (z: Omit<DayZone, "id">) => set((s) => ({ ...s, dayZones: [...s.dayZones, { ...z, id: uid() }] })),
  updateZone: (id: string, patch: Partial<DayZone>) => set((s) => ({ ...s, dayZones: s.dayZones.map((z) => z.id === id ? { ...z, ...patch } : z) })),
  removeZone: (id: string) => set((s) => ({ ...s, dayZones: s.dayZones.filter((z) => z.id !== id) })),
  moveMap: (id: string, dir: -1 | 1) => set((s) => ({ ...s, maps: shift(s.maps, id, dir, (a, b) => a.pathId === b.pathId) })),
  placeMap: (id: string, pathId?: string, beforeId?: string) => set((s) => {
    if (id === beforeId) return s;
    const cur = s.maps.find((m) => m.id === id); if (!cur) return s;
    const { pathId: _p, ...rest } = cur;
    const moved: StudyMap = pathId ? { ...rest, pathId } : rest;
    const others = s.maps.filter((m) => m.id !== id);
    const at = beforeId ? others.findIndex((m) => m.id === beforeId) : -1;
    if (at < 0) others.push(moved); else others.splice(at, 0, moved);
    return { ...s, maps: others };
  }),
  movePath: (id: string, dir: -1 | 1) => set((s) => ({ ...s, learningPaths: shift(s.learningPaths, id, dir) })),
  renameLearningPath: (id: string, title: string) => set((s) => ({ ...s, learningPaths: s.learningPaths.map((p) => p.id === id ? { ...p, title } : p) })),
  moveItem: (mid: string, sid: string, iid: string, dir: -1 | 1) => set(onSection(mid, sid, (s) => ({ ...s, items: shift(s.items, iid, dir) }))),
  sortItems: (mid: string, sid: string, mode: "asc" | "desc" | "reverse") => set(onSection(mid, sid, (s) => {
    if (mode === "reverse") return { ...s, items: [...s.items].reverse() };
    const items = [...s.items].sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }));
    return { ...s, items: mode === "desc" ? items.reverse() : items };
  })),
  setBlocks: (mid: string, sid: string, iid: string, blocks: Block[]) => set(onItem(mid, sid, iid, (i) => ({ ...i, blocks }))),
  setNotes: (mid: string, sid: string, iid: string, notes: string) => set(onItem(mid, sid, iid, (i) => ({ ...i, notes }))),
  addMap: (title: string, description = "") => { const id = uid(); set((s) => ({ ...s, maps: [...s.maps, { id, title, description, sections: [], createdAt: new Date().toISOString() }] })); return id; },
  importCourses: (data: { kind: "course" | "path"; title: string; courses: { title: string; description?: string | undefined; sections: { title: string; items: { title: string; type?: string | undefined; minutes?: number | undefined; url?: string | undefined }[] }[] }[] }) => set((s) => {
    const types: ItemType[] = ["video", "reading", "quiz", "assignment", "note"];
    const isPath = data.kind === "path" && data.courses.length > 1 && data.courses.some((c) => c.sections.length > 1);
    const pathId = isPath ? uid() : undefined;
    const courses = isPath ? data.courses : [{
      title: data.title, description: data.courses[0]?.description,
      sections: data.courses.flatMap((c) => c.sections.length === 1 && data.courses.length > 1 ? [{ ...c.sections[0]!, title: c.title }] : c.sections),
    }];
    const maps: StudyMap[] = courses.map((c) => ({
      id: uid(), title: c.title, description: c.description ?? "", createdAt: new Date().toISOString(), ...(pathId ? { pathId } : {}),
      sections: c.sections.map((sec) => ({ id: uid(), title: sec.title, items: oldestFirst(sec.items).map((it) => ({
        id: uid(), title: it.title, done: false, type: types.includes(it.type as ItemType) ? (it.type as ItemType) : "video", minutes: Math.max(0, Math.round(it.minutes ?? 0)), ...(it.url ? { url: it.url } : {}),
      })) })),
    }));
    return { ...s, maps: [...s.maps, ...maps], learningPaths: pathId ? [...s.learningPaths, { id: pathId, title: data.title }] : s.learningPaths };
  }),
  updateMap: (id: string, title: string, description: string) => set(onMap(id, (m) => ({ ...m, title, description }))),
  deleteMap: (id: string) => set((s) => ({ ...s, maps: s.maps.filter((m) => m.id !== id) })),
  addLearningPath: (title: string) => { const id = uid(); set((s) => ({ ...s, learningPaths: [...s.learningPaths, { id, title }] })); return id; },
  deleteLearningPath: (id: string) => set((s) => ({ ...s, learningPaths: s.learningPaths.filter((p) => p.id !== id), maps: s.maps.map((m) => {
    if (m.pathId !== id) return m;
    const { pathId: _removed, ...withoutPath } = m;
    return withoutPath;
  }) })),
  assignMapToPath: (mapId: string, pathId?: string) => set((s) => ({ ...s, maps: s.maps.map((m) => {
    if (m.id !== mapId) return m;
    if (pathId) return { ...m, pathId };
    const { pathId: _removed, ...withoutPath } = m;
    return withoutPath;
  }) })),
  groupMaps: (sourceId: string, targetId: string) => set((s) => {
    if (sourceId === targetId) return s;
    const target = s.maps.find((m) => m.id === targetId);
    if (!target) return s;
    const existingPath = target.pathId;
    const pathId = existingPath ?? uid();
    const learningPaths = existingPath ? s.learningPaths : [...s.learningPaths, { id: pathId, title: `${target.title} path` }];
    return { ...s, learningPaths, maps: s.maps.map((m) => m.id === sourceId || m.id === targetId ? { ...m, pathId } : m) };
  }),
  addSection: (mid: string, title: string) => set(onMap(mid, (m) => ({ ...m, sections: [...m.sections, { id: uid(), title, items: [] }] }))),
  renameSection: (mid: string, sid: string, title: string) => set(onSection(mid, sid, (s) => ({ ...s, title }))),
  deleteSection: (mid: string, sid: string) => set(onMap(mid, (m) => ({ ...m, sections: m.sections.filter((s) => s.id !== sid) }))),
  moveSection: (mid: string, sid: string, dir: -1 | 1) => set(onMap(mid, (m) => {
    const arr = [...m.sections]; const i = arr.findIndex((s) => s.id === sid); const j = i + dir;
    if (j < 0 || j >= arr.length) return m; const current = arr[i]; const next = arr[j]; if (!current || !next) return m; arr[i] = next; arr[j] = current; return { ...m, sections: arr };
  })),
  reorderSection: (mid: string, sourceId: string, targetId: string) => set(onMap(mid, (m) => ({ ...m, sections: reorder(m.sections, sourceId, targetId) }))),
  addItem: (mid: string, sid: string, item: Omit<Item, "id" | "done">) => set(onSection(mid, sid, (s) => ({ ...s, items: [...s.items, { ...item, id: uid(), done: false }] }))),
  deleteItem: (mid: string, sid: string, iid: string) => set(onSection(mid, sid, (s) => ({ ...s, items: s.items.filter((i) => i.id !== iid) }))),
  restoreItem: (mid: string, sid: string, item: Item, index: number) => set(onSection(mid, sid, (s) => { if (s.items.some((i) => i.id === item.id)) return s; const items = [...s.items]; items.splice(Math.min(index, items.length), 0, item); return { ...s, items }; })),
  restoreSection: (mid: string, section: Section, index: number) => set(onMap(mid, (m) => { if (m.sections.some((x) => x.id === section.id)) return m; const sections = [...m.sections]; sections.splice(Math.min(index, sections.length), 0, section); return { ...m, sections }; })),
  reorderItem: (mid: string, sid: string, sourceId: string, targetId: string) => set(onSection(mid, sid, (s) => ({ ...s, items: reorder(s.items, sourceId, targetId) }))),
  setItemUrl: (mid: string, sid: string, iid: string, url: string) => set(onItem(mid, sid, iid, (i) => ({ ...i, url: url.trim() || undefined }))),
  addMaterial: (mid: string, sid: string, iid: string, title: string, url: string) => set(onItem(mid, sid, iid, (i) => ({ ...i, materials: [...(i.materials ?? []), { id: uid(), title, url }] }))),
  deleteMaterial: (mid: string, sid: string, iid: string, materialId: string) => set(onItem(mid, sid, iid, (i) => ({ ...i, materials: (i.materials ?? []).filter((x) => x.id !== materialId) }))),
  addQuiz: (mid: string, sid: string, iid: string, question: string, answer: string) => set(onItem(mid, sid, iid, (i) => ({ ...i, quizzes: [...(i.quizzes ?? []), { id: uid(), question, answer }] }))),
  deleteQuiz: (mid: string, sid: string, iid: string, quizId: string) => set(onItem(mid, sid, iid, (i) => ({ ...i, quizzes: (i.quizzes ?? []).filter((x) => x.id !== quizId) }))),
  toggleItem: (mid: string, sid: string, iid: string) => set((st) => {
    let checked = false;
    const next = onSection(mid, sid, (s) => ({ ...s, items: s.items.map((i) => {
      if (i.id !== iid) return i; checked = !i.done; return { ...i, done: !i.done, doneAt: !i.done ? new Date().toISOString() : undefined };
    }) }))(st);
    const d = today();
    return checked && !next.studyDays.includes(d) ? { ...next, studyDays: [...next.studyDays, d] } : next;
  }),
  moveNode: (mid: string, sid: string, x: number, y: number) => set(onSection(mid, sid, (s) => ({ ...s, x, y }))),
  toggleLink: (mid: string, from: string, to: string) => set(onMap(mid, (m) => {
    if (from === to) return m;
    const links = m.links ?? [];
    const has = links.some((l) => (l.from === from && l.to === to) || (l.from === to && l.to === from));
    return { ...m, links: has ? links.filter((l) => !((l.from === from && l.to === to) || (l.from === to && l.to === from))) : [...links, { from, to }] };
  })),
};

export function stats(items: Item[]) {
  const total = items.length, done = items.filter((i) => i.done).length;
  const totalMin = items.reduce((a, i) => a + i.minutes, 0);
  const doneMin = items.filter((i) => i.done).reduce((a, i) => a + i.minutes, 0);
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0, totalMin, doneMin, leftMin: totalMin - doneMin };
}
export const mapItems = (m: StudyMap) => m.sections.flatMap((s) => s.items);

export function streak(days: string[]) {
  const set = new Set(days); let n = 0; const d = new Date();
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export const fmt = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`);

// Delete with a short "Undo" window so accidental deletions never lose data.
export function deleteItemUndoable(mid: string, sid: string, iid: string) {
  const sec = state.maps.find((m) => m.id === mid)?.sections.find((x) => x.id === sid);
  const index = sec?.items.findIndex((i) => i.id === iid) ?? -1; const item = sec?.items[index];
  if (!item) return;
  actions.deleteItem(mid, sid, iid);
  toast(`Deleted “${item.title}”`, { duration: 10000, action: { label: "Undo", onClick: () => actions.restoreItem(mid, sid, item, index) } });
}
export function deleteSectionUndoable(mid: string, sid: string) {
  const m = state.maps.find((x) => x.id === mid); const index = m?.sections.findIndex((x) => x.id === sid) ?? -1; const section = m?.sections[index];
  if (!section) return;
  actions.deleteSection(mid, sid);
  toast(`Deleted section “${section.title}”`, { duration: 10000, action: { label: "Undo", onClick: () => actions.restoreSection(mid, section, index) } });
}
