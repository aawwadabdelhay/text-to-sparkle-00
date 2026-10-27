import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Copy, Download, ListVideo, LoaderCircle, LockKeyhole, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractPlaylist, playlistAccess } from "@/lib/playlist.functions";

export const Route = createFileRoute("/_authenticated/playlist")({
  beforeLoad: async () => { if (!(await playlistAccess()).allowed) throw redirect({ to: "/" }); },
  head: () => ({ meta: [
    { title: "Private playlist URLs — Learning Journey" },
    { name: "description", content: "Private YouTube playlist video link extraction for Learning Journey." },
    { property: "og:title", content: "Private playlist URLs — Learning Journey" },
    { property: "og:description", content: "Account-only playlist URL collection." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: PlaylistTool,
});

function PlaylistTool() {
  const extract = useServerFn(extractPlaylist);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof extractPlaylist>> | null>(null);
  const links = result?.videos?.map((video) => video.url).join("\n") ?? "";
  const download = () => {
    const objectUrl = URL.createObjectURL(new Blob([links], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = objectUrl; a.download = "playlist-urls.txt"; a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };
  return <Shell>
    <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} />Back to maps</Link>
    <div className="flex items-center gap-3"><ListVideo className="text-primary" size={32} /><h1 className="font-display text-3xl sm:text-4xl">Playlist URLs</h1></div>
    <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole size={14} />Private · Your account only</p>
    <form className="mt-8 flex max-w-4xl flex-wrap items-end gap-3" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setResult(null);
      try { setResult(await extract({ data: { url } })); }
      catch { setResult({ error: "Couldn't extract this playlist. Please try again." }); }
      finally { setBusy(false); }
    }}>
      <div className="min-w-0 flex-1 basis-64"><label htmlFor="playlist-url" className="mb-2 block text-sm">YouTube playlist link</label><Input id="playlist-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.youtube.com/playlist?list=…" disabled={busy} /></div>
      <Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <ListVideo />}{busy ? "Extracting…" : "Extract URLs"}</Button>
    </form>
    {result?.error && <p role="alert" className="mt-6 text-destructive">{result.error}</p>}
    {result?.videos && <section className="mt-10 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-display text-2xl break-words">{result.title}</h2><p className="mt-1 text-sm text-muted-foreground">{result.videos.length} video links · Playlist order</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(links); toast.success("URLs copied"); } catch { toast.error("Copy failed. Download the list instead."); } }}><Copy />Copy all</Button><Button variant="outline" onClick={download}><Download />Download</Button></div></div>
      {result.warning && <p role="status" className="mt-4 text-sm text-secondary">{result.warning}</p>}
      <ol className="mt-5 divide-y border-y">{result.videos.map((video, index) => <li key={`${index}-${video.id}`} className="flex items-start gap-4 py-4"><span className="w-7 shrink-0 text-sm tabular-nums text-muted-foreground">{index + 1}</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{video.title}</p><a href={video.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-2 text-sm text-primary hover:underline"><span className="break-all">{video.url}</span><ExternalLink size={13} className="shrink-0" /></a></div></li>)}</ol>
    </section>}
  </Shell>;
}