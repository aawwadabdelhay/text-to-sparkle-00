import { useEffect } from "react";
import { toast } from "sonner";
import { redo, undo } from "@/lib/store";

/** Ctrl/Cmd+Z undoes the last change, Ctrl+Y or Ctrl+Shift+Z redoes it. Text fields keep their own typing undo. */
export function UndoKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      const isUndo = k === "z" && !e.shiftKey;
      const isRedo = k === "y" || (k === "z" && e.shiftKey);
      if (!isUndo && !isRedo) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      const ok = isUndo ? undo() : redo();
      toast(ok ? (isUndo ? "Undone" : "Redone") : (isUndo ? "Nothing to undo" : "Nothing to redo"), { duration: 1500 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
