import { afterEach, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain = { middleware: () => chain, inputValidator: () => chain, handler: (handler: unknown) => handler };
    return chain;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { extractPlaylist } from "@/lib/playlist.functions";

afterEach(() => vi.unstubAllGlobals());

it("rejects another signed-in account before any upstream request", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const handler = extractPlaylist as unknown as (input: { data: { url: string }; context: { userId: string } }) => Promise<unknown>;
  await expect(handler({ data: { url: "https://www.youtube.com/playlist?list=PL-osiE80TeTsqhIuOqKhwlXsIBIdSeYtc" }, context: { userId: "another-user" } })).rejects.toThrow("Forbidden");
  expect(fetch).not.toHaveBeenCalled();
});