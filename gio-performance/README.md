# GIO PERFORMANCE — V1

Athlete Management System · Version 1. Two sections:

- **01 — Training Journal:** Giorgi's weekly schedule (repeats every week), attendance (attended / partial / missed), comment, duration, rating, team statistics (16A, 18A, 18B, physical), weekly and monthly history, schedule editing.
- **02 — Speed Training:** 5 categories (First Step, Acceleration, Lateral Quickness, Change of Direction, Reaction), 21 starting exercises, photo upload / video link, instructions, sets/reps/rest, performance logging, notes. Add, edit and delete exercises.

The **Backup** page has JSON export/import. Data is stored in the browser (LocalStorage) on that one device.

## Roadmap
- V2 — Recovery & Readiness
- V3 — Performance Tracking
- V4 — Advanced Training

The previous large version (V0) is kept in `archive/v0/`. Parts of it (readiness, tests, charts) can be reused in V2/V3.

## Structure
```
src/head.html   title, fonts
src/style.css   design
src/body.html   shell
src/data.js     schedule, types, categories, exercises
src/app.js      logic
build.py        → index.html (static hosting) and dist/artifact.html (claude.ai)
```

## How to update
1. Change a file in `src/`.
2. `python3 build.py`
3. Check: `python3 -m http.server` → http://localhost:8000
4. Publish: ask Claude to republish `dist/artifact.html` to the same URL, or push to GitHub Pages.

A new version does not delete data: it stays in the browser. When the structure changes, `migrate()` in `app.js` fills in the new fields.
