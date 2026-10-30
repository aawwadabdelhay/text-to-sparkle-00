import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const URL = "https://text-to-sparkle-00.lovable.app/";
const TITLE = "Learning Journey — Organize your self-study from any course site";
const DESC =
  "Import courses from YouTube, Udemy, Coursera and LinkedIn Learning, see them as a tree plan, schedule lessons with a Pomodoro planner, and win your day with 4DX goals and habits.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Learning Journey",
          url: URL,
          description: DESC,
          applicationCategory: "EducationalApplication",
          offers: { "@type": "Offer", price: "0" },
        }),
      },
    ],
  }),
  component: Welcome,
});

const features = [
  { tag: "Import", color: "text-primary", title: "Import any course from a link", body: "Paste a YouTube playlist, Udemy, Coursera or LinkedIn Learning link. Every section, lecture name, duration and link is added for you." },
  { tag: "Tree plan", color: "text-secondary", title: "See your course as a tree plan", body: "Numbered sections on one spine, every lesson a tile you tick off. Your whole learning journey on one map." },
  { tag: "Planner", color: "text-accent", title: "Planner with time blocks and Pomodoro", body: "Put lessons into time slots around your work hours, focus with the built-in Pomodoro timer, and carry unfinished work to tomorrow." },
  { tag: "4DX", color: "text-primary", title: "Win the day with 4DX goals", body: "Turn a learning path into your wildly important goal. Hit small daily goals, keep a streak and check your weekly scoreboard." },
  { tag: "Habits", color: "text-secondary", title: "Habit wheel and calendar", body: "Track the daily habits behind your studying with a check-in wheel and calendar, right next to your courses." },
  { tag: "Notebook", color: "text-accent", title: "A notebook for every lesson", body: "Type / to add notes, photos, documents and videos. Format any word, in English or Arabic." },
];

function Welcome() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      const stash = sessionStorage.getItem("ljt-auth-redirect");
      sessionStorage.removeItem("ljt-auth-redirect");
      navigate({ to: stash ?? "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background bg-app text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-display text-xl tracking-tight">Learning<span className="text-primary">·</span>Journey</span>
        <Link to="/auth" search={{ redirect: undefined }} className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-16 text-center md:py-24">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">For self-learners</p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl leading-tight md:text-6xl">
            Your online courses, finally in one study plan
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Bring courses from YouTube, Udemy, Coursera and LinkedIn Learning together, plan your week, focus with Pomodoro and hit a small goal every day.
          </p>
          <Link to="/auth" search={{ redirect: undefined }} className="mt-10 inline-block rounded-xl bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90">
            Start free
          </Link>
        </section>

        <section aria-label="Features" className="grid gap-5 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.tag} className="rounded-2xl border bg-card p-6">
              <p className={`text-xs font-semibold uppercase tracking-wider ${f.color}`}>{f.tag}</p>
              <h2 className="mt-2 font-display text-xl">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </section>

        <section className="mb-20 rounded-2xl border bg-card p-10 text-center">
          <h2 className="font-display text-3xl">Start your learning journey today</h2>
          <p className="mt-3 text-muted-foreground">Free to use. Your progress syncs across your devices.</p>
          <Link to="/auth" search={{ redirect: undefined }} className="mt-6 inline-block rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground hover:bg-primary/90">
            Start free
          </Link>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">© Learning Journey</footer>
    </div>
  );
}
