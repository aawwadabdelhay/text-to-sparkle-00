import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canUsePlaylistTool, playlistIdFromUrl, readPlaylistPage, readYoutubeHtml, type PlaylistVideo } from "./playlist";

export const playlistAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => ({ allowed: canUsePlaylistTool(context.userId) }));

export const extractPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ url: z.string().max(2000) }).parse(value))
  .handler(async ({ data, context }): Promise<{ title?: string; videos?: PlaylistVideo[]; warning?: string; error?: string }> => {
    if (!canUsePlaylistTool(context.userId)) throw new Error("Forbidden");
    try {
      const id = playlistIdFromUrl(data.url);
      const url = `https://www.youtube.com/playlist?list=${id}&hl=en`;
      const headers = { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9" };
      let html = "";
      try {
        const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
        if (response.ok) html = await response.text();
      } catch { /* The public scraping connection can retrieve a blocked page. */ }
      if (!html.includes("ytInitialData")) {
        const key = process.env["FIRECRAWL_API_KEY"];
        const lovable = process.env["LOVABLE_API_KEY"];
        if (!key || !lovable) return { error: "YouTube is not responding, and Firecrawl is not configured." };
        const response = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/scrape", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key },
          body: JSON.stringify({ url, formats: ["rawHtml"], onlyMainContent: false }), signal: AbortSignal.timeout(60000),
        });
        if (!response.ok) {
          const body = await response.text();
          console.error(`Playlist scrape failed [${response.status}]: ${body}`);
          return { error: `Firecrawl could not retrieve this playlist (${response.status}). ${body.includes("Credit limit") || response.status === 402 ? "Check your workspace credits or spending limit." : "Please try again later."}` };
        }
        const result = await response.json() as { rawHtml?: string; data?: { rawHtml?: string } };
        html = result.data?.rawHtml ?? result.rawHtml ?? "";
      }
      const { data: initial, config } = readYoutubeHtml(html);
      const first = readPlaylistPage(initial, id);
      const videos = [...first.videos];
      let token = first.continuation;
      let warning: string | undefined;
      const seen = new Set<string>();
      while (token) {
        if (seen.has(token)) { warning = "YouTube repeated a page; the list may be incomplete."; break; }
        seen.add(token);
        try {
          const response = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
            method: "POST", headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ context: config["INNERTUBE_CONTEXT"] ?? { client: { clientName: "WEB", clientVersion: config["INNERTUBE_CLIENT_VERSION"] ?? "2.20261026.01.00", hl: "en", gl: "US" } }, continuation: token }),
            signal: AbortSignal.timeout(20000),
          });
          if (!response.ok) throw new Error(`YouTube page ${response.status}`);
          const page = readPlaylistPage(await response.json(), id);
          videos.push(...page.videos);
          token = page.continuation;
        } catch (error) {
          console.error("Playlist pagination failed", error);
          warning = "YouTube did not return the remaining pages. These are only the links retrieved so far.";
          break;
        }
      }
      if (!videos.length) return { error: "No video URLs found. The playlist may be private, empty, or unavailable." };
      if (first.expected && videos.length < first.expected) warning = `Retrieved ${videos.length} of ${first.expected} entries. Private, deleted, or unavailable videos may be missing.`;
      return { title: first.title, videos, ...(warning ? { warning } : {}) };
    } catch (error) {
      console.error("Playlist extraction failed", error);
      return { error: error instanceof Error ? error.message : "Could not extract this playlist." };
    }
  });