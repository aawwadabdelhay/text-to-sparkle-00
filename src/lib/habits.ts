import { useSyncExternalStore } from "react";

export interface Habit { id: string; name: string; color: string }
/** key `YYYY-MM:habitId` -> day -> 1 (done) | 0 (missed) */
export type Checkins = Record<string, Record<number, 0 | 1>>;
interface HabitState { habits: Habit[]; checkins: Checkins }

const KEY = "ljt-habits-v1";
export const PALETTE = ["primary", "secondary", "accent", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
const DEFAULTS: Habit[] = [
  { id: "study", name: "Study session", color: "primary" },
  { id: "reading", name: "Reading", color: "secondary" },
  { id: "review", name: "Review notes", color: "accent" },
];

const normalize = (v: Partial<HabitState>): HabitState => {
  const checkins: Checkins = {};
  for (const [k, days] of Object.entries(v.checkins ?? {})) {
    const m: Record<number, 0 | 1> = {};
    for (const [d, x] of Object.entries((days ?? {}) as Record<string, unknown>)) m[Number(d)] = x === true || x === 1 ? 1 : 0;
    checkins[k] = m;
  }
  return { habits: Array.isArray(v.habits) ? v.habits : DEFAULTS, checkins };
};

const initial: HabitState = { habits: DEFAULTS, checkins: {} };
let state = initial; let loaded = false;
const listeners = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return; loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = normalize(JSON.parse(raw)); } catch {}
}
function set(fn: (s: HabitState) => HabitState) {
  state = fn(state); localStorage.setItem(KEY, JSON.stringify(state)); listeners.forEach((l) => l());
}
export function useHabits() {
  return useSyncExternalStore((l) => { load(); listeners.add(l); l(); return () => listeners.delete(l); }, () => { load(); return state; }, () => initial);
}

export const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;
export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
export const stateOf = (c: Checkins, ym: string, id: string, d: number): 1 | 0 | undefined => c[`${ym}:${id}`]?.[d];
/** Cycles untouched -> done -> missed -> untouched */
export const nextState = (cur: 1 | 0 | undefined): 1 | 0 | undefined => (cur === undefined ? 1 : cur === 1 ? 0 : undefined);

export const habitActions = {
  toggle: (ym: string, id: string, d: number) => set((s) => {
    const k = `${ym}:${id}`; const month = { ...s.checkins[k] }; const n = nextState(month[d]);
    if (n === undefined) delete month[d]; else month[d] = n;
    return { ...s, checkins: { ...s.checkins, [k]: month } };
  }),
  add: (name: string) => set((s) => ({ ...s, habits: [...s.habits, { id: Math.random().toString(36).slice(2, 10), name, color: PALETTE[s.habits.length % PALETTE.length]! }] })),
  update: (id: string, patch: Partial<Habit>) => set((s) => ({ ...s, habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
  remove: (id: string) => set((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) })),
  move: (id: string, dir: -1 | 1) => set((s) => {
    const i = s.habits.findIndex((h) => h.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= s.habits.length) return s;
    const hs = [...s.habits]; [hs[i], hs[j]] = [hs[j]!, hs[i]!]; return { ...s, habits: hs };
  }),
  clearMonth: (ym: string) => set((s) => ({ ...s, checkins: Object.fromEntries(Object.entries(s.checkins).filter(([k]) => !k.startsWith(ym))) })),
};
