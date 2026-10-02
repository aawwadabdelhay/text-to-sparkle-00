import { useSyncExternalStore } from "react";

export type ItemType = "video" | "reading" | "quiz" | "assignment";
export interface Item { id: string; title: string; type: ItemType; minutes: number; done: boolean; doneAt?: string | undefined }
export interface Section { id: string; title: string; items: Item[]; x?: number; y?: number }
export interface Link { from: string; to: string }
export interface StudyMap { id: string; title: string; description: string; sections: Section[]; createdAt: string; links?: Link[] }
export const nodePos = (s: Section, i: number) => ({ x: s.x ?? 40 + i * 270, y: s.y ?? 60 + (i % 2) * 170 });
interface State { maps: StudyMap[]; studyDays: string[] }

const KEY = "ljt-state-v1";
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

const seed = (): State => ({
  studyDays: [],
  maps: [{
    id: uid(), title: "Full-Stack Web Dev Diploma", description: "From HTML basics to deployed apps.", createdAt: new Date().toISOString(),
    sections: [
      { id: uid(), title: "Week 1 — Foundations", items: [
        { id: uid(), title: "How the web works", type: "video", minutes: 25, done: false },
        { id: uid(), title: "HTML semantics reading", type: "reading", minutes: 40, done: false },
        { id: uid(), title: "Foundations quiz", type: "quiz", minutes: 15, done: false },
      ]},
      { id: uid(), title: "Week 2 — JavaScript", items: [
        { id: uid(), title: "Variables & functions", type: "video", minutes: 50, done: false },
        { id: uid(), title: "Build a todo list", type: "assignment", minutes: 120, done: false },
      ]},
    ],
  }],
});

let state: State = seed();
let loaded = false;
const listeners = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = JSON.parse(raw); } catch {}
}
function set(fn: (s: State) => State) {
  state = fn(state);
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}
const serverSnap = seed();
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

export const actions = {
  addMap: (title: string, description = "") => { const id = uid(); set((s) => ({ ...s, maps: [...s.maps, { id, title, description, sections: [], createdAt: new Date().toISOString() }] })); return id; },
  updateMap: (id: string, title: string, description: string) => set(onMap(id, (m) => ({ ...m, title, description }))),
  deleteMap: (id: string) => set((s) => ({ ...s, maps: s.maps.filter((m) => m.id !== id) })),
  addSection: (mid: string, title: string) => set(onMap(mid, (m) => ({ ...m, sections: [...m.sections, { id: uid(), title, items: [] }] }))),
  renameSection: (mid: string, sid: string, title: string) => set(onSection(mid, sid, (s) => ({ ...s, title }))),
  deleteSection: (mid: string, sid: string) => set(onMap(mid, (m) => ({ ...m, sections: m.sections.filter((s) => s.id !== sid) }))),
  moveSection: (mid: string, sid: string, dir: -1 | 1) => set(onMap(mid, (m) => {
    const arr = [...m.sections]; const i = arr.findIndex((s) => s.id === sid); const j = i + dir;
    if (j < 0 || j >= arr.length) return m; const t = arr[i]!; arr[i] = arr[j]!; arr[j] = t; return { ...m, sections: arr };
  })),
  addItem: (mid: string, sid: string, item: Omit<Item, "id" | "done">) => set(onSection(mid, sid, (s) => ({ ...s, items: [...s.items, { ...item, id: uid(), done: false }] }))),
  deleteItem: (mid: string, sid: string, iid: string) => set(onSection(mid, sid, (s) => ({ ...s, items: s.items.filter((i) => i.id !== iid) }))),
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
