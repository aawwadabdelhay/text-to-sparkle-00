import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Uploaded files live in the browser's IndexedDB (fast, offline-friendly) and
// are mirrored to the account's private cloud storage so they follow the user
// to other devices.
const DB = "ljt-files", STORE = "files", BUCKET = "lesson-files";
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const q = fn(db.transaction(STORE, mode).objectStore(STORE));
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}
async function filePath(id: string): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ? `${data.user.id}/${id}` : null;
}

export const saveFile = async (id: string, blob: Blob) => {
  await tx("readwrite", (s) => s.put(blob, id));
  const path = await filePath(id);
  if (!path) return;
  const opts = blob.type ? { upsert: true as const, contentType: blob.type } : { upsert: true as const };
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, opts);
  if (error) console.warn("Could not save file to your account:", error.message);
};

export const loadFile = async (id: string) => {
  const local = await tx<Blob | undefined>("readonly", (s) => s.get(id));
  if (local) return local;
  const path = await filePath(id);
  if (!path) return undefined;
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return undefined;
  tx("readwrite", (s) => s.put(data, id)).catch(() => {});
  return data;
};

export const removeFile = async (id: string) => {
  await tx("readwrite", (s) => s.delete(id));
  const path = await filePath(id);
  if (path) supabase.storage.from(BUCKET).remove([path]).catch(() => {});
};

export function useFileUrl(id?: string) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!id) return;
    let u: string | undefined; let live = true;
    loadFile(id).then((b) => { if (b && live) { u = URL.createObjectURL(b); setUrl(u); } }).catch(() => {});
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return url;
}
