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
- Import from a link scrapes public syllabus pages server-side (src/lib/import.functions.ts via the Firecrawl connector) and maps results into the store with actions.importCourses.
