import { useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, ChevronLeft, ChevronRight, CircleDot, Plus, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PALETTE, daysInMonth, habitActions, monthKey, stateOf, useHabits } from "@/lib/habits";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const fill = (st: 1 | 0 | undefined) => (st === 1 ? "var(--primary)" : st === 0 ? "var(--destructive)" : "var(--muted)");

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [x0, y0] = polar(cx, cy, r, a0); const [x1, y1] = polar(cx, cy, r, a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}

export function HabitCircle() {
  const { habits, checkins } = useHabits();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [tab, setTab] = useState<"wheel" | "calendar" | "manage">("wheel");
  const [showMissed, setShowMissed] = useState(false);
  const [name, setName] = useState("");
  const key = monthKey(ym.y, ym.m); const days = daysInMonth(ym.y, ym.m);
  const st = (id: string, d: number) => stateOf(checkins, key, id, d);
  const count = (id: string, v: 1 | 0) => Array.from({ length: days }, (_, i) => i + 1).filter((d) => st(id, d) === v).length;
  const total = habits.length * days;
  const done = habits.reduce((a, h) => a + count(h.id, 1), 0);
  const missed = habits.reduce((a, h) => a + count(h.id, 0), 0);
  const pct = total ? Math.round(((showMissed ? missed : done) / total) * 100) : 0;
  const shift = (n: number) => { const d = new Date(ym.y, ym.m + n, 1); setYm({ y: d.getFullYear(), m: d.getMonth() }); };
  const add = () => { const t = name.trim(); if (t) { habitActions.add(t); setName(""); } };

  const size = 420, c = size / 2, outer = 175, inner = 58, gapR = 3, sweep = 300;
  const ringW = Math.min(20, (outer - inner) / Math.max(habits.length, 1) - gapR);
  const seg = sweep / days;

  const MonthNav = (
    <div className="flex items-center gap-2 text-sm">
      <button onClick={() => shift(-1)} aria-label="Previous month" className="text-muted-foreground hover:text-foreground"><ChevronLeft size={16} /></button>
      <span className="w-20 text-center font-medium">{MONTHS[ym.m]} {ym.y}</span>
      <button onClick={() => shift(1)} aria-label="Next month" className="text-muted-foreground hover:text-foreground"><ChevronRight size={16} /></button>
    </div>
  );

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Daily habits</p>
          <h2 className="font-display text-2xl">Habit circle</h2>
        </div>
        <div className="inline-flex rounded-full bg-muted p-1">
          {([["wheel", CircleDot, "Wheel"], ["calendar", CalendarDays, "Calendar"], ["manage", Settings, "Habits"]] as const).map(([t, Icon, label]) => (
            <Button key={t} size="sm" variant={tab === t ? "secondary" : "ghost"} onClick={() => setTab(t)} aria-pressed={tab === t}><Icon size={14} />{label}</Button>
          ))}
        </div>
      </div>

      {tab === "wheel" && (
        <>
          <div className="relative mt-4">
            <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-sm">
              {habits.map((h, hi) => {
                const r = outer - ringW / 2 - hi * (ringW + gapR);
                return Array.from({ length: days }, (_, i) => (
                  <path key={`${h.id}-${i}`} d={arc(c, c, r, i * seg + 0.3, (i + 1) * seg - 0.3)} fill="none" stroke={fill(st(h.id, i + 1))}
                    strokeWidth={ringW} className="cursor-pointer transition-[stroke] hover:opacity-75" onClick={() => habitActions.toggle(key, h.id, i + 1)}>
                    <title>{`${h.name} — day ${i + 1}`}</title>
                  </path>
                ));
              })}
              {Array.from({ length: days }, (_, i) => {
                const [x, y] = polar(c, c, outer + 12, (i + 0.5) * seg);
                return <text key={i} x={x} y={y} fontSize={10} textAnchor="middle" dominantBaseline="middle" fill="var(--muted-foreground)">{i + 1}</text>;
              })}
              {habits.map((h, hi) => (
                <text key={h.id} x={c - 6} y={c - (outer - ringW / 2 - hi * (ringW + gapR))} fontSize={11} textAnchor="end" dominantBaseline="middle" fill={`var(--${h.color})`}>{h.name}</text>
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="pointer-events-auto">{MonthNav}</div>
              <button className="pointer-events-auto text-4xl font-semibold" onClick={() => setShowMissed(!showMissed)}>{pct}%</button>
              <span className="text-[10px] tracking-wider text-muted-foreground">{showMissed ? "MISSED" : "COMPLETED"}</span>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">Tap a day: once = done, twice = missed, three times = clear · {done} of {total} check-ins</p>
        </>
      )}

      {tab === "calendar" && (
        <div className="mt-4 space-y-5">
          <div className="flex justify-center">{MonthNav}</div>
          {habits.map((h) => (
            <div key={h.id}>
              <div className="mb-2 flex justify-between text-sm"><span style={{ color: `var(--${h.color})` }}>{h.name}</span><span className="text-muted-foreground">{count(h.id, 1)}/{days}</span></div>
              <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(16,minmax(0,1fr))]">
                {Array.from({ length: days }, (_, i) => {
                  const s = st(h.id, i + 1);
                  return (
                    <button key={i} onClick={() => habitActions.toggle(key, h.id, i + 1)} className={`aspect-square rounded-md text-xs ${s === undefined ? "text-muted-foreground" : "text-primary-foreground"}`}
                      style={{ background: fill(s) }} aria-label={`${h.name} day ${i + 1}`}>{i + 1}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "manage" && (
        <div className="mt-4 space-y-4">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New habit name" className="bg-background" />
            <Button><Plus />Add</Button>
          </form>
          <ul className="divide-y divide-border">
            {habits.map((h, i) => (
              <li key={h.id} className="flex items-center gap-2 py-2">
                <div className="flex flex-col">
                  <button disabled={i === 0} onClick={() => habitActions.move(h.id, -1)} aria-label="Move up" className="text-muted-foreground disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button disabled={i === habits.length - 1} onClick={() => habitActions.move(h.id, 1)} aria-label="Move down" className="text-muted-foreground disabled:opacity-30"><ArrowDown size={14} /></button>
                </div>
                <div className="flex gap-1">
                  {PALETTE.map((p) => (
                    <button key={p} onClick={() => habitActions.update(h.id, { color: p })} aria-label={`Color ${p}`}
                      className={`h-4 w-4 rounded-full ${h.color === p ? "ring-2 ring-foreground" : ""}`} style={{ background: `var(--${p})` }} />
                  ))}
                </div>
                <input value={h.name} onChange={(e) => habitActions.update(h.id, { name: e.target.value })} className="min-w-0 flex-1 bg-transparent px-2 outline-none" />
                <button onClick={() => confirm(`Delete ${h.name}?`) && habitActions.remove(h.id)} aria-label="Delete habit"><Trash2 size={16} className="text-destructive" /></button>
              </li>
            ))}
          </ul>
          <button onClick={() => confirm("Clear check-ins for this month?") && habitActions.clearMonth(key)} className="text-sm text-destructive">Clear this month's check-ins</button>
        </div>
      )}
    </div>
  );
}
