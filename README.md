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
- Dialogs, menus and the folder screens live in a separate `ui.js`, fetched after the first paint (`newtab.js` is ~7 KB). Their DOM is built on first use.
- The clock wakes once per minute, on the minute boundary.

## Status

Implemented: header, clock + date, search / URL bar (`/` focuses it), footer greeting and tab / bookmark counts, bookmarks (tiles, add, edit, delete, context menu) and folders (tiles with icon grid, new / edit / delete, move to folder, folder contents view), Settings (clock font, bookmark style, custom background).
Not yet: About screen; syncing settings and bookmarks across devices.
