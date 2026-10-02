# Learning path views and drag-and-drop

## What I’ll build

- Keep the current dark teal, pink, and gold color scheme.
- Add a homepage view switcher so study plans can be viewed as either cards or a learning-path tree.
- Let users drag one study plan onto another to group it beneath a named learning path, while retaining access to each diploma.
- Add a diploma view switcher between the current visual roadmap and a compact tree/list view.
- Replace module up/down controls with drag handles and direct drag-and-drop reordering.
- Make each learning item open its own page for managing its material and quizzes.
- Preserve the current progress bars, completion totals, and section statistics in both views.

## Screens and interactions

1. **Study plans home**
   - Card and tree toggle.
   - Create a learning path and assign/reorder diplomas by dragging.
   - Cards remain clickable to open the diploma.

2. **Diploma roadmap**
   - Visual-map and tree/list toggle.
   - Drag modules to position them in map view and reorder them in list view.
   - Module rows remain clickable to open module details.

3. **Module details**
   - Drag handle on each learning item for reordering.
   - Clicking an item opens its dedicated details page.

4. **Learning item details**
   - Add and manage materials.
   - Add and manage quizzes.
   - Show item, module, and diploma progress context.

## Technical details

- Extend the browser-saved data model with learning paths, ordering, materials, and quizzes.
- Add reorder and grouping actions without changing the existing persistence approach.
- Use native pointer/drag interactions and the project’s existing controls and design tokens.
- Add a dedicated item route and unique page metadata.
- Keep existing saved data compatible by treating new fields as optional and normalizing them when read.
- Verify desktop and mobile layouts, drag/drop flows, navigation, and the preview build.
