# Acceptance — 0001 Foundation

## What v0 done means

- `npm install && npm run build` succeeds on a clean clone.
- `/calculator/` renders for one ZIP prefix and returns a numeric
  result.
- `/methodology/` lists every assumption with its tag and at least one
  source URL each.
- `npm run check:citations` passes; every numeric output has an inline
  citation.
- `npm run check:bounds` passes; no (zone, year) emits a delta > 200%.

## Commands to run

```bash
git clone <repo>
cd ratepayer-exposure
npm install
npm run build
npm run check:voice
npm run check:citations
npm run check:bounds
npm run check:a11y
```

Expected: zero exit codes; build artifacts under `dist/`.

## Gates to pass

- `check:voice` — no banned terms.
- `check:citations` — every numeric output cites a source.
- `check:bounds` — no delta exceeds 200% of baseline.
- `check:a11y` — zero serious-or-higher violations.

## Out of scope for acceptance

- Coverage of all PJM zones; one zone (DOM) is enough for v0.
- ISOs beyond PJM.
- Visualizations of the time series.
