import { describe, expect, it } from "vitest";
import { notebookDocument } from "@/lib/notebook-text";

describe("notebook document compatibility", () => {
  it("retains every English and Arabic line from older notebooks", () => {
    const doc = notebookDocument({ id: "old", type: "text", text: "First paragraph\n\nالنص العربي" });
    expect(doc.content?.map(p => p.content?.[0]?.text ?? "")).toEqual(["First paragraph", "", "النص العربي"]);
  });
  it("preserves saved inline content instead of replacing it with the plain-text mirror", () => {
    const saved = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Before " }, { type: "text", text: "chosen", marks: [{ type: "bold" }] }, { type: "text", text: " after" }] }] };
    expect(notebookDocument({ id: "saved", type: "text", text: "Before chosen after", richText: saved })).toBe(saved);
  });
});