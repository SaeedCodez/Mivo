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
- No service worker, no content scripts, no runtime dependencies. The only permission is `search`.
- The clock wakes once per minute, on the minute boundary.

## Status

Implemented: header, clock + date, search / URL bar (`/` focuses it), footer greeting.
Not yet: bookmarks, folders (space is reserved so the clock doesn't shift when they land), About / Settings screens.
