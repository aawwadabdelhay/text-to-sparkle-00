import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, ExternalLink, FileText, HelpCircle, Plus, StickyNote, Trash2 } from "lucide-react";
import { Shell, Progress } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, fmt, mapItems, stats, useStore } from "@/lib/store";

export const Route = createFileRoute("/maps_/$id/$sid_/items/$iid")({
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
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  if (!map || !section || !item) return <Shell><p className="text-muted-foreground">Learning item not found. <Link to="/" className="text-primary underline">Back home</Link></p></Shell>;
  const moduleStats = stats(section.items);
  const diplomaStats = stats(mapItems(map));

  return <Shell>
    <Link to="/maps/$id/$sid" params={{ id, sid }} className="text-sm text-muted-foreground hover:text-foreground">← {section.title}</Link>
    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1"><p className="text-xs uppercase tracking-[0.2em] text-secondary">{item.type} · {fmt(item.minutes)}</p><h1 className="mt-2 font-display text-4xl">{item.title}</h1></div>
      <Button variant={item.done ? "secondary" : "default"} onClick={() => actions.toggleItem(id, sid, iid)}><CheckCircle2 />{item.done ? "Completed" : "Mark complete"}</Button>
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border bg-card p-4"><div className="flex justify-between text-sm"><span>Module progress</span><span>{moduleStats.pct}%</span></div><div className="mt-3"><Progress value={moduleStats.pct} /></div></div>
      <div className="rounded-xl border bg-card p-4"><div className="flex justify-between text-sm"><span>Diploma progress</span><span>{diplomaStats.pct}%</span></div><div className="mt-3"><Progress value={diplomaStats.pct} /></div></div>
    </div>

    <section className="mt-8"><div className="mb-3 flex items-center gap-2"><StickyNote className="text-accent" /><h2 className="font-display text-2xl">My notes</h2></div>
      <textarea value={item.notes ?? ""} onChange={(e) => actions.setNotes(id, sid, iid, e.target.value)} placeholder="Write notes for this item — saved automatically" rows={6} className="w-full rounded-xl border bg-card p-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
    </section>

    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <section><div className="mb-3 flex items-center gap-2"><FileText className="text-primary" /><h2 className="font-display text-2xl">Materials</h2></div>
        <div className="space-y-2">{(item.materials ?? []).map((material) => <div key={material.id} className="flex items-center gap-3 rounded-lg border bg-card p-3"><a href={material.url} target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-2 text-sm hover:text-primary">{material.title}<ExternalLink size={14} /></a><Button size="icon" variant="ghost" onClick={() => actions.deleteMaterial(id, sid, iid, material.id)} aria-label="Delete material"><Trash2 /></Button></div>)}{(item.materials ?? []).length === 0 && <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No materials added yet.</p>}</div>
        <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (!materialTitle.trim() || !materialUrl.trim()) return; actions.addMaterial(id, sid, iid, materialTitle.trim(), materialUrl.trim()); setMaterialTitle(""); setMaterialUrl(""); }}><Input value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} placeholder="Material title" className="bg-card" /><div className="flex gap-2"><Input type="url" value={materialUrl} onChange={(e) => setMaterialUrl(e.target.value)} placeholder="https://…" className="bg-card" /><Button><Plus />Add</Button></div></form>
      </section>
      <section><div className="mb-3 flex items-center gap-2"><HelpCircle className="text-secondary" /><h2 className="font-display text-2xl">Quiz questions</h2></div>
        <div className="space-y-2">{(item.quizzes ?? []).map((quiz, index) => <div key={quiz.id} className="rounded-lg border bg-card p-4"><div className="flex gap-3"><span className="text-sm font-semibold text-secondary">{index + 1}</span><div className="flex-1"><p className="font-medium">{quiz.question}</p><p className="mt-2 text-sm text-muted-foreground">Answer: {quiz.answer}</p></div><Button size="icon" variant="ghost" onClick={() => actions.deleteQuiz(id, sid, iid, quiz.id)} aria-label="Delete quiz"><Trash2 /></Button></div></div>)}{(item.quizzes ?? []).length === 0 && <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No quiz questions added yet.</p>}</div>
        <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (!question.trim() || !answer.trim()) return; actions.addQuiz(id, sid, iid, question.trim(), answer.trim()); setQuestion(""); setAnswer(""); }}><Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question" className="bg-card" /><div className="flex gap-2"><Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer" className="bg-card" /><Button><Plus />Add</Button></div></form>
      </section>
    </div>
  </Shell>;
}
