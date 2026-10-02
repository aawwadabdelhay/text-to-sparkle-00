import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { Shell, Progress, Ring } from "@/components/Shell";
import { actions, fmt, mapItems, nodePos, stats, useStore } from "@/lib/store";

export const Route = createFileRoute("/maps/$id")({
  head: () => ({
    meta: [
      { title: "Diploma roadmap — Learning Journey Tracker" },
      { name: "description", content: "Drag, drop and link modules on a visual roadmap of your diploma." },
      { property: "og:title", content: "Diploma roadmap — Learning Journey Tracker" },
      { property: "og:description", content: "Structure your diploma into linked, bite-sized modules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapPage,
});

const W = 220, H = 120;

function MapPage() {
  const { id } = Route.useParams();
  const { maps } = useStore();
  const nav = useNavigate();
  const m = maps.find((x) => x.id === id);
  const [sec, setSec] = useState("");
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const drag = useRef<{ sid: string; dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  if (!m) return <Shell><p className="text-muted-foreground">Map not found. <Link to="/" className="text-primary underline">Back</Link></p></Shell>;
  const s = stats(mapItems(m));
  const pos = Object.fromEntries(m.sections.map((x, i) => [x.id, nodePos(x, i)]));
  const links = (m.links ?? []).filter((l) => pos[l.from] && pos[l.to]);
  const maxX = Math.max(900, ...Object.values(pos).map((p) => p.x + W + 60));
  const maxY = Math.max(460, ...Object.values(pos).map((p) => p.y + H + 60));

  const down = (e: React.PointerEvent, sid: string) => {
    const p = pos[sid]!;
    drag.current = { sid, dx: e.clientX - p.x, dy: e.clientY - p.y, sx: e.clientX, sy: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) d.moved = true;
    if (d.moved) actions.moveNode(m.id, d.sid, Math.max(0, e.clientX - d.dx), Math.max(0, e.clientY - d.dy));
  };
  const up = (sid: string) => {
    const d = drag.current; drag.current = null;
    if (d?.moved) return;
    if (linkMode) {
      if (!linkFrom) setLinkFrom(sid); else { actions.toggleLink(m.id, linkFrom, sid); setLinkFrom(null); }
    } else nav({ to: "/maps/$id/$sid", params: { id: m.id, sid } });
  };

  return (
    <Shell>
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← All diplomas</Link>
      <div className="mt-3 flex items-center gap-5">
        <Ring value={s.pct} size={80} />
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <h1 className="flex-1 font-display text-4xl">{m.title}</h1>
            <button aria-label="Edit map" className="mt-2 text-muted-foreground hover:text-foreground" onClick={() => {
              const t = prompt("Diploma title", m.title); if (t === null) return; const d = prompt("Description", m.description) ?? m.description;
              actions.updateMap(m.id, t.trim() || m.title, d);
            }}><Pencil size={18} /></button>
          </div>
          {m.description && <p className="mt-1 text-muted-foreground">{m.description}</p>}
          <p className="mt-2 text-sm text-muted-foreground">{s.done}/{s.total} items · {fmt(s.leftMin)} remaining · {m.sections.length} modules</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button onClick={() => { setLinkMode(!linkMode); setLinkFrom(null); }}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${linkMode ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>
          <Link2 size={15} />{linkMode ? (linkFrom ? "Now pick the next module" : "Pick a module to link from") : "Link modules"}
        </button>
        <span className="text-xs text-muted-foreground">Drag modules to arrange · click to open · link mode toggles connections</span>
      </div>

      <div ref={canvas} className="mt-3 overflow-auto rounded-2xl border bg-card bg-grid">
        <div className="relative" style={{ width: maxX, height: maxY }}>
          <svg className="pointer-events-none absolute inset-0" width={maxX} height={maxY}>
            <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--secondary)" /></marker></defs>
            {links.map((l) => {
              const a = pos[l.from]!, b = pos[l.to]!;
              const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = (x1 + x2) / 2;
              return <path key={l.from + l.to} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} stroke="var(--secondary)" strokeWidth={2.5} fill="none" strokeDasharray="6 5" markerEnd="url(#arr)" />;
            })}
          </svg>
          {m.sections.map((x) => {
            const p = pos[x.id]!, t = stats(x.items);
            return (
              <div key={x.id} onPointerDown={(e) => down(e, x.id)} onPointerMove={move} onPointerUp={() => up(x.id)}
                style={{ left: p.x, top: p.y, width: W, height: H, touchAction: "none" }}
                className={`absolute cursor-grab select-none rounded-xl border bg-popover p-3 shadow-lg transition-shadow active:cursor-grabbing hover:border-primary ${linkFrom === x.id ? "ring-2 ring-secondary" : ""} ${t.pct === 100 ? "border-primary" : ""}`}>
                <p className="line-clamp-2 text-sm font-semibold">{x.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{x.items.length} items · {fmt(t.leftMin)} left</p>
                <div className="mt-3 flex items-center gap-2"><Progress value={t.pct} /><span className="text-xs font-semibold">{t.pct}%</span></div>
              </div>
            );
          })}
          {m.sections.length === 0 && <p className="absolute left-6 top-6 text-sm text-muted-foreground">Add your first module below.</p>}
        </div>
      </div>

      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (sec.trim()) { actions.addSection(m.id, sec.trim()); setSec(""); } }}>
        <input value={sec} onChange={(e) => setSec(e.target.value)} placeholder="Add module / week / course"
          className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button className="flex items-center gap-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"><Plus size={16} />Module</button>
      </form>

      {m.sections.length > 0 && (
        <ul className="mt-6 divide-y rounded-2xl border bg-card">
          {m.sections.map((x) => (
            <li key={x.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <Link to="/maps/$id/$sid" params={{ id: m.id, sid: x.id }} className="flex-1 font-medium hover:text-primary">{x.title}</Link>
              <span className="text-xs text-muted-foreground">{stats(x.items).pct}%</span>
              <button onClick={() => confirm("Delete module?") && actions.deleteSection(m.id, x.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
