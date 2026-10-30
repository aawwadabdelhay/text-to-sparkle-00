# Planner: time blocks, day zones, carry-over and Pomodoro focus

## What you'll get

### 1. Time blocks for tasks
- Each task gets a start and end time, e.g. "18:00 – 19:00". The length starts at the lesson's duration and you can change it.
- **Day view** shows a timeline from 6:00 to 24:00. Tasks appear as colored blocks at their times.
- Drag lessons onto an hour to book them, drag blocks to move them, or tap a block to edit its time and length.
- Blocks that overlap get a red outline.
- Tasks with no time yet stay in an "Anytime" list until you place them.

### 2. Organize your day (day zones)
- Set up a weekly routine of colored zones, e.g. **Work 07:00–16:00** (grey), **Study 18:00–21:00** (teal), **Rest** (gold). You pick the name, color, time and days.
- Zones show as background bands on the timeline, so you can see where study fits.
- Auto-plan and drag-to-book place lessons only inside Study zones. It warns you if you drop a lesson into Work time.

### 3. Pomodoro focus (your lead measure)
- Each task has a **Pomodoro plan**: how many focus sessions it needs (for example, Lecture 1 = 2 to watch + 1 to apply in the schematic simulator).
- Each session has a label: **Watch, Apply/Simulate, Review**, or your own.
- A **Focus timer** (25 min focus / 5 min break by default, adjustable) runs on a task. Each finished session is logged against that task.
- Add review sessions on later days: "Add 1 Review Pomodoro tomorrow" creates a small task linked to the same lesson.
- **Lead measure scoreboard:** focused minutes and Pomodoros completed today and this week, compared with your weekly target. It also shows on the home page.

### 4. Easy rescheduling when life happens
- **Carry over the rest:** if you finished only part (e.g. 1 of 3 Pomodoros), "Move remaining to…" moves just the unfinished sessions to tomorrow or a day you pick, in the next free Study slot. What you already did stays credited to today.
- **Sick / skip day:** one button pushes every unfinished task for the day forward. The rest of your plan shifts with it, so you don't have to move tasks one by one, day after day.
- Overdue tasks are still flagged, with "Move all to today/tomorrow as priority."

## Technical details
- Data is added to the existing learning state as optional fields, so old schedules keep working and cloud sync stays the same:
  - `Task`: `start`, `minutes`, `pomodoros?: { label, planned, done }[]`, `kind?: "lesson" | "review"`.
  - `dayZones: { id, name, color (palette token), start, end, weekdays[] }[]`.
  - `focusLog: { id, taskId, itemId, date, minutes, label }[]` and `pomodoroSettings { focus, break, weeklyTarget }`.
- Pure helpers in `src/lib/schedule.ts`: `endTime`, `overlaps`, `freeStudySlots(zones, tasks, date)`, `splitRemaining(task)`, `shiftDay(tasks, date)`, and a zone-aware `autoPlan`.
- The focus timer component works from timestamps, so it survives reloads. A session is logged when it completes.
- Tests: end time, overlap detection, auto-plan stays inside Study zones and the daily limit, moving only the remaining Pomodoros, sick-day shifting, and focus-minute totals.
