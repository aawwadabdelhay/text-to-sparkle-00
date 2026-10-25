# Study planner: schedule lessons into time slots

## What you'll get

A new **Planner** page (link in the top menu) that turns your courses into a daily to-do schedule.

1. **Today / Week view**
   - Days shown as columns (week) or one day with hourly time slots (today).
   - Each planned task shows the lesson name, its course and section, type (video, quiz, assignment...) and duration.

2. **Assign lessons to a time slot**
   - A side panel lists "Up next" lessons that aren't done yet, grouped by course (in course order).
   - Drag a lesson onto a day/time slot, or press "Schedule" on a lesson and pick date, start time and length (defaults to the lesson's estimated minutes).
   - Optional "Auto-plan" button: fills the next free slots with the next unfinished lessons, up to a daily study time you choose (e.g. 2 hours per day).

3. **Follow tasks**
   - Today's tasks appear as a checklist on the home dashboard too.
   - Checking a task marks the lesson complete everywhere (course page, tree plan, progress, streak).
   - Clicking a task opens the lesson page.

4. **Reschedule unfinished lessons**
   - Any task from a past day that wasn't completed is shown as **Overdue**.
   - One button: "Move to tomorrow as priority" — it goes to the top of tomorrow's list, marked with a priority flag.
   - At the start of each day, a banner offers to move all of yesterday's unfinished tasks to today in one click.
   - Each task also has a menu: Move to tomorrow, Pick another day, Remove from plan.

## Technical details

- Add `schedule: { id, mapId, sectionId, itemId, date, start?, minutes, priority?, rescheduledFrom? }[]` to the existing learning state in `src/lib/store.ts`, normalized as optional so old saved data keeps working; it syncs to the account automatically with the existing cloud sync.
- Store actions: `scheduleItem`, `unscheduleItem`, `moveTask(date, priority)`, `rollOverOverdue()`, `autoPlan(dailyMinutes, fromDate)`.
- New route `src/routes/_authenticated/planner.tsx` with its own page title/description; nav link in `Shell`.
- "Today" widget on the home dashboard reusing the same actions.
- Native drag-and-drop matching the existing reorder pattern; tap-to-schedule fallback for phones.
- Tests for rollover (unfinished tasks move to tomorrow, flagged priority, sorted first) and auto-plan respecting the daily limit.
