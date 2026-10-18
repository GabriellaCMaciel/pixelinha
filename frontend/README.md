# StitchLab: front-end

React 19 + Vite. The chart editor: upload an image, adjust size and colors,
and see the cross-stitch chart with its DMC thread legend.

## Running

```bash
npm install
npm run dev      # http://localhost:5173
```

The API must be running on port 8000 (see `../backend`). In development Vite
forwards `/api` to it, so no setup is needed. Copy `.env.example` to
`.env.local` only when you need to change something.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm test` | Unit and component tests (Vitest) |
| `npm run lint` | Lint (Oxlint) |
| `npm run build` | Production build in `dist/` |

## Structure

```
src/
  components/   Uploader, Controls, GridViewer, Legend (each with CSS and tests)
  hooks/        useChart (debounce, cancel, keep last chart), useLimits
  lib/          Canvas drawing math and the sample image
  services/     API client and Portuguese error messages
  index.css     Design tokens and base styles
```

The chart is drawn on a canvas that paints only the visible cells, so a
300 x 300 chart stays smooth at any zoom.
