import { supabase } from "@/integrations/supabase/client";
import { getState, onPersist, replaceState } from "@/lib/store";
import { getHabitState, onHabitPersist, replaceHabitState } from "@/lib/habits";

// Keeps each account's learning data and habits in sync with Lovable Cloud.
// Local storage stays the working copy (offline-friendly); every change is
// pushed a moment later, and on sign-in the newer copy wins.

let started = false;

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function pushData(): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const payload = { user_id: uid, data: JSON.parse(JSON.stringify(getState())), updated_at: new Date().toISOString() };
  await supabase.from("user_data").upsert(payload);
}

async function pushHabits(): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const payload = { user_id: uid, data: JSON.parse(JSON.stringify(getHabitState())), updated_at: new Date().toISOString() };
  await supabase.from("habit_data").upsert(payload);
}

const timers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};
function schedulePush(kind: "state" | "habits") {
  if (typeof window === "undefined") return;
  const t = timers[kind];
  if (t) clearTimeout(t);
  timers[kind] = setTimeout(() => {
    (kind === "state" ? pushData() : pushHabits()).catch(() => {});
  }, 2000);
}

async function pullOnce(): Promise<void> {
  const uid = await currentUserId();
  if (!uid || typeof window === "undefined") return;

  const { data: row } = await supabase.from("user_data").select("data").eq("user_id", uid).maybeSingle();
  const cloud = (row?.data ?? null) as { updatedAt?: number } | null;
  const local = getState();
  if (!cloud) {
    await pushData(); // first sign-in: seed the account with what's in this browser
  } else if (local.updatedAt > (cloud.updatedAt ?? 0)) {
    await pushData(); // this browser has newer changes
  } else if ((cloud.updatedAt ?? 0) > local.updatedAt) {
    try { localStorage.setItem("ljt-state-backup", JSON.stringify(local)); } catch {}
    replaceState(cloud);
  }

  const { data: hrow } = await supabase.from("habit_data").select("data").eq("user_id", uid).maybeSingle();
  const hCloud = (hrow?.data ?? null) as { updatedAt?: number } | null;
  const hLocal = getHabitState();
  if (!hCloud) {
    await pushHabits();
  } else if (hLocal.updatedAt > (hCloud.updatedAt ?? 0)) {
    await pushHabits();
  } else if ((hCloud.updatedAt ?? 0) > hLocal.updatedAt) {
    try { localStorage.setItem("ljt-habits-backup", JSON.stringify(hLocal)); } catch {}
    replaceHabitState(hCloud);
  }
}

export function initCloudSync(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  onPersist(() => schedulePush("state"));
  onHabitPersist(() => schedulePush("habits"));
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") pullOnce().catch(() => {});
  });
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) pullOnce().catch(() => {});
  });
}
