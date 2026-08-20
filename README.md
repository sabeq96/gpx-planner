# GPX Trip Planner

A mobile-first, backend-less GPX trip planner. Upload a GPX file, view the
track and elevation profile on a map, add waypoint pins with notes, and save
trips straight to this repo via the GitHub API. Trip data lives under
`public/trips/` and is deployed to GitHub Pages.

See [docs/contracts/2026-08-20-gpx-trip-planner-mvp.md](docs/contracts/2026-08-20-gpx-trip-planner-mvp.md)
for the full design contract.

## Development

```bash
npm install
npm run dev      # local dev server
npm run test     # unit tests (vitest)
npm run lint     # oxlint
npm run build    # production build to dist/
```

Saving a trip requires a GitHub personal access token (fine-grained, scoped to
this repo, Contents: Read and write), entered once under Settings in the app.
It's stored only in the browser's `localStorage`.

## Deployment

Pushing to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml),
which builds and publishes to GitHub Pages. This includes commits that only
touch `public/trips/**` — saving a trip through the app triggers a rebuild.
