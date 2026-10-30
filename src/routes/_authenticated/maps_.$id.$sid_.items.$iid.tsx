import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { Shell, Progress } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { BlockEditor, LessonCtx } from "@/components/BlockEditor";
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

  if (!map || !section || !item) return <Shell><p className="text-muted-foreground">Learning item not found. <Link to="/" className="text-primary underline">Back home</Link></p></Shell>;
  const moduleStats = stats(section.items);
  const courseStats = stats(mapItems(map));

  return <Shell>
    <Link to="/maps/$id/$sid" params={{ id, sid }} className="text-sm text-muted-foreground hover:text-foreground">← {section.title}</Link>
    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1"><p className="text-xs uppercase tracking-[0.2em] text-secondary">{item.type} · {fmt(item.minutes)}</p><h1 className="mt-2 font-display text-4xl">{item.title}</h1></div>
      <Button variant={item.done ? "secondary" : "default"} onClick={() => actions.toggleItem(id, sid, iid)}><CheckCircle2 />{item.done ? "Completed" : "Mark complete"}</Button>
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border bg-card p-4"><div className="flex justify-between text-sm"><span>Module progress</span><span>{moduleStats.pct}%</span></div><div className="mt-3"><Progress value={moduleStats.pct} /></div></div>
      <div className="rounded-xl border bg-card p-4"><div className="flex justify-between text-sm"><span>Course progress</span><span>{courseStats.pct}%</span></div><div className="mt-3"><Progress value={courseStats.pct} /></div></div>
    </div>

    <section className="mt-8"><div className="mb-3 flex items-center gap-2"><BookOpen className="text-primary" /><h2 className="font-display text-2xl">Lesson notebook</h2></div>
      <LessonCtx.Provider value={{ done: !!item.done, onToggle: () => actions.toggleItem(id, sid, iid), onFocus: () => startFocus(iid, "Watch", item.title) }}>
      <BlockEditor blocks={item.blocks?.length ? item.blocks : legacyBlocks(item)} onChange={(b) => actions.setBlocks(id, sid, iid, b)} />
      </LessonCtx.Provider>
    </section>

  </Shell>;
}

// Older lessons kept notes, materials and quiz questions separately; show them as notebook blocks.
function legacyBlocks(item: Item): Block[] {
  const out: Block[] = [];
  if (item.notes) item.notes.split("\n").forEach((t, i) => out.push({ id: `n${i}`, type: "text", text: t }));
  (item.materials ?? []).forEach((m) => out.push({ id: m.id, type: "embed", text: m.url }));
  (item.quizzes ?? []).forEach((q) => { out.push({ id: q.id, type: "todo", text: q.question }); out.push({ id: `${q.id}a`, type: "quote", text: `Answer: ${q.answer}` }); });
  return out;
}
