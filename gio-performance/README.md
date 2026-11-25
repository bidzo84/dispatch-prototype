# GIO PERFORMANCE

Gio's basketball speed and athletic development platform: Dashboard, Today, a 6-week program, an exercise library (25 exercises), Recovery check-in, Progress (Chart.js), History, a weekly calendar and parent controls.

- A single file, `index.html`. No PWA, no Service Worker, no manifest.
- Data is stored in the browser's LocalStorage, on that one device and in that one browser. Make backups with JSON Export and restore them with Import.
- Syncing between devices would need a separate backend. This version does not have one.

## Structure

```
src/head.html   title, fonts
src/style.css   design
src/body.html   shell (header, navigation)
src/data.js     schedule, exercises, 6-week program, tests
src/app.js      application logic
build.py        builds index.html (full page) and dist/artifact.html (claude.ai Artifact version)
```

## How to update

1. Edit the file you need in `src/`.
2. Run `python3 build.py`.
3. Check locally: `python3 -m http.server` → http://localhost:8000
4. Publish:
   - **GitHub Pages:** commit and push. Pages publishes it automatically (Settings → Pages → Branch).
   - **claude.ai Artifact:** ask Claude to republish `dist/artifact.html` to the same URL.

Republishing does not delete data: it stays in the user's browser.
