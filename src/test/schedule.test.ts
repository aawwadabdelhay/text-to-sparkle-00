import { describe, expect, it } from "vitest";
import { autoPlan, rollOver, sortTasks, type Task } from "@/lib/schedule";

const t = (id: string, date: string, extra: Partial<Task> = {}): Task => ({ id, mapId: "m", sectionId: "s", itemId: id, date, minutes: 30, ...extra });

describe("planner", () => {
  it("moves unfinished past lessons to today as priority", () => {
    const out = rollOver([t("a", "2026-10-24"), t("b", "2026-10-24")], "2026-10-25", (x) => x.id === "b");
    expect(out[0]).toMatchObject({ date: "2026-10-25", priority: true, rescheduledFrom: "2026-10-24" });
    expect(out[1]!.date).toBe("2026-10-24");
  });
  it("puts priority tasks first", () => {
    expect(sortTasks([t("a", "d", { start: "08:00" }), t("b", "d", { priority: true, start: "18:00" })])[0]!.id).toBe("b");
  });
  it("auto-plan keeps each day within the daily limit", () => {
    let i = 0;
    const c = [1, 2, 3, 4].map((n) => ({ mapId: "m", sectionId: "s", itemId: `i${n}`, minutes: 50 }));
    const out = autoPlan([], c, "2026-10-25", 120, () => `x${i++}`);
    expect(out.map((x) => x.date)).toEqual(["2026-10-25", "2026-10-25", "2026-10-26", "2026-10-26"]);
  });
});

import { endTime, overlaps, splitRemaining, shiftDay, focusMinutes, type DayZone } from "@/lib/schedule";
describe("time blocks & pomodoro", () => {
  const zones: DayZone[] = [{ id: "z", name: "Study", kind: "study", color: "primary", start: "18:00", end: "19:00", weekdays: [0,1,2,3,4,5,6] }];
  it("computes end time", () => expect(endTime("09:15", 45)).toBe("10:00"));
  it("detects overlapping blocks", () => {
    const o = overlaps([t("a", "d", { start: "09:00", minutes: 60 }), t("b", "d", { start: "09:30" }), t("c", "d", { start: "10:00" })]);
    expect([...o].sort()).toEqual(["a", "b"]);
  });
  it("auto-plan books inside study zones only", () => {
    let i = 0;
    const c = [1, 2, 3].map((n) => ({ mapId: "m", sectionId: "s", itemId: `i${n}`, minutes: 30 }));
    const out = autoPlan([], c, "2026-10-25", 240, () => `x${i++}`, 60, zones);
    expect(out.map((x) => `${x.date} ${x.start}`)).toEqual(["2026-10-25 18:00", "2026-10-25 18:30", "2026-10-26 18:00"]);
  });
  it("moves only remaining pomodoros", () => {
    const { kept, rest } = splitRemaining(t("a", "2026-10-25", { pomodoros: [{ label: "Watch", planned: 3, done: 1 }] }), "2026-10-26", 25, () => "r");
    expect(kept.pomodoros).toEqual([{ label: "Watch", planned: 1, done: 1 }]);
    expect(rest).toMatchObject({ date: "2026-10-26", minutes: 50, priority: true, pomodoros: [{ label: "Watch", planned: 2, done: 0 }] });
  });
  it("skip day shifts unfinished tasks from that day on", () => {
    const out = shiftDay([t("a", "2026-10-25"), t("b", "2026-10-26"), t("c", "2026-10-24")], "2026-10-25", () => false);
    expect(out.map((x) => x.date)).toEqual(["2026-10-26", "2026-10-27", "2026-10-24"]);
  });
  it("sums focus minutes in range", () => {
    expect(focusMinutes([{ id: "1", taskId: "a", itemId: "a", date: "2026-10-25", minutes: 25, label: "Watch" }, { id: "2", taskId: "a", itemId: "a", date: "2026-10-20", minutes: 25, label: "Watch" }], "2026-10-21", "2026-10-25")).toBe(25);
  });
});
