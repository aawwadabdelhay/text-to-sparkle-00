import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Learning Journey Tracker" },
      { name: "description", content: "Choose a new password for your Learning Journey account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRecovery(window.location.hash.includes("type=recovery"));
    setChecked(true);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { toast.error(error.message); return; }
      toast.success("Password updated.");
      navigate({ to: "/", replace: true });
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-app px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8">
        <h1 className="font-display text-2xl">Set a new password</h1>
        {!checked ? null : !recovery ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              This page is for password-reset links. Open the link from your email, or sign in normally.
            </p>
            <button onClick={() => navigate({ to: "/auth" })}
              className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Go to sign in
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Choose a new password for your account.</p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <input type="password" required autoComplete="new-password" placeholder="New password"
                value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
              <input type="password" required autoComplete="new-password" placeholder="Confirm new password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
              <button type="submit" disabled={busy}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
                Update password
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
