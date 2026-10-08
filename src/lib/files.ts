import { useEffect, useState } from "react";

// Uploaded files live in the browser's IndexedDB (too large for localStorage).
const DB = "ljt-files", STORE = "files";
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
export const saveFile = (id: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, id));
export const loadFile = (id: string) => tx<Blob | undefined>("readonly", (s) => s.get(id));
export const removeFile = (id: string) => tx("readwrite", (s) => s.delete(id));

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
