# Time blocks for scheduled tasks

## What you'll get

1. **Each task has a start and end time.** The task shows its exact block, e.g. "09:00 – 09:45". The end time comes from the lesson's length, and you can change it.
2. **A day timeline in the Planner.** Open any day to see an hour grid from 6:00 to 24:00. Each task is a colored block placed at its time. A longer lesson makes a taller block, so you can see your whole day at a glance.
3. **Set or change the block easily.**
   - Drag a lesson from "Up next" onto an hour row to book it at that time.
   - Drag a block to another time to move it.
   - Tap a task to edit its start time and length (15-minute steps).
4. **Clash warning.** If two blocks overlap, both are outlined in red so you can fix it.
5. **Auto-plan uses time blocks.** You choose a study start time (for example 18:00). Auto-plan then books lessons one after another from that time, still within your daily study limit.
6. **Today on the home page** lists today's tasks in time order, with their time blocks and a "Now" marker on the current task.
7. **Tasks you planned before this change** stay as "Anytime" tasks above the timeline until you give them a time.

## Technical details

- Reuse the existing `start` (HH:MM) and `minutes` fields on `Task`. No new stored fields, so existing saved schedules and cloud sync keep working.
- New pure helpers in `src/lib/schedule.ts`: `endTime(start, minutes)`, `overlaps(tasks)`, `nextFreeSlot(tasks, from, minutes)`. Extend `autoPlan` with an optional `startTime` that assigns sequential start times.
- Planner: a Week/Day toggle. Day view renders an absolutely positioned hour grid with native drag-and-drop on 15-minute rows. The edit popover calls `actions.updateTask`.
- `TaskRow` shows the start–end range and an overlap state.
- Tests: end-time calculation, overlap detection, and auto-plan assigning back-to-back times within the daily limit.
