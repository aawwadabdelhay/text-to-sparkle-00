# Brand presentation for Learning Journey

A ready-to-present slide deck (PowerPoint, about 10 slides) that explains what the site does and shows its brand look. Saved to Files, so the app itself does not change.

## Slides

1. **Cover** – "Learning Journey: organize your self-study", with the app's dark background and teal-to-pink gradient.
2. **The problem** – courses are spread across YouTube, Udemy, Coursera and LinkedIn Learning, and progress is hard to track.
3. **What the site does** – one place for learning paths, courses, sections and lessons.
4. **Import from a link** – paste a public course page and the outline, sections, lessons and durations are filled in for you.
5. **Course tree plan and Journey map** – numbered sections on a spine, clickable lesson tiles, completion checkboxes.
6. **Lesson notebook** – type `/` to add text, headings, checklists, photos, documents and links, then format them. Pasted content keeps its formatting.
7. **Progress and stats** – completion bars and rings, study streak, hours done and hours left.
8. **Habit wheel** – daily check-ins and a calendar on the home dashboard.
9. **Accounts and sync** – sign in with email, Google or Apple, and your data follows you across devices.
10. **Color palette** – a swatch for each color with its name, role and hex code:
    - Night Indigo (background) and Card Indigo (surfaces)
    - Teal (primary, progress), Pink (secondary), Gold (accent)
    - Soft White (text), Muted Lavender-Grey (secondary text), Coral Red (delete and warnings)
    - Signature gradient: Teal to Pink
11. **Typography** – Fraunces for headings, Manrope for body text, each with sample lines and weights.
12. **Closing** – tagline and the site link (text-to-sparkle-00.lovable.app).

## Technical details

- Build the deck as a .pptx with python-pptx. Convert the oklch colors in `src/styles.css` to hex values.
- Use real screenshots of the app's pages, taken in the browser after signing in.
- Render each slide to an image to check the layout before delivering. Save the deck to `/mnt/documents/learning-journey-brand.pptx`.
