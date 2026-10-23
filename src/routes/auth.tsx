import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const safe = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/");

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => {
    const redirect = typeof s["redirect"] === "string" ? (s["redirect"] as string) : undefined;
    return { redirect };
  },
  head: () => ({
    meta: [
      { title: "Sign in — Learning Journey Tracker" },
      { name: "description", content: "Sign in to your learning journey: courses, study plans, notes and habits." },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Sign in — Learning Journey Tracker" },
      { property: "og:description", content: "Sign in to your learning journey: courses, study plans, notes and habits." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitConfirm, setAwaitConfirm] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const stash = sessionStorage.getItem("ljt-auth-redirect");
        sessionStorage.removeItem("ljt-auth-redirect");
        navigate({ to: stash ?? safe(search.redirect), replace: true });
      }
    });
  }, [navigate, search.redirect]);

  const go = (target?: string) => navigate({ to: safe(target ?? search.redirect), replace: true });

  const oauth = async (provider: "google" | "apple") => {
    if (search.redirect && search.redirect !== "/") sessionStorage.setItem("ljt-auth-redirect", safe(search.redirect));
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(error.message);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { toast.error(error.message); return; }
        go();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin },
        });
        if (error) { toast.error(error.message); return; }
        if (data.session) go();
        else setAwaitConfirm(true);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) { toast.error(error.message); return; }
        toast.success("Check your email for the reset link.");
        setMode("signin");
      }
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  if (awaitConfirm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background bg-app px-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center">
          <h1 className="font-display text-2xl">Check your email</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We sent a confirmation link to <span className="text-foreground">{email}</span>. Open it to activate your account, then sign in here.
          </p>
          <button onClick={() => { setMode("signin"); setAwaitConfirm(false); }} className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-app px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="font-display text-2xl tracking-tight">Learning<span className="text-primary">·</span>Journey</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot" ? "We'll email you a reset link." : mode === "signup" ? "Create your account" : "Welcome back"}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email" required autoComplete="email" placeholder="Email"
              value={email} onChange={(e) => setEmail(e.target.value)} className={input}
            />
            {mode !== "forgot" && (
              <input
                type="password" required autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={input}
              />
            )}
            <button type="submit" disabled={busy}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                <button type="button" onClick={() => oauth("apple")}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    <path d="M17.05 12.54c-.03-2.62 2.14-3.88 2.24-3.94-1.22-1.79-3.12-2.03-3.8-2.06-1.62-.16-3.15.95-3.97.95-.82 0-2.08-.93-3.42-.9-1.76.03-3.38 1.02-4.28 2.59-1.83 3.17-.47 7.87 1.31 10.44.87 1.26 1.91 2.67 3.27 2.62 1.31-.05 1.81-.85 3.4-.85 1.58 0 2.03.85 3.42.82 1.42-.03 2.32-1.28 3.19-2.55 1-1.46 1.4-2.87 1.42-2.95-.03-.01-2.74-1.05-2.78-4.17zM14.44 4.83c.72-.88 1.21-2.09 1.08-3.3-1.04.04-2.31.69-3.06 1.56-.67.78-1.26 2.02-1.1 3.21 1.16.09 2.35-.59 3.08-1.47z"/>
                  </svg>
                  Continue with Apple
                </button>
                <button type="button" onClick={() => oauth("google")}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                    <path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.2 1.66l3.12-3.12C17.4 1.79 14.89.75 12 .75 7.9.75 4.36 3.09 2.65 6.53l3.64 2.83C7.17 6.94 9.38 5.04 12 5.04z"/>
                    <path fill="#4285F4" d="M23.25 12.26c0-.79-.07-1.55-.2-2.26H12v4.51h6.32c-.27 1.46-1.09 2.7-2.32 3.53l3.62 2.81c2.12-1.96 3.63-4.85 3.63-8.59z"/>
                    <path fill="#FBBC05" d="M6.29 14.16a6.1 6.1 0 0 1 0-3.9L2.65 7.43a10.53 10.53 0 0 0 0 9.56l3.64-2.83z"/>
                    <path fill="#34A853" d="M12 23.25c3.04 0 5.59-1 7.45-2.72l-3.62-2.81c-1 .68-2.28 1.08-3.83 1.08-2.62 0-4.83-1.9-5.71-4.32l-3.64 2.83c1.71 3.44 5.25 5.94 9.35 5.94z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            </>
          )}

          <div className="mt-5 space-y-2 text-center text-sm">
            {mode === "signin" && (
              <>
                <p className="text-muted-foreground">
                  New here?{" "}
                  <button onClick={() => setMode("signup")} className="text-primary hover:underline">Create an account</button>
                </p>
                <button onClick={() => setMode("forgot")} className="text-muted-foreground hover:text-foreground hover:underline">
                  Forgot your password?
                </button>
              </>
            )}
            {mode === "signup" && (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button onClick={() => setMode("signin")} className="text-primary hover:underline">Sign in</button>
              </p>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("signin")} className="text-muted-foreground hover:text-foreground hover:underline">
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
