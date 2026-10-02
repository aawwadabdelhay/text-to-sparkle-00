import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FolderTree, GripVertical, LayoutDashboard, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { Shell, Progress, Ring } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, fmt, mapItems, nodePos, stats, useStore } from "@/lib/store";

export const Route = createFileRoute("/maps/$id")({
  head: () => ({ meta: [
    { title: "Diploma roadmap — Learning Journey Tracker" },
    { name: "description", content: "Arrange and link modules on a visual roadmap or tree view." },
    { property: "og:title", content: "Diploma roadmap — Learning Journey Tracker" },
    { property: "og:description", content: "Structure your diploma into linked, bite-sized modules." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }), component: MapPage,
});
const W = 220, H = 120;

function MapPage() {
  const { id } = Route.useParams();
  const { maps } = useStore();
  const nav = useNavigate();
  const map = maps.find((entry) => entry.id === id);
  const [sectionTitle, setSectionTitle] = useState("");
  const [view, setView] = useState<"map" | "tree">("map");
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const drag = useRef<{ sid: string; dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  if (!map) return <Shell><p className="text-muted-foreground">Map not found. <Link to="/" className="text-primary underline">Back</Link></p></Shell>;
  const summary = stats(mapItems(map));
  const positions = Object.fromEntries(map.sections.map((section, index) => [section.id, nodePos(section, index)]));
  const links = (map.links ?? []).filter((link) => positions[link.from] && positions[link.to]);
  const maxX = Math.max(900, ...Object.values(positions).map((position) => position.x + W + 60));
  const maxY = Math.max(460, ...Object.values(positions).map((position) => position.y + H + 60));
  const down = (event: React.PointerEvent, sid: string) => { const position = positions[sid]; if (!position) return; drag.current = { sid, dx: event.clientX - position.x, dy: event.clientY - position.y, sx: event.clientX, sy: event.clientY, moved: false }; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); };
  const move = (event: React.PointerEvent) => { const current = drag.current; if (!current) return; if (Math.abs(event.clientX - current.sx) + Math.abs(event.clientY - current.sy) > 4) current.moved = true; if (current.moved) actions.moveNode(map.id, current.sid, Math.max(0, event.clientX - current.dx), Math.max(0, event.clientY - current.dy)); };
  const up = (sid: string) => { const current = drag.current; drag.current = null; if (current?.moved) return; if (linkMode) { if (!linkFrom) setLinkFrom(sid); else { actions.toggleLink(map.id, linkFrom, sid); setLinkFrom(null); } } else nav({ to: "/maps/$id/$sid", params: { id: map.id, sid } }); };

  return <Shell>
    <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← All study plans</Link>
    <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center"><Ring value={summary.pct} size={80} /><div className="flex-1"><div className="flex items-start gap-3"><h1 className="flex-1 font-display text-4xl">{map.title}</h1><Button size="icon" variant="ghost" aria-label="Edit map" onClick={() => { const title = prompt("Diploma title", map.title); if (title === null) return; const description = prompt("Description", map.description) ?? map.description; actions.updateMap(map.id, title.trim() || map.title, description); }}><Pencil /></Button></div>{map.description && <p className="mt-1 text-muted-foreground">{map.description}</p>}<p className="mt-2 text-sm text-muted-foreground">{summary.done}/{summary.total} items · {fmt(summary.leftMin)} remaining · {map.sections.length} modules</p></div></div>

    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2">{view === "map" && <Button variant={linkMode ? "secondary" : "outline"} onClick={() => { setLinkMode(!linkMode); setLinkFrom(null); }}><Link2 />{linkMode ? (linkFrom ? "Pick next module" : "Pick first module") : "Link modules"}</Button>}</div><div className="flex rounded-lg border bg-card p-1"><Button size="icon" variant={view === "map" ? "secondary" : "ghost"} onClick={() => setView("map")} title="Roadmap view"><LayoutDashboard /></Button><Button size="icon" variant={view === "tree" ? "secondary" : "ghost"} onClick={() => setView("tree")} title="Tree view"><FolderTree /></Button></div></div>

    {view === "map" ? <div className="mt-3 overflow-auto rounded-xl border bg-card bg-grid"><div className="relative" style={{ width: maxX, height: maxY }}><svg className="pointer-events-none absolute inset-0" width={maxX} height={maxY}><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--secondary)" /></marker></defs>{links.map((link) => { const a = positions[link.from]; const b = positions[link.to]; if (!a || !b) return null; const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = (x1 + x2) / 2; return <path key={link.from + link.to} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} stroke="var(--secondary)" strokeWidth={2.5} fill="none" strokeDasharray="6 5" markerEnd="url(#arr)" />; })}</svg>{map.sections.map((section) => { const position = positions[section.id]; if (!position) return null; const sectionStats = stats(section.items); return <div key={section.id} onPointerDown={(e) => down(e, section.id)} onPointerMove={move} onPointerUp={() => up(section.id)} style={{ left: position.x, top: position.y, width: W, height: H, touchAction: "none" }} className={`absolute cursor-grab select-none rounded-xl border bg-popover p-3 shadow-lg transition-shadow active:cursor-grabbing hover:border-primary ${linkFrom === section.id ? "ring-2 ring-secondary" : ""} ${sectionStats.pct === 100 ? "border-primary" : ""}`}><p className="line-clamp-2 text-sm font-semibold">{section.title}</p><p className="mt-1 text-xs text-muted-foreground">{section.items.length} items · {fmt(sectionStats.leftMin)} left</p><div className="mt-3 flex items-center gap-2"><Progress value={sectionStats.pct} /><span className="text-xs font-semibold">{sectionStats.pct}%</span></div></div>; })}</div></div> : <div className="mt-4 space-y-3">{map.sections.map((section) => { const sectionStats = stats(section.items); return <div key={section.id} draggable onDragStart={() => setDraggedSection(section.id)} onDragEnd={() => setDraggedSection(null)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (draggedSection) actions.reorderSection(map.id, draggedSection, section.id); }} className="rounded-xl border bg-card"><div className="flex items-center gap-3 p-4"><GripVertical className="cursor-grab text-muted-foreground" /><Link to="/maps/$id/$sid" params={{ id: map.id, sid: section.id }} className="flex-1 font-display text-xl hover:text-primary">{section.title}</Link><span className="text-sm text-muted-foreground">{sectionStats.pct}% · {fmt(sectionStats.leftMin)} left</span><Button size="icon" variant="ghost" onClick={() => confirm("Delete module?") && actions.deleteSection(map.id, section.id)} aria-label="Delete module"><Trash2 /></Button></div><div className="border-t px-5 py-3"><div className="ml-2 space-y-2 border-l border-primary/30 pl-5">{section.items.map((item) => <Link key={item.id} to="/maps/$id/$sid/items/$iid" params={{ id: map.id, sid: section.id, iid: item.id }} className="flex items-center justify-between text-sm text-muted-foreground hover:text-primary"><span>{item.title}</span><span>{item.done ? "Done" : fmt(item.minutes)}</span></Link>)}{section.items.length === 0 && <p className="text-sm text-muted-foreground">No learning items yet.</p>}</div></div></div>; })}</div>}

    <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (sectionTitle.trim()) { actions.addSection(map.id, sectionTitle.trim()); setSectionTitle(""); } }}><Input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} placeholder="Add module / week / course" className="h-10 bg-card" /><Button><Plus />Module</Button></form>
  </Shell>;
}
