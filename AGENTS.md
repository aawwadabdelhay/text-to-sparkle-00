<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Learning data stays browser-persistent and backward-compatible through normalization because existing users may already have saved study maps; it now syncs to Lovable Cloud per account (see cloud rule below).
- Cloud sync: the app pages live under `src/routes/_authenticated/` (integration-style gate redirects to `/auth`); `src/lib/cloud-sync.ts` mirrors the whole learning state and habit state as JSONB rows (`user_data`, `habit_data`, RLS owner-only) with last-write-wins on `updatedAt`, and lesson file blobs mirror to the private `lesson-files` bucket under `${userId}/${fileId}`. localStorage stays the working copy so offline use and old saved maps keep working.
- Course tree plans use a standalone sibling route and the existing store actions, so lesson navigation and completion share saved progress with all other views.
- Habit tracking lives in its own browser-local store (src/lib/habits.ts, separate localStorage key) so learning data stays untouched; habit state syncs with the learning data through the same cloud-sync flow.
- Notebook text uses Tiptap JSON alongside its plain-text mirror; migrate legacy text and styles only at render time so old notebooks remain intact and formatted edits sync through existing state.
- Import from a link scrapes public syllabus pages server-side (src/lib/import.functions.ts via the Firecrawl connector) and maps results into the store with actions.importCourses.
- Private playlist extraction lives in a standalone authenticated route; visibility and every extraction request use a server-validated immutable account-ID allowlist, not email or browser storage, so other accounts cannot invoke it. YouTube playlist entries are parsed in order with continuation requests and Firecrawl raw HTML fallback; incomplete retrieval must be labeled.
- Planner logic (time blocks, day zones, carry-over, focus totals) lives as pure functions in src/lib/schedule.ts with tests; store actions only wrap them, so rules stay testable. The Pomodoro timer keeps its running state under its own browser key so it survives reloads.
