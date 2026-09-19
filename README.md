# Mivo

A calm, instant new tab for Chrome. Vanilla TypeScript, no framework, no background worker.

## Develop

```bash
npm install
npm run build      # outputs dist/
npm run dev        # rebuild on changes in src/
npm run typecheck
```

Load it: `chrome://extensions` → enable Developer mode → **Load unpacked** → pick `dist/`.

## Why it's fast

- `newtab.html` has the CSS and the (subsetted) fonts inlined, so first paint needs no extra requests and no font swap.
- One ~1.4 KB script, run synchronously at the end of `<body>`, fills the clock before the first paint.
- No service worker, no content scripts, no runtime dependencies. Permissions: `search` (search box) and `favicon` (read the icon Chrome already has for a bookmarked site).
- Bookmarks live in `localStorage`, which is synchronous, so tiles are in the DOM before the first paint. Favicons are stored with each bookmark as a data URL when it is saved.
- Dialogs and the context menu are built on first use.
- The clock wakes once per minute, on the minute boundary.

## Status

Implemented: header, clock + date, search / URL bar (`/` focuses it), footer greeting and tab / bookmark counts, bookmarks (tiles, add, edit, delete, context menu).
Not yet: folders (the "Move to folder" item, folder field and "New folder" menu entry are left out), About / Settings screens.
