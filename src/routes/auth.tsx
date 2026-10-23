import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { toast } from "sonner";

const safe = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/");

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
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

  const oauth = async (provider: "google" | "lovable") => {
    if (search.redirect && search.redirect !== "/") sessionStorage.setItem("ljt-auth-redirect", safe(search.redirect));
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) toast.error(result.error.message);
    // When result.redirected the browser is navigating to the provider; nothing else to do.
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
          <button onClick={() => setMode("signin")} className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
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
                <button type="button" onClick={() => oauth("google")}
                  className="w-full rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent">
                  Continue with Google
                </button>
                <button type="button" onClick={() => oauth("lovable")} className="w-full">
                  <span className="lovable-auth-button block w-full" style={{ width: "100%" }}>Continue with Lovable</span>
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
