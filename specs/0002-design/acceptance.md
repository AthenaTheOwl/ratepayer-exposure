# Acceptance — 0002 Design (v0.1)

## What v0.1 done means

- A fresh clone runs the listed commands to green without manual
  setup beyond `npm install`.
- `/calculator/` accepts a ZIP, computes a 2026-2030 yearly delta for
  the one covered prefix, and returns `outside v0.1 coverage` for any
  other ZIP.
- `/methodology/` renders the formula, the DEC-001 assumption table,
  and a source URL for every assumption.
- The sanity-bounds gate catches any `delta/baseline > 2.0` and
  refuses to ship.

## Commands a stranger must be able to run

```bash
git clone <repo>
cd ratepayer-exposure-task-batch2-ratepayer-exposure-design
npm install
npm run test            # vitest, three reference cases pass
npm run build           # astro build, exits zero, writes dist/
npm run check:bounds    # python eval/sanity_bounds.py, exits zero
npm run check:stale-data  # warns on stale rows, exits zero
```

Then open `dist/calculator/index.html` (or `npm run preview`) and
confirm:

- ZIP in the covered prefix → numeric result per year 2026-2030.
- ZIP outside coverage → "outside v0.1 coverage (one PJM zone, DOM,
  supported)".
- Empty ZIP → no result rendered, no console error.
- Bad year via URL param → "year must be 2026-2030".

Open `dist/methodology/index.html` and confirm:

- The formula block matches `src/lib/bill_delta.ts`.
- Every assumption row has a tag (`conservative` / `median` /
  `upper-bound`) and a clickable source URL.
- The "deferred to spec 0003+" section lists the gates that are not
  yet enforced.

## Gates this spec enforces

- `npm run test` — vitest, three reference cases for `billDelta`.
- `npm run build` — `astro build` succeeds; `dist/` is written.
- `npm run check:bounds` — `eval/sanity_bounds.py` exits zero across
  every (zone, year) covered by `pjm_lda_rates.json`.
- `npm run check:stale-data` — exits zero; prints a warning line per
  record older than 90 days (acceptable in v0.1).

## Gates this spec deliberately does NOT enforce

- `npm run check:voice` — spec 0003.
- `npm run check:citations` — spec 0003. v0.1 enforces citation
  coverage on the methodology page by code review only.
- `npm run check:a11y` — spec 0003.

## Failure cases that must reject v0.1

- A `(zone, year)` in `pjm_lda_rates.json` produces
  `delta/baseline > 2.0` and the build still ships. (`check:bounds`
  must catch this.)
- The calculator emits a number for a ZIP outside the covered
  prefix. (Must return `out_of_coverage`.)
- The calculator transmits the ZIP off-device. (No `fetch`, no form
  POST, no analytics ping in the client bundle.)
- A `last_verified` field is missing from any data record. (Schema
  must reject at build time.)

## Out of scope for acceptance

- Coverage of every DOM ZIP (one prefix is enough; widening lands in
  0004).
- Coverage of PJM zones beyond DOM.
- Automated citation, voice, and a11y gates (spec 0003).
- A hosted preview URL. Local `npm run preview` is the v0.1 demo.
