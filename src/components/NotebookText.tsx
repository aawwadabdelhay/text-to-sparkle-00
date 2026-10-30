import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { AlignCenter, AlignLeft, AlignRight, AlignJustify, Bold, Italic, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Block } from "@/lib/store";
import { notebookDocument, notebookFonts } from "@/lib/notebook-text";

export function NotebookText({ b, set, inputRef, onSelection, showTools, onKey }: { b: Block; set: (patch: Partial<Block>) => void; inputRef: (el: HTMLDivElement | null) => void; onSelection: (has: boolean) => void; showTools: boolean; onKey: (e: React.KeyboardEvent) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: false, bulletList: false, orderedList: false, listItem: false, blockquote: false, horizontalRule: false, codeBlock: false }), TextStyleKit, TextAlign.configure({ types: ["paragraph"] })],
    content: notebookDocument(b),
    editorProps: { attributes: { role: "textbox", "aria-label": "Notebook text", "aria-multiline": "true", class: "min-h-8 w-full outline-none whitespace-pre-wrap break-words [&_p]:min-h-6 [&_strong]:font-bold [&_em]:italic [&_u]:underline" } },
    onUpdate: ({ editor: ed }) => set({ text: ed.getText({ blockSeparator: "\n" }), richText: ed.getJSON() }),
    onSelectionUpdate: ({ editor: ed }) => onSelection(!ed.state.selection.empty),
    onFocus: ({ editor: ed }) => onSelection(!ed.state.selection.empty),
  });
  useEffect(() => {
    if (!editor) return;
    inputRef(editor.view.dom as HTMLDivElement);
    const content = notebookDocument(b);
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, b.richText, b.text]);
  if (!editor) return null;
  const selection = editor.state.selection;
  const select = () => editor.chain().focus().setTextSelection({ from: selection.from, to: selection.to });
  const attrs = editor.getAttributes("textStyle");
  const commandButton = (label: string, active: boolean, icon: React.ReactNode, run: () => void) => <Button type="button" variant={active ? "secondary" : "ghost"} size="sm" className="h-7 px-2" aria-label={label} title={label} onClick={run}>{icon}</Button>;
  return <div className="min-w-0 flex-1">
    {showTools && <div className="mb-2 flex flex-wrap items-center gap-1 rounded-lg border bg-popover p-1" onMouseDown={e => { if ((e.target as HTMLElement).tagName !== "SELECT") e.preventDefault(); }}>
      {commandButton("Bold", editor.isActive("bold"), <Bold className="size-3.5" />, () => select().toggleBold().run())}
      {commandButton("Italic", editor.isActive("italic"), <Italic className="size-3.5" />, () => select().toggleItalic().run())}
      {commandButton("Underline", editor.isActive("underline"), <Underline className="size-3.5" />, () => select().toggleUnderline().run())}
      <select aria-label="Font" className="max-w-36 rounded bg-popover px-1 text-xs" value={attrs.fontFamily ?? ""} onChange={e => select().setFontFamily(e.target.value).run()}><option value="">Font</option>{Object.entries(notebookFonts).map(([key, family]) => <option key={key} value={family}>{family.split(",")[0]}</option>)}</select>
      <select aria-label="Font size" className="rounded bg-popover px-1 text-xs" value={attrs.fontSize ?? ""} onChange={e => { const chain = select(); if (e.target.value) chain.setFontSize(e.target.value).run(); else chain.unsetFontSize().run(); }}><option value="">Size</option>{[12,14,16,18,20,24,28,32,40].map(size => <option key={size} value={`${size}px`}>{size}</option>)}</select>
      {([ ["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight], ["justify", AlignJustify] ] as const).map(([align, Icon]) => commandButton(`Align ${align}`, b.align === align, <Icon className="size-3.5" />, () => { select().setTextAlign(align).run(); set({ align, richText: editor.getJSON() }); }))}
      {commandButton("Left to right", b.dir === "ltr", "LTR", () => set({ dir: "ltr" }))}
      {commandButton("Right to left", b.dir === "rtl", "RTL", () => set({ dir: "rtl" }))}
      {["foreground", "primary", "secondary", "accent", "destructive", "muted-foreground"].map(color => <Button key={color} type="button" size="icon" variant="ghost" className="size-7" aria-label={`Color ${color}`} title={`Color ${color}`} onClick={() => select().setColor(`var(--${color})`).run()}><span className="size-4 rounded-full border" style={{ background: `var(--${color})` }} /></Button>)}
    </div>}
    <div dir={b.dir ?? "auto"} className={`text-sm leading-relaxed ${b.type === "h1" ? "font-display text-3xl" : b.type === "h2" ? "font-display text-xl" : ""} ${b.checked ? "text-muted-foreground line-through" : ""}`} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && ["b", "i", "u", "z", "y"].includes(e.key.toLowerCase())) return; onKey(e); }}>
      <EditorContent editor={editor} />
    </div>
  </div>;
}