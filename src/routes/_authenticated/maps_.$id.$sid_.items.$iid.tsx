import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, CheckCircle2, PlayCircle, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Shell, Progress } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { BlockEditor, Embed, LessonCtx } from "@/components/BlockEditor";
import { startFocus } from "@/components/FocusTimer";
import { type Block, type Item, actions, fmt, mapItems, stats, useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/maps_/$id/$sid_/items/$iid")({
  head: () => ({ meta: [
    { title: "Learning item — Learning Journey Tracker" },
    { name: "description", content: "Manage learning materials and quiz questions for a study item." },
    { property: "og:title", content: "Learning item — Learning Journey Tracker" },
    { property: "og:description", content: "Keep materials and quiz questions together in your learning journey." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ItemPage,
});

function ItemPage() {
  const { id, sid, iid } = Route.useParams();
  const { maps } = useStore();
  const map = maps.find((entry) => entry.id === id);
  const section = map?.sections.find((entry) => entry.id === sid);
  const item = section?.items.find((entry) => entry.id === iid);

  if (!map || !section || !item) return <Shell><p className="text-muted-foreground">Learning item not found. <Link to="/dashboard" className="text-primary underline">Back home</Link></p></Shell>;
  const moduleStats = stats(section.items);
  const courseStats = stats(mapItems(map));

  return <Shell>
    <Button variant="outline" size="sm" asChild>
      <Link to="/maps/$id/$sid" params={{ id, sid }}>{section.title}</Link>
    </Button>
    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1"><p className="text-xs uppercase tracking-[0.2em] text-secondary">{item.type} · {fmt(item.minutes)}</p><h1 className="mt-2 font-display text-4xl">{item.title}</h1></div>
      <Button variant={item.done ? "secondary" : "default"} onClick={() => actions.toggleItem(id, sid, iid)}><CheckCircle2 />{item.done ? "Completed" : "Mark complete"}</Button>
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border bg-card p-4"><div className="flex justify-between text-sm"><span>Module progress</span><span>{moduleStats.pct}%</span></div><div className="mt-3"><Progress value={moduleStats.pct} /></div></div>
      <div className="rounded-xl border bg-card p-4"><div className="flex justify-between text-sm"><span>Course progress</span><span>{courseStats.pct}%</span></div><div className="mt-3"><Progress value={courseStats.pct} /></div></div>
    </div>

    <LessonCtx.Provider value={{ done: !!item.done, onToggle: () => actions.toggleItem(id, sid, iid), onFocus: () => startFocus(iid, "Watch", item.title) }}>
      <LectureLink url={item.url} onSave={(u) => actions.setItemUrl(id, sid, iid, u)} />
    </LessonCtx.Provider>

    <section className="mt-8"><div className="mb-3 flex items-center gap-2"><BookOpen className="text-primary" /><h2 className="font-display text-2xl">Lesson notebook</h2></div>
      <LessonCtx.Provider value={{ done: !!item.done, onToggle: () => actions.toggleItem(id, sid, iid), onFocus: () => startFocus(iid, "Watch", item.title) }}>
      <BlockEditor blocks={item.blocks?.length ? item.blocks : legacyBlocks(item)} onChange={(b) => actions.setBlocks(id, sid, iid, b)} />
      </LessonCtx.Provider>
    </section>

  </Shell>;
}

function LectureLink({ url, onSave }: { url?: string | undefined; onSave: (u: string) => void }) {
  const [editing, setEditing] = useState(!url);
  const [val, setVal] = useState(url ?? "");
  return <section className="mt-8">
    <div className="mb-3 flex items-center gap-2"><PlayCircle className="text-secondary" /><h2 className="font-display text-2xl">Lecture</h2>
      {url && !editing && <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setVal(url); setEditing(true); }}><Pencil />Change link</Button>}
    </div>
    <div className="rounded-xl border bg-card p-4">
      {url && !editing ? <><Embed url={url} /><a href={url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-muted-foreground hover:text-primary">{url}</a></>
        : <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); onSave(val); if (val.trim()) setEditing(false); }}>
          <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Paste the lecture link (YouTube, Udemy, Coursera, LinkedIn Learning…)" type="url" />
          <Button type="submit">Save link</Button>
          {url && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
        </form>}
    </div>
  </section>;
}

// Older lessons kept notes, materials and quiz questions separately; show them as notebook blocks.
function legacyBlocks(item: Item): Block[] {
  const out: Block[] = [];
  if (item.notes) item.notes.split("\n").forEach((t, i) => out.push({ id: `n${i}`, type: "text", text: t }));
  (item.materials ?? []).forEach((m) => out.push({ id: m.id, type: "embed", text: m.url }));
  (item.quizzes ?? []).forEach((q) => { out.push({ id: q.id, type: "todo", text: q.question }); out.push({ id: `${q.id}a`, type: "quote", text: `Answer: ${q.answer}` }); });
  return out;
}
