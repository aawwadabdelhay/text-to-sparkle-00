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
