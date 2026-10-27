export const PLAYLIST_OWNER_ID = "17076c80-90a7-48d1-8328-223838bd7ded";
export const canUsePlaylistTool = (userId: string | undefined) => userId === PLAYLIST_OWNER_ID;

export interface PlaylistVideo { id: string; title: string; url: string }
type Obj = Record<string, any>;

export function playlistIdFromUrl(input: string): string {
  const url = new URL(input);
  if (url.protocol !== "https:" || !["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(url.hostname)) {
    throw new Error("Enter a YouTube playlist link.");
  }
  const id = url.searchParams.get("list");
  if (!id || !/^[A-Za-z0-9_-]{10,150}$/.test(id)) throw new Error("This link needs a YouTube playlist ID.");
  return id;
}

export function readPlaylistPage(data: Obj, playlistId: string) {
  const videos: PlaylistVideo[] = [];
  let continuation: string | undefined;
  let expected: number | undefined;
  const title = data["metadata"]?.playlistMetadataRenderer?.title ?? data["header"]?.playlistHeaderRenderer?.title?.simpleText ?? "YouTube playlist";
  const count = data["header"]?.playlistHeaderRenderer?.numVideosText?.runs?.map((r: Obj) => r["text"]).join("");
  if (count) expected = Number(count.replace(/[^0-9]/g, "")) || undefined;
  function visit(value: any) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const legacy = value.playlistVideoRenderer;
    const modern = value.lockupViewModel;
    const endpoint = modern?.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint;
    const id = legacy?.videoId ?? (endpoint?.playlistId === playlistId ? modern?.contentId : undefined);
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      const name = legacy?.title?.runs?.map((r: Obj) => r["text"]).join("") ?? modern?.metadata?.lockupMetadataViewModel?.title?.content ?? "Unavailable video";
      videos.push({ id, title: name, url: `https://www.youtube.com/watch?v=${id}` });
      return;
    }
    const next = value.continuationItemRenderer ?? value.continuationItemViewModel;
    if (next) {
      continuation = next.continuationEndpoint?.continuationCommand?.token ?? next.continuationCommand?.innertubeCommand?.continuationCommand?.token;
      return;
    }
    Object.values(value).forEach(visit);
  }
  // Never collect recommended video entries outside playlist contents.
  visit(data["contents"] ?? data["onResponseReceivedActions"] ?? data["onResponseReceivedEndpoints"] ?? data["continuationContents"]);
  return { title: String(title), videos, continuation, expected };
}

export function readYoutubeHtml(html: string) {
  const match = html.match(/(?:var ytInitialData\s*=|window\["ytInitialData"\]\s*=)\s*(\{.*?\});?\s*<\/script>/s);
  if (!match?.[1]) throw new Error("YouTube did not expose this playlist. Check that it is public or unlisted.");
  const configMatch = html.match(/ytcfg\.set\((\{.*?\})\);/s);
  return { data: JSON.parse(match[1]) as Obj, config: configMatch?.[1] ? JSON.parse(configMatch[1]) as Obj : {} };
}