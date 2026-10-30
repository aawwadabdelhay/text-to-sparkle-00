// Pure "small goal" rules (4DX): a day is won when every lesson planned for it is done,
// OR when the daily Pomodoro target is reached — whichever comes first.
import { addDays, weekday, type FocusEntry } from "./schedule";

export interface DayInput { planned: number; plannedDone: number; pomos: number; dailyPomos: number }
export const dayWon = (d: DayInput) => (d.planned > 0 && d.plannedDone >= d.planned) || (d.dailyPomos > 0 && d.pomos >= d.dailyPomos);

export const pomosOn = (log: FocusEntry[], date: string, focus: number) =>
  Math.floor(log.filter((e) => e.date === date).reduce((a, e) => a + e.minutes, 0) / Math.max(1, focus));

/** Consecutive won days ending today; if today isn't won yet, the streak from yesterday still counts. */
export function streak(today: string, won: (date: string) => boolean, max = 365) {
  let d = won(today) ? today : addDays(today, -1), n = 0;
  while (n < max && won(d)) { n++; d = addDays(d, -1); }
  return n;
}

export const weekStart = (date: string) => addDays(date, -((weekday(date) + 6) % 7)); // Monday
export function weekWins(today: string, won: (date: string) => boolean) {
  const start = weekStart(today);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter((d) => d <= today && won(d)).length;
}
