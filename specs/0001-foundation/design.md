# Design — 0001 Foundation

## Architecture sketch

Astro static site plus a small TypeScript computation library that
runs in the browser. No server, no API. Data files are committed and
loaded at build time and bundled into the client.

```
pjm_lda_rates.json          cost_allocation_rules.json
        \                          /
         \                        /
          v                      v
        src/lib/bill_delta.ts
                  ^
                  |
         src/pages/calculator.astro
                  |
                  v
        src/lib/citation_renderer.ts
                  |
                  v
               rendered page
```

## Computation outline

`billDelta(zip, year) -> { delta_usd, baseline_usd, citations[] }`:

1. Look up the PJM LDA zone for the ZIP (from a small
   `zip_to_lda.json` table).
2. Pull the LDA-level capacity-price forecast for the given year from
   `pjm_lda_rates.json` (sourced from InterconnectAlpha exports).
3. Pull the cost-allocation rule for that zone (data-center load
   share, residential allocation share) from
   `cost_allocation_rules.json`.
4. Compute the delta: `capacity_price_delta * residential_share *
   typical_residential_kwh`.
5. Return the result with the list of source URLs used.

## Citation rendering

`citation_renderer.ts` wraps every numeric output with a JSX `<cite>`
that resolves to an inline `[n]` and a footnote at the bottom of the
page. The `check:citations` script scans the emitted HTML for numeric
spans without an adjacent `<cite>` reference and fails the build if
any are found.

## Sanity bounds

`eval/sanity_bounds.py`:

1. Loads every PJM LDA zone.
2. For each zone and each year 2026-2030, calls `billDelta` (compiled
   to a small CLI via `tsx`).
3. Asserts `delta_usd / baseline_usd <= 2.0` for every (zone, year).
4. Exits nonzero on any violation, naming the offending zone.

A violation either means: (a) a real edge case, in which case the
methodology page must explicitly note it, or (b) a bug, in which case
the computation is fixed before the build can ship.

## Assumption charter (DEC-001)

Each assumption is tagged with one of:

- `conservative` — biases toward smaller delta
- `median` — uses median of published estimates
- `upper-bound` — biases toward larger delta

The methodology page renders this tag next to each assumption. The
charter pins the choices so they cannot be quietly swapped.
