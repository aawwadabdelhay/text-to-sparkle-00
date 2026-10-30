// Pure helpers for importing LinkedIn Learning course outlines (Firecrawl blocks linkedin.com).
export type LiItem = { title: string; type?: string; minutes?: number | undefined; url?: string | undefined };
export type LiCourse = { title: string; description?: string | undefined; sections: { title: string; items: LiItem[] }[] };

/** Unwraps learning-login/share links and strips tracking so we hit the public course page. */
export function cleanLinkedinUrl(raw: string): string | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (!/(^|\.)linkedin\.com$/.test(u.hostname)) return null;
  if (u.pathname.startsWith("/learning-login")) {
    const r = u.searchParams.get("redirect");
    if (!r) return null;
    try { u = new URL(r); } catch { return null; }
  }
  const m = u.pathname.match(/^\/learning\/([^/]+)/);
  if (!m || ["browse", "topics", "paths", "me", "search"].includes(m[1] ?? "")) return null;
  return `https://www.linkedin.com/learning/${m[1]}`;
}

const decode = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

export function parseDuration(s: string): number | undefined {
  const h = +(s.match(/(\d+)\s*h/)?.[1] ?? 0), m = +(s.match(/(\d+)\s*m/)?.[1] ?? 0), sec = +(s.match(/(\d+)\s*s/)?.[1] ?? 0);
  const total = h * 60 + m + sec / 60;
  return total > 0 ? Math.max(1, Math.round(total)) : undefined;
}

export function parseLinkedinCourse(html: string): LiCourse | null {
  let title = "", description: string | undefined;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { const d = JSON.parse(m[1] ?? ""); if (d["@type"] === "Course") { title = d.name; description = d.description; } } catch { /* skip */ }
  }
  if (!title) title = decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
  const sections: LiCourse["sections"] = [];
  const parts = html.split(/<li class="toc-section">/).slice(1);
  for (const part of parts) {
    const st = decode(part.match(/<button[^>]*show-more-less__more-button[^>]*>([\s\S]*?)<icon/)?.[1] ?? "");
    const items: LiItem[] = [];
    for (const it of part.split(/<li class="toc-item">/).slice(1)) {
      const t = decode(it.match(/table-of-contents__item-title">([\s\S]*?)<\/div>/)?.[1] ?? "");
      if (!t) continue;
      const href = it.match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
      let url: string | undefined;
      if (href) { try { const u = new URL(href); u.search = ""; url = u.href; } catch { /* skip */ } }
      const dur = decode(it.match(/table-of-contents__item-duration">([\s\S]*?)<\/div>/)?.[1] ?? "");
      items.push({ title: t, type: /quiz/i.test(t) ? "quiz" : "video", minutes: parseDuration(dur), url });
    }
    if (items.length) sections.push({ title: st || `Section ${sections.length + 1}`, items });
  }
  return title && sections.length ? { title, description, sections } : null;
}
