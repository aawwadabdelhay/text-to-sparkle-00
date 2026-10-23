import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const itemSchema = z.object({ title: z.string(), type: z.string().optional(), minutes: z.number().optional() });
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
          prompt: "Extract the full public syllabus/curriculum of this online course or learning path: every course, every section/module/week, and every lecture/lesson inside it with its type (video, reading, quiz, assignment) and duration in minutes when shown. Keep the original order. Do not invent lessons.",
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
    return { result: parsed.data };
  });
