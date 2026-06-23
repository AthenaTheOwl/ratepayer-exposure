# RatepayerExposure

For a US ratepayer in a covered PJM zone, estimate how much of their
electricity bill increase over 2026-2030 is attributable to data-center
load growth in their utility / ISO, given current cost-allocation rules.

## What this is

A small public calculator with a long methodology page. The user enters
a ZIP code and a year (2026-2030); the calculator returns a projected
annual bill delta attributable to data-center load, with every
assumption cited. Computation runs entirely client-side — no ZIP code is
sent to a server or logged.

The repo's discipline is that no number renders without a source. The
methodology page lists every assumption, its source URL, and the
sanity-bound check that rejects any version where the delta exceeds 2x
of baseline (the bound enforced by `eval/sanity_bounds.py` and the
vitest suite from both sides).

This repo is downstream of InterconnectAlpha (capacity-price curves) and
GridSilicon (site data). It is upstream of nothing.

## Coverage

v0.2 covers two PJM LDA zones, each keyed by one ZIP-3 prefix:

| zone | utility | ZIP prefix | example ZIP |
|---|---|---|---|
| `DOM` | Dominion Energy Virginia | `232xx` | `23219` (Richmond, VA) |
| `COMED` | Commonwealth Edison | `606xx` | `60601` (Chicago, IL) |

Every other ZIP returns the literal sentinel "outside v0.2 coverage".
Widening each zone's ZIP footprint lands in spec 0004; more PJM zones in
spec 0005. ISOs beyond PJM and commercial / industrial bills are out of
scope (see `AGENTS.md`).

## How to run

```bash
npm install
npm run dev          # local dev server
npm run build        # static build to dist/
npm test             # vitest: 11 reference + integrity cases
npm run check:bounds # python sanity-bound check (no delta > 2x baseline)
npm run check:stale-data  # warn on any last_verified older than 90 days
```

The build emits a static site to `dist/` (`index`, `calculator`,
`methodology`). `npm run check:bounds` requires Python 3 (stdlib only,
no pip install).

## live demo

This is a static Astro site; Vercel auto-detects the framework and
serves `dist/` with no extra config.

Deploy steps:

1. go to https://vercel.com/new
2. import the GitHub repo `AthenaTheOwl/ratepayer-exposure`
3. keep the auto-detected Astro preset (build `npm run build`, output
   `dist/`) and click **Deploy**

<!-- live-url: https://__________.vercel.app -->

## Layout

```
ratepayer-exposure/
  src/
    pages/
      index.astro
      calculator.astro
      methodology.astro
    lib/
      bill_delta.ts        # pure model + inlined cited data (DOM, COMED)
      bill_delta.test.ts   # vitest reference + integrity cases
  eval/
    sanity_bounds.py       # independent re-impl of the bound check
  scripts/
    check_stale_data.mjs   # warn on stale last_verified fields
  decisions/
    DEC-001-assumption-charter.md
  specs/
  docs/
  astro.config.mjs
  AGENTS.md
  LICENSE
  README.md
```

The model data (capacity-price deltas, cost-allocation parameters) is
inlined in `src/lib/bill_delta.ts` rather than loaded from JSON, so the
client bundle has no runtime fetches and the vitest suite pins the same
constants the user sees.

## License

MIT. See LICENSE.

## Caveat

This is the kind of artifact that gets attacked by utility lobbying
shops. The PJM zones must be bulletproof or the work is discredited.
Discipline is the differentiator: every output number cites a source,
every assumption is named and tagged, every bound is checked from two
independent implementations.
