import { describe, expect, it } from "vitest";
import { canUsePlaylistTool, PLAYLIST_OWNER_ID, playlistIdFromUrl, readPlaylistPage } from "@/lib/playlist";

describe("Private playlist access", () => {
  it("allows only Ahmed's verified account ID", () => {
    expect(canUsePlaylistTool("17076c80-90a7-48d1-8328-223838bd7ded")).toBe(true);
    expect(canUsePlaylistTool("another-user")).toBe(false);
    expect(canUsePlaylistTool(undefined)).toBe(false);
    expect(canUsePlaylistTool("a.awwad.abdelhay@gmail.com")).toBe(false);
  });
});
describe("Playlist extraction", () => {
  it("accepts only YouTube playlist links", () => {
    expect(playlistIdFromUrl("https://www.youtube.com/watch?v=ZDa-Z5JzLYM&list=PL-osiE80TeTsqhIuOqKhwlXsIBIdSeYtc")).toBe("PL-osiE80TeTsqhIuOqKhwlXsIBIdSeYtc");
    expect(() => playlistIdFromUrl("https://evil.test/?list=PL-osiE80TeTsqhIuOqKhwlXsIBIdSeYtc")).toThrow();
    expect(() => playlistIdFromUrl("https://youtube.com/watch?v=ZDa-Z5JzLYM")).toThrow();
  });
  it("preserves playlist order and repeat entries, excluding recommendations", () => {
    const video = (id: string) => ({ playlistVideoRenderer: { videoId: id, title: { runs: [{ text: id }] } } });
    const page = readPlaylistPage({ contents: [video("ZDa-Z5JzLYM"), video("BJ-VvGyQxho"), video("ZDa-Z5JzLYM")], recommendations: [video("rq8cL2XMM5M")] }, "PLtest123456");
    expect(page.videos.map((v) => v.url)).toEqual(["https://www.youtube.com/watch?v=ZDa-Z5JzLYM", "https://www.youtube.com/watch?v=BJ-VvGyQxho", "https://www.youtube.com/watch?v=ZDa-Z5JzLYM"]);
  });
  it("reads modern video entries and continuation pages", () => {
    const page = readPlaylistPage({ onResponseReceivedActions: [{ appendContinuationItemsAction: { continuationItems: [
      { lockupViewModel: { contentId: "ZDa-Z5JzLYM", metadata: { lockupMetadataViewModel: { title: { content: "Lecture 1" } } }, rendererContext: { commandContext: { onTap: { innertubeCommand: { watchEndpoint: { playlistId: "PLtest123456" } } } } } } },
      { continuationItemViewModel: { continuationCommand: { innertubeCommand: { continuationCommand: { token: "next-page" } } } } },
    ] } }] }, "PLtest123456");
    expect(page.videos[0]?.title).toBe("Lecture 1");
    expect(page.continuation).toBe("next-page");
    expect(PLAYLIST_OWNER_ID).not.toBe("another-user");
  });
});