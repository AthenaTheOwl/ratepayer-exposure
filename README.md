# ratepayer-exposure

Type a Richmond ZIP into the calculator and ask it about 2030. It says $11.24 a
year: the data-center share of a $112.42 rise in that household's capacity charge,
on a bill that today runs about $1,785. Until October 2026 it said $2,248, more than
the whole bill, because the formula multiplied a capacity price by kilowatt-hours.
[DEC-002](decisions/DEC-002-capacity-obligation.md) has the correction and the
arithmetic. Every digit of the new number carries a source URL or a tagged
assumption.

## What it does

Data centers don't pay the capacity bill alone. The cost of keeping enough
generation on standby for them gets spread across a PJM zone's cost-allocation
pool, and a slice of that slice lands on residential customers who never asked for
the load. This calculator estimates that slice for one household. Enter a ZIP and a
year between 2026 and 2030; it returns the projected annual bill delta attributable
to data-center load growth, with every assumption behind it cited. The arithmetic is
the zone's capacity-price change, times one household's capacity obligation (its
peak load contribution, in MW), times the share attributed to data-center load.

The whole computation runs client-side. No ZIP code is sent anywhere or logged —
the model and its data are inlined in `src/lib/bill_delta.ts`, so the page does the
arithmetic in front of you with no fetch.

The discipline is that no number renders without a source. The methodology page
lists every assumption, its source URL or its basis as an assumption, and the sanity
bounds: the delta may not exceed 2x the baseline bill, and the data-center slice may
not exceed the household's whole capacity-charge change. The vitest suite checks
them in TypeScript. `eval/sanity_bounds.py` runs the shipped model and checks them
again in Python without a copy of the formula, so a formula error large enough to
exceed the household's whole capacity charge (about 10x at current shares) trips
the ceiling; the pinned vitest reference values catch smaller ones.

## Coverage

v0.2 covers two PJM LDA zones, each keyed by one ZIP-3 prefix:

| zone | utility | ZIP prefix | example ZIP |
|---|---|---|---|
| `DOM` | Dominion Energy Virginia | `232xx` | `23219` (Richmond, VA) |
| `COMED` | Commonwealth Edison | `606xx` | `60601` (Chicago, IL) |

Every other ZIP returns the literal sentinel "outside v0.2 coverage" — it would
rather say nothing than guess. Widening each zone's ZIP footprint lands in spec
0004; more PJM zones in spec 0005. ISOs beyond PJM and commercial / industrial bills
are out of scope (see `AGENTS.md`).

## How to run

```bash
npm install
npm run dev          # local dev server
npm run build        # static build to dist/
npm test             # vitest: 14 reference, unit and integrity cases
npm run check:bounds # python sanity bounds on the shipped model
npm run check:stale-data  # warn on any last_verified older than 90 days
```

The build emits a static site to `dist/` (`index`, `calculator`,
`methodology`). `npm run check:bounds` requires Python 3 (stdlib only,
no pip install) and `npm install`, since it runs the model through `tsx`.

## live demo

This is a static Astro site; Vercel auto-detects the framework and
serves `dist/` with no extra config.

Deploy steps:

1. go to https://vercel.com/new
2. import the GitHub repo `AthenaTheOwl/ratepayer-exposure`
3. keep the auto-detected Astro preset (build `npm run build`, output
   `dist/`) and click **Deploy**

<!-- live-url: https://__________.vercel.app -->

## How it connects

This sits at the household end of the same buildout the other repos measure
upstream:

- [interconnect-alpha](https://github.com/AthenaTheOwl/interconnect-alpha) — the
  capacity-price curves that feed the per-MW-day deltas this calculator multiplies
  through.
- [grid-silicon](https://github.com/AthenaTheOwl/grid-silicon) — the site data
  underneath the load growth that drives those curves.

The chain ends here: a number on one person's power bill. Nothing is downstream of
the bill.

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
      bill_delta.test.ts   # vitest reference, unit + integrity cases
  eval/
    sanity_bounds.py       # bounds on the shipped model, no formula copy
    model_rows.ts          # prints the model's inputs and outputs for it
  scripts/
    check_stale_data.mjs   # warn on stale last_verified fields
  decisions/
    DEC-001-assumption-charter.md
    DEC-002-capacity-obligation.md
  specs/
  docs/
  astro.config.mjs
  AGENTS.md
  LICENSE
  README.md
```

The model data (capacity-price deltas, household capacity obligations,
data-center shares, EIA usage and bills) is
inlined in `src/lib/bill_delta.ts` rather than loaded from JSON, so the
client bundle has no runtime fetches and the vitest suite pins the same
constants the user sees.

## Method update

[October method update: A capacity price is upstream of a household bill](docs/tariff-incidence-review.md).

## License

MIT. See LICENSE.

## Caveat

This is the kind of artifact a utility lobbying shop will go looking for cracks in.
The two PJM zones have to hold, or the work is discredited the moment it's
inconvenient. So every output number cites a source, every assumption is named and
tagged, and every bound is checked by a script that runs the shipped model without
sharing its formula; the ratio, ceiling and PLC bounds are also pinned in vitest.
