import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CheckSquare, Download, ExternalLink, FileText, Heading1, Heading2, Image as ImageIcon, Link2, List, Minus, Paperclip, Pencil, Plus, Quote, Trash2, Type } from "lucide-react";
import type { Block, BlockType } from "@/lib/store";
import { removeFile, saveFile, useFileUrl } from "@/lib/files";

export type LessonActions = { done: boolean; onToggle: () => void; onFocus: () => void };
export const LessonCtx = createContext<LessonActions | null>(null);

const PAID: { re: RegExp; name: string; tone: string }[] = [
  { re: /linkedin\.com\/learning/i, name: "LinkedIn Learning", tone: "text-primary" },
  { re: /coursera\.org/i, name: "Coursera", tone: "text-primary" },
  { re: /udemy\.com/i, name: "Udemy", tone: "text-secondary" },
  { re: /edx\.org/i, name: "edX", tone: "text-accent" },
  { re: /pluralsight\.com/i, name: "Pluralsight", tone: "text-secondary" },
  { re: /skillshare\.com/i, name: "Skillshare", tone: "text-accent" },
];

function openSideBySide(url: string) {
  const w = Math.round(window.screen.availWidth / 2);
  const h = window.screen.availHeight;
  const win = window.open(url, "lecture-window", `popup=yes,width=${w},height=${h},left=${w},top=0`);
  if (!win) window.open(url, "_blank", "noopener");
}

function LectureCard({ url, site }: { url: string; site: { name: string; tone: string } }) {
  const lesson = useContext(LessonCtx);
  let path = "";
  try { const u = new URL(url); path = decodeURIComponent(u.pathname.split("/").filter(Boolean).slice(-1)[0] ?? "").replace(/[-_]+/g, " "); } catch { /* ignore */ }
  return (
    <div className="mt-2 rounded-xl border bg-card p-4">
      <div className={`text-xs font-semibold uppercase tracking-wide ${site.tone}`}>{site.name}</div>
      <div className="mt-1 font-display text-lg capitalize">{path || "Lecture"}</div>
      <p className="mt-1 text-xs text-muted-foreground">This site doesn't allow playing inside other websites. Watch it in a window beside your notes — you stay signed in there.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => openSideBySide(url)} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"><ExternalLink className="size-4" />Watch lecture side by side</button>
        {lesson && <button type="button" onClick={lesson.onFocus} className="rounded-md border px-3 py-1.5 text-sm hover:text-primary">Start Pomodoro</button>}
        {lesson && <button type="button" onClick={lesson.onToggle} className="rounded-md border px-3 py-1.5 text-sm hover:text-primary">{lesson.done ? "Completed ✓" : "Mark lesson done"}</button>}
      </div>
    </div>
  );
}

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
  { type: "embed", label: "Video / link", hint: "YouTube, Udemy, Coursera, LinkedIn…", icon: Link2 },
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
    const last = parsed[parsed.length - 1];
    if (last) setFocusId(last.id);
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

function TextRow({ b, inputRef, onText, onKey, onCheck, onFocus, onSel, onPaste }: { b: Block; onFocus: () => void; onSel: (has: boolean) => void; inputRef: (el: HTMLTextAreaElement | null) => void; onText: (t: string) => void; onKey: (e: React.KeyboardEvent) => void; onCheck: () => void; onPaste: (e: React.ClipboardEvent) => void }) {
  const base = "w-full bg-transparent outline-none placeholder:text-muted-foreground/50";
  const cls = { h1: "font-display text-3xl py-1", h2: "font-display text-xl py-1", quote: "italic", text: "", todo: b.checked ? "line-through text-muted-foreground" : "", bullet: "", embed: "text-sm text-primary" }[b.type as string] ?? "";
  const ph = b.type === "embed" ? "Paste a YouTube or web link…" : b.type === "text" ? "Type “/” for commands…" : b.type.startsWith("h") ? "Heading" : "";
  const [showLink, setShowLink] = useState(false);
  const own = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => { const el = own.current; if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }, [b.text, b.type, b.font]);
  useEffect(() => { if (showLink) own.current?.focus(); }, [showLink]);
  const sel = (e: React.SyntheticEvent<HTMLTextAreaElement>) => { const t = e.currentTarget; onSel(t.selectionStart !== t.selectionEnd); };
  const input = <textarea rows={1} ref={(el) => { own.current = el; inputRef(el); }} onSelect={sel} value={b.text ?? ""} onChange={(e) => onText(e.target.value)} onKeyDown={onKey} onPaste={onPaste} onFocus={onFocus} onBlur={b.type === "embed" ? () => setShowLink(false) : undefined} placeholder={ph} style={{ color: b.color ? `var(--${b.color})` : undefined }} className={`${base} ${cls} ${FONTS[b.font ?? "sans"] ?? ""} ${b.bold ? "font-bold" : ""} ${b.italic ? "italic" : ""} ${b.underline ? "underline" : ""} block resize-none overflow-hidden whitespace-pre-wrap break-words py-1 text-sm leading-relaxed`} />;
  if (b.type === "todo") return <label className="flex items-start gap-2"><input type="checkbox" checked={!!b.checked} onChange={onCheck} className="size-4 mt-2 accent-[var(--primary)]" />{input}</label>;
  if (b.type === "bullet") return <div className="flex items-start gap-2"><span className="py-1 text-primary">•</span>{input}</div>;
  if (b.type === "quote") return <div className="border-l-4 border-secondary pl-3">{input}</div>;
  if (b.type === "embed") {
    const url = b.text ?? "";
    const linked = /^https?:\/\//.test(url);
    if (linked && !showLink) return (
      <div>
        <Embed url={url} />
        <button type="button" onClick={() => setShowLink(true)} className="mt-1 text-xs text-muted-foreground/50 hover:text-primary"><Pencil className="mr-1 inline size-3" />Change link</button>
      </div>
    );
    return <div>{input}<Embed url={url} /></div>;
  }
  return input;
}

function Embed({ url }: { url: string }) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return <iframe className="mt-2 aspect-video w-full rounded-lg border" src={`https://www.youtube.com/embed/${yt[1]}`} allowFullScreen title="Video" />;
  const paid = PAID.find((p) => p.re.test(url));
  if (paid && /^https?:\/\//.test(url)) return <LectureCard url={url} site={paid} />;
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

// ============= Paste with source formatting =============

type Fmt = { bold?: boolean; italic?: boolean; underline?: boolean; font?: string; color?: string };

const BLOCK_TAGS = new Set(["p", "div", "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "section", "article", "figure", "figcaption", "header", "footer", "main", "nav", "aside", "form", "dl", "dt", "dd", "fieldset", "details", "summary"]);

function htmlToBlocks(html: string): Block[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: Block[] = [];
  const walk = (parent: Element, inh: Fmt) => {
    for (const el of Array.from(parent.children)) {
      const tag = el.tagName.toLowerCase();
      if (tag === "style" || tag === "script" || tag === "head" || tag === "meta" || tag === "title" || tag === "link") continue;
      const f = mergeFmt(inh, parseDecl(el.getAttribute("style")));
      if (tag === "h1") { pushText(out, "h1", textOf(el), f); continue; }
      if (/^h[2-6]$/.test(tag)) { pushText(out, "h2", textOf(el), f); continue; }
      if (tag === "ul" || tag === "ol") { collectList(el, f, out); continue; }
      if (tag === "blockquote") { pushText(out, "quote", textOf(el), f); continue; }
      if (tag === "hr") { out.push({ id: uid(), type: "divider" }); continue; }
      if (tag === "br" || tag === "img" || tag === "svg" || tag === "button" || tag === "input" || tag === "select" || tag === "noscript") continue;
      if (tag === "table") {
        for (const tr of Array.from(el.querySelectorAll("tr"))) {
          const cells = Array.from(tr.children).map((c) => textOf(c)).filter(Boolean);
          if (cells.length) pushText(out, "text", cells.join("  |  "), f);
        }
        continue;
      }
      if (tag === "pre") { pushText(out, "text", textOf(el), { ...f, font: "mono" }); continue; }
      const hasBlock = Array.from(el.children).some((c) => BLOCK_TAGS.has(c.tagName.toLowerCase()));
      if (hasBlock) { walk(el, f); continue; }
      const txt = textOf(el);
      if (!txt) continue;
      pushText(out, "text", txt, uniformFmt(el, f));
    }
  };
  walk(doc.body, {});
  if (!out.length) { const t = (doc.body.textContent ?? "").trim(); if (t) pushText(out, "text", t, {}); }
  return out;
}

function collectList(listEl: Element, f: Fmt, out: Block[]) {
  for (const li of Array.from(listEl.children).filter((c) => c.tagName === "LI")) {
    const todo = !!li.querySelector('input[type="checkbox"]');
    const clone = li.cloneNode(true) as Element;
    clone.querySelectorAll("ul, ol").forEach((n) => n.remove());
    pushText(out, todo ? "todo" : "bullet", clone.textContent ?? "", f);
    for (const sub of Array.from(li.children).filter((c) => /^ul$|^ol$/.test(c.tagName.toLowerCase()))) collectList(sub, f, out);
  }
}

const textOf = (el: Element) => (el.textContent ?? "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();

function pushText(out: Block[], type: BlockType, text: string, f: Fmt) {
  const t = text.trim();
  if (!t) return;
  const b: Block = { id: uid(), type, text: t };
  if (f.bold) b.bold = true;
  if (f.italic) b.italic = true;
  if (f.underline) b.underline = true;
  if (f.font) b.font = f.font;
  if (f.color) b.color = f.color;
  out.push(b);
}

function mergeFmt(a: Fmt, b: Fmt): Fmt {
  const r = { ...a };
  if (b.bold !== undefined) r.bold = b.bold;
  if (b.italic !== undefined) r.italic = b.italic;
  if (b.underline !== undefined) r.underline = b.underline;
  if (b.font) r.font = b.font;
  if (b.color) r.color = b.color;
  return r;
}

function parseDecl(style: string | null): Fmt {
  const f: Fmt = {};
  if (!style) return f;
  const get = (name: string) => { const m = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, "i").exec(style); const v = m?.[1]; return v ? v.trim() : ""; };
  const fw = get("font-weight");
  if (fw) f.bold = parseInt(fw, 10) >= 600 || /^(bold|bolder)$/i.test(fw);
  const fst = get("font-style");
  if (fst) f.italic = /^(italic|oblique)/i.test(fst);
  const td = get("text-decoration");
  if (td) f.underline = /underline/i.test(td);
  const ff = get("font-family");
  if (ff) f.font = fontName(ff);
  const c = get("color");
  if (c) f.color = colorToken(c);
  return f;
}

// If every part of a paragraph shares the same look, apply it to the whole block.
function uniformFmt(root: Element, base: Fmt): Fmt {
  const leaves: Fmt[] = [];
  const collect = (node: Node, f: Fmt) => {
    for (const n of Array.from(node.childNodes)) {
      if (n.nodeType === 3) { if ((n.textContent ?? "").trim()) leaves.push(f); }
      else if (n.nodeType === 1) {
        const el = n as Element;
        let fmt = mergeFmt(f, parseDecl(el.getAttribute("style")));
        const tag = el.tagName.toLowerCase();
        if (tag === "b" || tag === "strong") fmt = { ...fmt, bold: true };
        if (tag === "i" || tag === "em") fmt = { ...fmt, italic: true };
        if (tag === "u") fmt = { ...fmt, underline: true };
        collect(el, fmt);
      }
    }
  };
  collect(root, base);
  const uni: Fmt = {};
  for (const k of ["bold", "italic", "underline", "font", "color"] as const) {
    const vals = leaves.map((l) => l[k]);
    const first = vals[0];
    if (first && vals.every((v) => v === first)) (uni as Record<string, unknown>)[k] = first;
  }
  return uni;
}

function fontName(ff: string): string {
  const s = ff.toLowerCase();
  if (/mono|courier|consolas|menlo|source code/.test(s)) return "mono";
  if (/sans|arial|helvetica|calibri|segoe|verdana|tahoma|roboto/.test(s)) return "sans";
  if (/serif|georgia|times|garamond|palatino|book/.test(s)) return "serif";
  return "sans";
}

// Maps a pasted color to the closest color in your theme palette.
function colorToken(css: string): string {
  const s = css.trim().toLowerCase();
  if (!s || s === "inherit" || s.startsWith("var(")) return "";
  let r = 0, g = 0, b = 0;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  const rgb = /^rgba?\(([^)]+)\)/.exec(s);
  if (hex?.[1]) {
    const h = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
  } else if (rgb?.[1]) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return "";
    r = parts[0] ?? 0; g = parts[1] ?? 0; b = parts[2] ?? 0;
  } else return "";
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2, d = max - min;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (sat < 0.15 || l > 0.93 || l < 0.1) return ""; // near white/black/gray: keep default
  let h = 0;
  if (d) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h = Math.round(h * 60); if (h < 0) h += 360;
  }
  if (h < 42) return "destructive";
  if (h < 118) return "accent";
  if (h < 208) return "primary";
  if (h < 285) return ""; // blues/purples have no token
  return "secondary";
}
