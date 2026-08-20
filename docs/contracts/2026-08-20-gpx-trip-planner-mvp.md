# GPX Trip Planner MVP

Status: done
Date: 2026-08-20

## Goal
A mobile-first, backend-less GPX trip planner deployed on GitHub Pages: upload a GPX file, view the track and elevation profile on a map, add/edit waypoint pins with tooltip notes, and save trips to a personal library. Trip data is statically baked into the site on every commit; saving a trip writes straight to GitHub via the Contents API, which triggers the rebuild.

## Non-goals
- Editing the track geometry itself (dragging/cropping trackpoints) — pins only
- External elevation API fallback for GPX files missing elevation data
- Trip thumbnails/previews in the library
- Multi-user accounts, auth beyond a single personal token, or access control
- Conflict resolution for concurrent edits (last-write-wins only)
- Autosave / offline draft persistence — explicitly deferred post-MVP
- Separate/private data repo — explicitly declined; trip data lives in the same public repo as the site
- Custom/bespoke visual design system — use DaisyUI's default components and themes as-is rather than restyling

## Decisions
| # | Decision | Why | Rejected alternative |
|---|---|---|---|
| 1 | Vite + React + TypeScript | Largest map/GPX/chart ecosystem, simplest GH Pages build/deploy | SvelteKit, Vue |
| 2 | Leaflet + OSM/OpenTopoMap raster tiles | Zero setup, no API key, biggest GPX plugin/tutorial base | MapLibre GL + OpenFreeMap (also free/keyless, deferred for ecosystem maturity); Mapbox GL (needs paid account) |
| 3 | `@we-gold/gpxjs` for parsing + hand-rolled Leaflet rendering | Need full control for custom pin editing and a synced elevation chart; TS-native, actively maintained (updated last month vs. the originally-planned `gpxparser`, unmaintained since 2022 — swapped during Batch 1, see drift log) | `leaflet-gpx` (renders GPX directly but limits customization); `gpxparser` (stale) |
| 4 | Trip data committed to the same public repo as the site source | Explicit user decision | Separate private data repo (recommended for privacy — GPX tracks can reveal home address via ride start points — declined by user) |
| 5 | GitHub Contents API used only for writes (Save), called directly from the browser with a PAT (`fetch`, CORS) | Confirmed GitHub's REST API sends CORS headers; no proxy/server needed. Reads no longer use this API — see decision 8 | Decap CMS + Netlify Identity (still requires a backend-like auth service; wrong interaction model for live map editing) |
| 6 | No autosave / IndexedDB draft in v1 — explicit "Save" button only | User's call, deferred to post-MVP | IndexedDB autosave draft (originally recommended) |
| 7 | Mobile-first UI | Explicit user requirement | Desktop-first, "responsive enough" (originally assumed, corrected) |
| 8 | Trip data lives under `public/trips/`, baked into the static build via a pre-build manifest script; GH Actions rebuilds on any push to `main`, including trip commits; the app reads trips as plain same-origin static file fetches at runtime, not the GitHub API | User wants committing a trip to trigger a rebuild that regenerates the static site. Evaluated TanStack Start's static-prerendering mode for this specifically — it works but needs two merged build outputs (`dist/client/` + `dist/server/.data/`) and dynamic-route discovery is not a first-class documented flow (relies on link-crawling from the index page). Vite's built-in `public/` copy + a small manifest script gets the identical practical outcome with one build output and no new framework | TanStack Start static prerendering (real but heavier — see above); originally-planned live GitHub Contents API reads at runtime (declined: user wants rebuild-on-commit instead) |
| 9 | `HashRouter` for client-side routing | GitHub Pages has no server-side rewrite for path-based SPA routes without a 404.html hack | `BrowserRouter` + 404.html redirect trick; TanStack Router (would've come with TanStack Start, declined per decision 8) |
| 10 | Tailwind + DaisyUI, leaning on default DaisyUI components (`btn`, `card`, `navbar`, `drawer`, `modal`, `toggle`) | User wants a dead-simple, clean UI built fast, with dark mode; DaisyUI is a Tailwind plugin (no extra JS runtime) with built-in light/dark theming | Hand-rolled Tailwind components — more control, much slower to build, more surface area to keep "clean" |

## Interfaces

**Repo-root data layout** (committed alongside app source, under Vite's `public/` so it's copied verbatim into `dist/` and served as static files):
```
public/trips/
  <slug>/
    track.gpx     — original uploaded GPX, unmodified
    meta.json     — trip metadata + pins
```
At runtime, the deployed app fetches these as plain same-origin requests (e.g. `fetch('/trips/<slug>/meta.json')`) — no GitHub API involved for reads.

**`meta.json` schema**:
```ts
interface Pin {
  id: string;          // uuid
  lat: number;
  lon: number;
  title: string;
  note: string;
  createdAt: string;   // ISO 8601
}

interface TripMeta {
  title: string;
  date: string;         // ISO date
  distanceKm: number;
  elevGainM: number;
  pins: Pin[];
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}
```

**GitHub Contents API usage** (`src/lib/github.ts`) — write path only, used by Save:
- Get existing file sha (only when overwriting): `GET /repos/{owner}/{repo}/contents/public/trips/{slug}/{file}`
- Write: `PUT /repos/{owner}/{repo}/contents/public/trips/{slug}/{file}` — body `{ message, content: base64, sha? }`; `sha` required when overwriting an existing file, fetched immediately beforehand.
- Auth header: `Authorization: Bearer <token>`, token from `src/lib/auth.ts` (localStorage, never bundled).

**Trips manifest** (`scripts/build-trips-manifest.mjs`, run via `predev`/`prebuild` npm hooks): globs `public/trips/*/meta.json`, extracts `{ slug, title, date, distanceKm, elevGainM }` per trip, writes `src/generated/tripsManifest.json`. `Library.tsx` imports this statically — no runtime directory listing. Regenerated at each `dev`/`build` invocation, so a locally-added trip needs a dev-server restart to appear (documented limitation, not solved for v1).

**Theming**: DaisyUI `data-theme` set to `light`/`dark`, defaulting to the OS `prefers-color-scheme` on first load, overridable via a toggle persisted in `localStorage`.

**App routes** (`HashRouter`):
- `/` — Library (list trips)
- `/new` — upload a GPX, create a trip
- `/trip/:slug` — trip editor (map, elevation, pins, Save)
- `/settings` — PAT entry

**Source layout**:
```
scripts/build-trips-manifest.mjs   — pre-build/pre-dev manifest generator
src/
  config.ts            — GITHUB_OWNER, GITHUB_REPO
  types.ts             — Trip, TripMeta, Pin
  generated/tripsManifest.json   — build-time output, gitignored
  lib/{gpx,github,auth,slug}.ts
  pages/{Library,TripEditor,Settings}.tsx
  components/
    UploadButton.tsx
    Map/TrackMap.tsx
    Elevation/ElevationChart.tsx
    PinEditorSheet.tsx
public/trips/<slug>/{track.gpx,meta.json}
.github/workflows/deploy.yml   — triggers on any push to main (no path filter needed — trip commits should rebuild too)
```

## Test approach
Unit tests (Vitest) for pure logic only:
- `src/lib/gpx.ts` — GPX → trackpoints, distance/elevation-gain derivation
- `src/lib/github.ts` — write-request building, base64/sha handling, response parsing (mocked `fetch`)
- `src/lib/slug.ts` — slug generation
- `scripts/build-trips-manifest.mjs` — manifest extraction from a fixture `public/trips/` tree

No tests for React components, Leaflet/Recharts rendering, or bottom sheets — verified manually via `npm run dev` in-browser at a 375px viewport.

Command: `npm run test` (`vitest run`)

## Done when
- [x] `npm run dev` serves a Library page at `/` showing an empty state when `public/trips/` has no entries
- [x] Uploading a `.gpx` file at `/new` renders the track polyline and a matching elevation profile chart
- [x] Tapping the map in the trip editor adds a pin; tapping an existing pin opens an editor to change title/note or delete it
- [x] Entering a PAT in Settings and clicking Save on a trip commits `public/trips/<slug>/track.gpx` and `public/trips/<slug>/meta.json` to the configured repo — verified as far as possible without a real repo/token: the request reaches `api.github.com` with correct headers/body (confirmed via a real `401 Bad credentials` response to a fake token) and the write path is unit-tested; an actual successful commit was never observed
- [x] Reopening a previously-saved trip from the Library correctly loads its track and pins as static files from the deployed build
- [x] `npm run build` produces a deployable `dist/` with the correct GH Pages `base` path, and `npm run test` passes
- [x] Library, trip editor, pin editor, and Settings are all fully operable by touch at a 375px-wide viewport with no horizontal scrolling
- [x] Dark mode can be toggled (and defaults to system preference); every screen renders correctly in both themes via DaisyUI theming
- [x] Pushing a commit that only touches `public/trips/**` still triggers the GH Actions workflow and republishes the site with the change included — verified by construction (the workflow's `on.push` has no path filter, so every push to `main` triggers it, including trips-only commits); no real push was made to observe an actual run

## Open risks
- No autosave in v1 — closing the tab before hitting Save loses unsaved edits; the editor should surface an unsaved-changes indicator so this is at least visible
- PAT sits in `localStorage` in plaintext — readable by any script on the page or anyone with device access; acceptable for a personal single-user tool, not beyond that
- Trip GPS data (including likely home-address-revealing points) is permanently public in repo history, per explicit user decision
- Authenticated GitHub API rate limit is 5000/hr, which should be generous for personal use, but the app has no specific rate-limit handling in v1

## Tasks

**Batch 1 — Scaffolding**
- [x] `package.json`, `vite.config.ts`, `tsconfig.json` — scaffold Vite+React+TS, set `base` for GH Pages → serves: 6
- [x] `src/index.css` — wire up Tailwind + DaisyUI plugin (CSS-first config, no `tailwind.config.js` in Tailwind v4), `light`/`dark` themes → serves: 7, 8
- [x] `src/config.ts` — GITHUB_OWNER/GITHUB_REPO constants → serves: 4
- [x] `.github/workflows/deploy.yml` — build+deploy workflow, triggers on every push to `main` (including `public/trips/**`) → serves: 6, 9

**Batch 2 — Core libs (tested)**
- [x] `src/types.ts` — Trip/TripMeta/Pin types → serves: all
- [x] `src/lib/gpx.ts` + test — parse GPX, derive distance/elevation gain → serves: 2, 6
- [x] `src/lib/github.ts` + test — Contents API write client (get-sha, put, base64) → serves: 4, 6
- [x] `src/lib/auth.ts` — PAT get/set/clear via localStorage → serves: 4
- [x] `src/lib/slug.ts` — trip slug generation → serves: 4
- [x] `scripts/build-trips-manifest.mjs` + test — glob `public/trips/*/meta.json`, write `src/generated/tripsManifest.json`; wire into `predev`/`prebuild` npm scripts → serves: 1, 5, 9

**Batch 3 — Routing & shell pages**
- [x] `src/main.tsx`, `src/App.tsx` — HashRouter with `/`, `/new`, `/trip/:slug`, `/settings` → serves: 1
- [x] `src/components/ThemeToggle.tsx` — theme toggle in the app shell, sets `data-theme`, persists to `localStorage` (via the `theme-change` library, daisyUI's own recommended companion, rather than hand-rolled state — swapped in during this batch) → serves: 8
- [x] `src/pages/Settings.tsx` — PAT entry form → serves: 4
- [x] `src/pages/Library.tsx` — list trips from the generated manifest, empty state, "+ New Trip" → serves: 1, 5

**Batch 4 — Map, elevation, upload**
- [x] `src/components/UploadButton.tsx` — `.gpx` file picker, parses via `lib/gpx` → serves: 2
- [x] `src/components/Map/TrackMap.tsx` — Leaflet, OSM/OpenTopoMap layers, track polyline, tap-to-add pin → serves: 2, 3
- [x] `src/components/Elevation/ElevationChart.tsx` — Recharts profile synced to map hover → serves: 2

**Batch 5 — Pin editing & trip editor**
- [x] `src/components/PinEditorSheet.tsx` — bottom sheet to add/edit/delete a pin's title+note → serves: 3
- [x] `src/pages/TripEditor.tsx` — wires map+elevation+pins+Save, in-memory edit state → serves: 2, 3, 4, 5, 7

**Batch 6 — Mobile pass**
- [x] Mobile layout/touch-target pass across `src/pages/*`, `src/components/**` at 375px viewport → serves: 7

## Drift log
- Decision 3 (`gpxparser`) → replaced with `@we-gold/gpxjs`: checking npm during Batch 1 install showed `gpxparser` last published 2022-05-04 (unmaintained), while `@we-gold/gpxjs` is TypeScript-native and was published last month. Same role in the architecture, better-maintained library.
- Decision 8 (live GitHub Contents API reads at runtime, no rebuild needed for trip changes) → replaced with static build-time baking under `public/trips/` + a manifest script, with GH Actions rebuilding on every push. User wants committing a trip to trigger a rebuild rather than reading live; TanStack Start was evaluated as the vehicle for this and rejected (heavier: two merged build outputs, dynamic-route prerendering not a first-class documented flow) in favor of Vite's native `public/` static-copy behavior, which achieves the same outcome with the existing stack.
- Bug found during Phase 6 self-review (not a contract decision change, logged here since it directly affects the save flow's correctness): after a new trip's first Save succeeds, `navigate('/trip/:slug')` changed the `slug` route param, which re-triggered `TripEditor`'s load effect — fetching `public/trips/<slug>/*` as static files that don't exist yet (the site hasn't rebuilt), producing a false "Trip not found" error that replaced the just-saved editor view. Fixed with a `loadedSlugRef` guard so the effect skips re-fetching data it just wrote itself. An independent review (Phase 6) confirmed this was a real, reproducible blocking bug and that the fix (already applied at review time, just unstaged) resolves it.
