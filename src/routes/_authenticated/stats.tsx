import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Shell, Progress } from "@/components/Shell";
import { fmt, mapItems, stats, streak, useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Progress analytics — Learning Journey Tracker" },
      { name: "description", content: "Completion, study streak, time remaining and hours per section." },
      { property: "og:title", content: "Progress analytics — Learning Journey Tracker" },
      { property: "og:description", content: "See your learning streak and remaining study hours at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stats,
});

function Stats() {
  const { maps, studyDays } = useStore();
  const all = stats(maps.flatMap(mapItems));
  const cards = [
    ["Overall", `${all.pct}%`], ["Streak", `${streak(studyDays)} days`], ["Time left", fmt(all.leftMin)], ["Done", fmt(all.doneMin)],
  ];
  return (
    <Shell>
      <h1 className="font-display text-4xl">Progress analytics</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([k, v]) => (
          <div key={k} className="rounded-2xl border bg-card p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">{k}</p><p className="mt-2 font-display text-3xl">{v}</p></div>
        ))}
      </div>
      {maps.map((m) => {
        const s = stats(mapItems(m));
        const data = m.sections.map((x) => { const t = stats(x.items); return { name: x.title, Completed: +(t.doneMin / 60).toFixed(1), Remaining: +(t.leftMin / 60).toFixed(1) }; });
        return (
          <section key={m.id} className="mt-8 rounded-2xl border bg-card p-6">
            <div className="flex items-baseline justify-between"><h2 className="font-display text-2xl">{m.title}</h2><span className="text-sm text-muted-foreground">{s.pct}% · {fmt(s.leftMin)} left</span></div>
            <div className="mt-3"><Progress value={s.pct} /></div>
            {data.length > 0 && (
              <div className="mt-6 h-64">
                <ResponsiveContainer>
                  <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" unit="h" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="name" width={140} stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                    <Bar dataKey="Completed" stackId="a" fill="var(--primary)" radius={[4, 0, 0, 4]} />
                    <Bar dataKey="Remaining" stackId="a" fill="var(--muted)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        );
      })}
    </Shell>
  );
}
