import type { JSONContent } from "@tiptap/core";
import type { Block } from "./store";

export const notebookFonts: Record<string, string> = { sans: "Manrope, sans-serif", serif: "Fraunces, serif", mono: "monospace", inter: "Inter, sans-serif", lora: "Lora, serif", playfair: "Playfair Display, serif", caveat: "Caveat, cursive", cairo: "Cairo, sans-serif", tajawal: "Tajawal, sans-serif", amiri: "Amiri, serif", naskh: "Noto Naskh Arabic, serif" };

export function notebookDocument(b: Block): JSONContent {
  if (b.richText) return b.richText;
  const marks: NonNullable<JSONContent["marks"]> = [];
  if (b.bold) marks.push({ type: "bold" });
  if (b.italic) marks.push({ type: "italic" });
  if (b.underline) marks.push({ type: "underline" });
  const attrs: Record<string, string> = {};
  if (b.font) attrs["fontFamily"] = notebookFonts[b.font] ?? notebookFonts["sans"] ?? "sans-serif";
  if (b.fontSize) attrs["fontSize"] = `${b.fontSize}px`;
  if (b.color) attrs["color"] = `var(--${b.color})`;
  if (Object.keys(attrs).length) marks.push({ type: "textStyle", attrs });
  return { type: "doc", content: (b.text ?? "").split("\n").map(text => ({ type: "paragraph", attrs: { textAlign: b.align ?? null }, content: text ? [{ type: "text", text, marks }] : [] })) };
}