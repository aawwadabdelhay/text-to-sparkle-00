import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cleanLinkedinUrl, parseLinkedinCourse } from "./linkedin";

const itemSchema = z.object({ title: z.string(), type: z.string().optional(), minutes: z.number().optional(), url: z.string().optional() });
const courseSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  sections: z.array(z.object({ title: z.string(), items: z.array(itemSchema).default([]) })).default([]),
});
export const importResultSchema = z.object({
  kind: z.enum(["course", "path"]).default("course"),
  title: z.string(),
  courses: z.array(courseSchema).default([]),
});
export type ImportResult = z.infer<typeof importResultSchema>;

const jsonSchema = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["course", "path"], description: "'path' if the page is a learning path, specialization, certificate or program containing several courses; otherwise 'course'" },
    title: { type: "string" },
    courses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      type: { type: "string", enum: ["video", "reading", "quiz", "assignment", "note"] },
                      minutes: { type: "number" },
                      url: { type: "string", description: "Absolute URL of this individual lecture/lesson page or video, if linked on the page" },
                    },
                    required: ["title"],
                  },
                },
              },
              required: ["title"],
            },
          },
        },
        required: ["title"],
      },
    },
  },
  required: ["title", "courses"],
};

export const importFromUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ url: z.string().url().max(2000) }).parse(d))
  .handler(async ({ data }): Promise<{ result?: ImportResult; error?: string }> => {
    if (/(^|\.)linkedin\.com$/.test(new URL(data.url).hostname)) {
      const clean = cleanLinkedinUrl(data.url);
      if (!clean) return { error: "That LinkedIn link isn't a course page. Open the course and copy its link." };
      try {
        const r = await fetch(clean, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" } });
        if (!r.ok) { console.error(`LinkedIn fetch failed [${r.status}]`); return { error: "LinkedIn didn't share that course page. Try again in a minute." }; }
        const course = parseLinkedinCourse(await r.text());
        if (!course) return { error: "No lessons were found on that LinkedIn page." };
        return { result: { kind: "course", title: course.title, courses: [course] } };
      } catch (e) {
        console.error("LinkedIn import error", e);
        return { error: "Couldn't reach LinkedIn. Try again." };
      }
    }
    const lovable = process.env["LOVABLE_API_KEY"];
    const fc = process.env["FIRECRAWL_API_KEY"];
    if (!lovable || !fc) return { error: "Importer is not configured." };
    const res = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": fc },
      body: JSON.stringify({
        url: data.url,
        onlyMainContent: false,
        waitFor: 2000,
        formats: [{
          type: "json",
          schema: jsonSchema,
          prompt: "Extract the full public syllabus/curriculum of this online course or learning path: every course, every section/module/week, and every lecture/lesson inside it with its type (video, reading, quiz, assignment) and duration in minutes when shown. For a single course return exactly ONE entry in courses whose sections are its modules/weeks/chapters; only use several courses for a multi-course learning path. Include each lecture's own absolute link (url) when the page links to it. Keep the original order. Do not invent lessons or links.",
        }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Firecrawl failed [${res.status}]: ${body}`);
      if (res.status === 402 || body.includes("Credit limit")) return { error: "Not enough credits to import right now." };
      return { error: "Couldn't read that page. Check the link and try again." };
    }
    const json = (await res.json()) as { data?: { json?: unknown }; json?: unknown };
    const parsed = importResultSchema.safeParse(json.data?.json ?? json.json);
    if (!parsed.success || !parsed.data.courses.length) return { error: "No lessons were found on that page. It may require a login." };
    const base = new URL(data.url);
    for (const c of parsed.data.courses) for (const sec of c.sections) for (const it of sec.items) {
      if (!it.url) continue;
      try { const u = new URL(it.url, base); it.url = /^https?:$/.test(u.protocol) ? u.href : undefined; } catch { it.url = undefined; }
    }
    return { result: parsed.data };
  });
