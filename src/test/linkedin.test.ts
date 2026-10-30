import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { cleanLinkedinUrl, parseDuration, parseLinkedinCourse } from "@/lib/linkedin";

describe("linkedin import", () => {
  it("unwraps share-login links to the clean course page", () => {
    const share = "https://www.linkedin.com/learning-login/share?forceAccount=false&redirect=https%3A%2F%2Fwww.linkedin.com%2Flearning%2Flearning-word-desktop-microsoft-365%3Ftrk%3Dshare_ent_url%26shareId%3DxjmthzaMQEyuTB225gPevA%253D%253D";
    expect(cleanLinkedinUrl(share)).toBe("https://www.linkedin.com/learning/learning-word-desktop-microsoft-365");
  });
  it("parses durations to minutes", () => {
    expect(parseDuration("50s")).toBe(1);
    expect(parseDuration("3m 40s")).toBe(4);
    expect(parseDuration("1h 5m")).toBe(65);
  });
  it.runIf(existsSync("/tmp/li.html"))("parses a real course page", () => {
    const c = parseLinkedinCourse(readFileSync("/tmp/li.html", "utf8"))!;
    expect(c.title).toBe("Learning Word Desktop (Microsoft 365)");
    expect(c.sections[0]?.items[0]?.title).toBe("Get up and running quickly with Word");
    console.log(JSON.stringify(c.sections.map((s) => [s.title, s.items.length])));
  });
});
