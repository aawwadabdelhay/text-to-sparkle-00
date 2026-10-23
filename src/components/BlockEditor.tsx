import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CheckSquare, Download, ExternalLink, FileText, Heading1, Heading2, Image as ImageIcon, Link2, List, Minus, Paperclip, Plus, Quote, Trash2, Type } from "lucide-react";
import type { Block, BlockType } from "@/lib/store";
import { removeFile, saveFile, useFileUrl } from "@/lib/files";

const uid = () => Math.random().toString(36).slice(2, 10);
const OPTIONS: { type: BlockType; label: string; hint: string; icon: typeof Type }[] = [
  { type: "text", label: "Text", hint: "Plain writing", icon: Type },
  { type: "h1", label: "Heading 1", hint: "Big title", icon: Heading1 },
  { type: "h2", label: "Heading 2", hint: "Sub title", icon: Heading2 },
  { type: "todo", label: "To-do", hint: "Checkbox item", icon: CheckSquare },
  { type: "bullet", label: "Bullet list", hint: "Simple list", icon: List },
  { type: "quote", label: "Quote", hint: "Highlight text", icon: Quote },
  { type: "divider", label: "Divider", hint: "Separator line", icon: Minus },
  { type: "image", label: "Photo", hint: "Upload an image", icon: ImageIcon },
  { type: "file", label: "Document", hint: "Upload PDF, Word, any file", icon: Paperclip },
  { type: "embed", label: "Video / link", hint: "YouTube or any URL", icon: Link2 },
];
const TEXTY: BlockType[] = ["text", "h1", "h2", "todo", "bullet", "quote", "embed"];

export function BlockEditor({ blocks: saved, onChange }: { blocks?: Block[] | undefined; onChange: (b: Block[]) => void }) {
  const blocks = saved?.length ? saved : [{ id: "first", type: "text" as const, text: "" }];
  const [menu, setMenu] = useState<{ id: string; q: string } | null>(null);
  const [tools, setTools] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<{ id: string; type: BlockType } | null>(null);

  useEffect(() => { if (focusId) { refs.current[focusId]?.focus(); setFocusId(null); } }, [focusId, blocks]);

  // Paste with source formatting: clipboard HTML becomes notebook blocks.
  const paste = (e: React.ClipboardEvent, b: Block) => {
    if (e.shiftKey) return; // Shift+Paste keeps it plain
    const html = e.clipboardData.getData("text/html");
    if (!html) return;
    e.preventDefault();
    const parsed = htmlToBlocks(html);
    if (!parsed.length) return;
    const empty = b.type === "text" && !b.text;
    let next: Block[];
    if (empty) {
      next = [...parsed, ...blocks.filter((x) => x.id !== b.id)];
    } else {
      const i = blocks.findIndex((x) => x.id === b.id);
      next = [...blocks];
      next.splice(i + 1, 0, ...parsed);
    }
    onChange(next);
    setFocusId(parsed[parsed.length - 1].id);
  };


  const update = (id: string, patch: Partial<Block>) => onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const insertAfter = (id: string | null, block: Block) => {
    const i = id ? blocks.findIndex((b) => b.id === id) : blocks.length - 1;
    const next = [...blocks]; next.splice(i + 1, 0, block); onChange(next); return block.id;
  };
  const remove = (id: string) => {
    const b = blocks.find((x) => x.id === id); if (b?.fileId) removeFile(b.fileId).catch(() => {});
    const i = blocks.findIndex((x) => x.id === id);
    onChange(blocks.filter((x) => x.id !== id));
    const prev = blocks[i - 1]; if (prev) setFocusId(prev.id);
  };

  const pick = (id: string, type: BlockType) => {
    setMenu(null);
    if (type === "image" || type === "file") { uploadTarget.current = { id, type }; fileInput.current?.click(); return; }
    if (type === "divider") {
      const nid = uid();
      const next = blocks.map((b) => (b.id === id ? { ...b, type, text: "" } : b));
      const i = next.findIndex((b) => b.id === id); next.splice(i + 1, 0, { id: nid, type: "text", text: "" });
      onChange(next); setFocusId(nid); return;
    }
    update(id, { type, text: "" }); setFocusId(id);
  };

  const onFile = async (f: File | undefined) => {
    const t = uploadTarget.current; uploadTarget.current = null;
    if (!f || !t) return;
    const fileId = uid();
    await saveFile(fileId, f);
    const type: BlockType = t.type === "image" || f.type.startsWith("image/") ? (f.type.startsWith("image/") ? "image" : "file") : "file";
    const nid = uid();
    const next = blocks.map((b) => (b.id === t.id ? { ...b, type, text: "", fileId, fileName: f.name, mime: f.type, size: f.size } : b));
    const i = next.findIndex((b) => b.id === t.id); next.splice(i + 1, 0, { id: nid, type: "text", text: "" });
    onChange(next); setFocusId(nid);
  };

  const filtered = menu ? OPTIONS.filter((o) => o.label.toLowerCase().includes(menu.q.toLowerCase())) : [];

  return <div className="rounded-xl border bg-card p-4 sm:p-6">
    <input ref={fileInput} type="file" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
    <div className="space-y-1">
      {blocks.map((b) => <div key={b.id} className="group relative flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {tools === b.id && TEXTY.includes(b.type) && b.type !== "embed" && <Toolbar b={b} set={(patch) => update(b.id, patch)} />}
          {TEXTY.includes(b.type) ? <TextRow onFocus={() => { if (tools !== b.id) setTools(null); }} onSel={(has) => setTools(has ? b.id : null)} b={b} inputRef={(el) => { refs.current[b.id] = el; }}
            onText={(text) => { update(b.id, { text }); setMenu(text.startsWith("/") ? { id: b.id, q: text.slice(1) } : null); }}
            onCheck={() => update(b.id, { checked: !b.checked })}
            onPaste={(e) => paste(e, b)}
            onKey={(e) => {
              const k = e.key.toLowerCase();
              if ((e.metaKey || e.ctrlKey) && (k === "b" || k === "i" || k === "u")) { e.preventDefault(); const f = k === "b" ? "bold" : k === "i" ? "italic" : "underline"; update(b.id, { [f]: !b[f] }); return; }
              if (menu?.id === b.id) {
                if (e.key === "Enter") { e.preventDefault(); const f = filtered[0]; if (f) pick(b.id, f.type); }
                if (e.key === "Escape") setMenu(null);
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const keep = b.type === "todo" || b.type === "bullet" ? b.type : "text"; setFocusId(insertAfter(b.id, { id: uid(), type: keep, text: "" })); }
              if (e.key === "Backspace" && !b.text) {
                if (b.type !== "text") { e.preventDefault(); update(b.id, { type: "text" }); }
                else if (blocks.length > 1) { e.preventDefault(); remove(b.id); }
              }
            }} /> : <MediaRow b={b} />}
          {menu?.id === b.id && filtered.length > 0 && <div className="absolute left-0 top-full z-20 mt-1 w-72 overflow-hidden rounded-lg border bg-popover shadow-xl">
            <p className="px-3 pt-2 text-xs uppercase tracking-wider text-muted-foreground">Add block</p>
            {filtered.map((o) => <button key={o.type} type="button" onMouseDown={(e) => { e.preventDefault(); pick(b.id, o.type); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted">
              <o.icon className="size-4 text-primary" /><span className="flex-1"><span className="block text-sm">{o.label}</span><span className="block text-xs text-muted-foreground">{o.hint}</span></span>
            </button>)}
          </div>}
        </div>
        {(blocks.length > 1 || b.type !== "text") && <button type="button" onClick={() => remove(b.id)} aria-label="Delete block" className="mt-1 rounded p-1 text-muted-foreground opacity-40 hover:text-destructive group-hover:opacity-100"><Trash2 className="size-4" /></button>}
      </div>)}
    </div>
    <button type="button" onClick={() => { const id = insertAfter(null, { id: uid(), type: "text", text: "/" }); setMenu({ id, q: "" }); setFocusId(id); }} className="mt-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><Plus className="size-4" />Add block <span className="text-xs">(or type “/”)</span></button>
  </div>;
}

function TextRow({ b, inputRef, onText, onKey, onCheck, onFocus, onSel }: { b: Block; onFocus: () => void; onSel: (has: boolean) => void; inputRef: (el: HTMLTextAreaElement | null) => void; onText: (t: string) => void; onKey: (e: React.KeyboardEvent) => void; onCheck: () => void }) {
  const base = "w-full bg-transparent outline-none placeholder:text-muted-foreground/50";
  const cls = { h1: "font-display text-3xl py-1", h2: "font-display text-xl py-1", quote: "italic", text: "", todo: b.checked ? "line-through text-muted-foreground" : "", bullet: "", embed: "text-sm text-primary" }[b.type as string] ?? "";
  const ph = b.type === "embed" ? "Paste a YouTube or web link…" : b.type === "text" ? "Type “/” for commands…" : b.type.startsWith("h") ? "Heading" : "";
  const own = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => { const el = own.current; if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }, [b.text, b.type, b.font]);
  const sel = (e: React.SyntheticEvent<HTMLTextAreaElement>) => { const t = e.currentTarget; onSel(t.selectionStart !== t.selectionEnd); };
  const input = <textarea rows={1} ref={(el) => { own.current = el; inputRef(el); }} onSelect={sel} value={b.text ?? ""} onChange={(e) => onText(e.target.value)} onKeyDown={onKey} onFocus={onFocus} placeholder={ph} style={{ color: b.color ? `var(--${b.color})` : undefined }} className={`${base} ${cls} ${FONTS[b.font ?? "sans"] ?? ""} ${b.bold ? "font-bold" : ""} ${b.italic ? "italic" : ""} ${b.underline ? "underline" : ""} block resize-none overflow-hidden whitespace-pre-wrap break-words py-1 text-sm leading-relaxed`} />;
  if (b.type === "todo") return <label className="flex items-start gap-2"><input type="checkbox" checked={!!b.checked} onChange={onCheck} className="size-4 mt-2 accent-[var(--primary)]" />{input}</label>;
  if (b.type === "bullet") return <div className="flex items-start gap-2"><span className="py-1 text-primary">•</span>{input}</div>;
  if (b.type === "quote") return <div className="border-l-4 border-secondary pl-3">{input}</div>;
  if (b.type === "embed") return <div>{input}<Embed url={b.text ?? ""} /></div>;
  return input;
}

function Embed({ url }: { url: string }) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return <iframe className="mt-2 aspect-video w-full rounded-lg border" src={`https://www.youtube.com/embed/${yt[1]}`} allowFullScreen title="Video" />;
  if (/^https?:\/\//.test(url)) return <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">Open link <ExternalLink className="size-3" /></a>;
  return null;
}

function MediaRow({ b }: { b: Block }) {
  const url = useFileUrl(b.fileId);
  if (b.type === "divider") return <hr className="my-3 border-border" />;
  const dl = url && <a href={url} download={b.fileName} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:text-primary"><Download className="size-3" />Download</a>;
  if (b.type === "image") return <figure className="my-2">
    {url ? <img src={url} alt={b.fileName} className="max-h-[480px] rounded-lg border object-contain" /> : <div className="h-32 animate-pulse rounded-lg bg-muted" />}
    <figcaption className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{b.fileName}{dl}</figcaption>
  </figure>;
  const isPdf = b.mime === "application/pdf";
  return <div className="my-2 rounded-lg border bg-background/40 p-3">
    <div className="flex flex-wrap items-center gap-3">
      <FileText className="size-5 text-accent" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm">{b.fileName}</p><p className="text-xs text-muted-foreground">{b.size ? `${(b.size / 1024).toFixed(0)} KB` : ""}</p></div>
      {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:text-primary"><ExternalLink className="size-3" />Open</a>}
      {dl}
    </div>
    {isPdf && url && <iframe src={url} title={b.fileName} className="mt-3 h-[480px] w-full rounded border" />}
  </div>;
}

const FONTS: Record<string, string> = { sans: "font-sans", serif: "font-display", mono: "font-mono" };
const COLORS = ["foreground", "primary", "secondary", "accent", "destructive", "muted-foreground"];
function Toolbar({ b, set }: { b: Block; set: (p: Partial<Block>) => void }) {
  const btn = (on: boolean | undefined) => `rounded px-2 py-0.5 text-xs ${on ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`;
  return <div onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== "SELECT") e.preventDefault(); }} className="mb-1 flex flex-wrap items-center gap-1 rounded-lg border bg-popover p-1 shadow">
    <button type="button" className={`${btn(b.bold)} font-bold`} onClick={() => set({ bold: !b.bold })} aria-label="Bold">B</button>
    <button type="button" className={`${btn(b.italic)} italic`} onClick={() => set({ italic: !b.italic })} aria-label="Italic">I</button>
    <button type="button" className={`${btn(b.underline)} underline`} onClick={() => set({ underline: !b.underline })} aria-label="Underline">U</button>
    <select value={b.font ?? "sans"} onChange={(e) => set({ font: e.target.value })} className="rounded bg-transparent px-1 text-xs outline-none" aria-label="Font">
      <option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option>
    </select>
    <span className="mx-1 h-4 w-px bg-border" />
    {COLORS.map((c) => <button key={c} type="button" onClick={() => set({ color: c === "foreground" ? "" : c })} aria-label={`Color ${c}`} className={`size-4 rounded-full border ${(b.color || "foreground") === c ? "ring-2 ring-ring" : ""}`} style={{ background: `var(--${c})` }} />)}
  </div>;
}
