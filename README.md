# RatepayerExposure

For any US ratepayer, estimate how much of their electricity bill
increase over 2026-2030 is attributable to data-center load growth in
their utility / ISO, given current cost-allocation rules.

## What this is

A small public calculator with a long methodology page. The first
slice covers PJM-zone residents only. The user enters a ZIP code; the
calculator returns a projected 2026-2030 bill delta attributable to
data-center load, with every assumption cited.

The repo's discipline is that no number renders without a citation. A
methodology page lists every assumption, every source URL, and the
sanity-bound check that caught any prior version where the delta
exceeded 200% (the bound enforced in CI).

This repo is downstream of InterconnectAlpha (capacity-price curves)
and GridSilicon (site data). It is upstream of nothing.

## Status

v0 scaffold; no implementation yet. Spec 0002 lands the calculator
page and the methodology page. Spec 0003 lands the citation renderer
and the sanity-bound test.

## How to run

Will land in spec 0002. The expected shape:

```bash
npm install
npm run dev
npm run build
npm run check:citations
npm run check:bounds
npm run check:voice
```

For v0 the only working command is `npm install` against the
placeholder `package.json` that lands in PR 1.

## Layout

```
ratepayer-exposure/
  src/
    pages/
      calculator.astro
      methodology.astro
    data/
      pjm_lda_rates.json
      cost_allocation_rules.json
    lib/
      bill_delta.ts
      citation_renderer.ts
  eval/
    sanity_bounds.py
  decisions/
    DEC-001-assumption-charter.md
  specs/0001-foundation/
  docs/first-pr.md
  AGENTS.md
  LICENSE
  README.md
```

## License

MIT. See LICENSE.

## Caveat

This is the kind of artifact that gets attacked by utility lobbying
shops. PJM-only first version must be bulletproof or it is discredited
in 48 hours. Discipline is the differentiator: every output number
cites a source, every assumption is named, every bound is checked.
