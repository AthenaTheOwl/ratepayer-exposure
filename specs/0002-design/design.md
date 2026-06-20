# Design — 0002 Design (v0.1)

## Goal

Ship the calculator end-to-end on one PJM zone, with the formula, the
data, the methodology page, and the sanity-bounds gate. Defer the
build-time citation scan, the voice lint, and the a11y gate to spec
0003 so v0.1 lands in one or two PRs.

## Block decomposition

```
  src/data/                          decisions/
    zip_to_lda.json                    DEC-001-assumption-charter.md
    pjm_lda_rates.json                       |
    cost_allocation_rules.json               |
    schema.ts                                |
              \                              |
               v                             v
        src/lib/bill_delta.ts  <----  formula reference
                  ^   |
                  |   |
       vitest    |   +----> src/lib/bill_delta_cli.ts
       fixtures  |                |
                 |                v
                 |        eval/sanity_bounds.py
                 |                |
                 |                v
                 |        npm run check:bounds (gate)
                 v
       src/pages/calculator.astro
       src/pages/methodology.astro
```

Five blocks. Dependencies are acyclic. The pages depend on the
formula and the data; the gate depends on the CLI shim and the
formula; the formula depends on the data; the data depends on
nothing.

## Block: data files

Files under `src/data/`:

- `zip_to_lda.json` — `{ "<zip_prefix>": "<lda_code>" }`. v0.1 ships
  one prefix mapping to `DOM`.
- `pjm_lda_rates.json` — per-LDA capacity-price forecast per year
  2026-2030, each record carrying `{ value_usd_per_mw_day, source_url,
  retrieved_iso, last_verified }`.
- `cost_allocation_rules.json` — per-LDA `{ data_center_load_share,
  residential_allocation_share, typical_residential_kwh_per_year,
  source_url, retrieved_iso, last_verified }`.
- `schema.ts` — TypeScript types so the formula and the build script
  share one shape.

Failure modes:

- File missing → `astro build` fails at import.
- Schema mismatch → `tsc` fails at build.
- `last_verified` older than 90 days → `check:stale-data` prints a
  warning, exits zero. (Stale data does not block the build in v0.1.)

## Block: formula library (`src/lib/bill_delta.ts`)

Pure function:

```ts
export type BillDeltaInput = { zip: string; year: 2026|2027|2028|2029|2030 };
export type BillDeltaResult =
  | { kind: "ok"; delta_usd: number; baseline_usd: number; sources: string[] }
  | { kind: "out_of_coverage"; zip: string }
  | { kind: "input_error"; reason: "bad_zip" | "bad_year" };

export function billDelta(input: BillDeltaInput): BillDeltaResult;
```

Computation (documented in `methodology.astro` and DEC-001):

```
delta_usd(zone, year) =
    capacity_price_delta_usd_per_mw_day(zone, year)
  * 365
  * residential_allocation_share(zone)
  * data_center_load_share(zone)
  * typical_residential_kwh_per_year(zone)
  / 1000   # MW -> kW
```

`baseline_usd(zone, year)` reads a static `baseline_usd_per_year`
field from the same `cost_allocation_rules.json` record.

Failure modes:

- ZIP prefix not in `zip_to_lda.json` → returns `out_of_coverage`.
- Year outside 2026-2030 → returns `input_error`.
- Non-numeric ZIP → returns `input_error`.
- Function never throws on user input; throws only on data-file
  corruption (caught at build time, not at runtime).

## Block: calculator page (`src/pages/calculator.astro`)

Static HTML form (ZIP input, year selector) plus a small client-side
Astro script island that imports `billDelta` and renders the result
into a `<output>` element on input.

The script island is the only client JS. The form posts nowhere; the
`<form>` has no `action` and is intercepted by an `input` listener.

Failure modes:

- Empty ZIP → no compute, no render.
- `out_of_coverage` → renders the literal string "outside v0.1
  coverage (one PJM zone, DOM, supported)".
- `input_error` → renders the matching message ("ZIP must be 5
  digits" or "year must be 2026-2030").
- JS disabled → form is visible but inert; the page renders a
  fallback note "calculator requires JavaScript; methodology page
  has the formula".

## Block: methodology page (`src/pages/methodology.astro`)

Static page rendering:

1. The formula (LaTeX-free, plain `<pre>`) matching `bill_delta.ts`.
2. The assumption table from DEC-001 with each assumption's tag and
   source URL.
3. The DOM-zone data with citations and `last_verified` dates.
4. A "what v0.1 does not cover" section pointing at deferred items.

Failure modes:

- An assumption lands in the code without a row on this page → caught
  in review; the automated `check:citations` gate lands in 0003.
- A source URL 404s → not detected in v0.1; link-check gate is 0003.

## Block: sanity-bounds gate

`src/lib/bill_delta_cli.ts` — tiny `tsx` shim:

```
npx tsx src/lib/bill_delta_cli.ts --zip <prefix> --year <2026..2030>
```

Prints one JSON line per call.

`eval/sanity_bounds.py`:

1. Enumerates every zone in `pjm_lda_rates.json` (v0.1: just DOM).
2. For each (zone, year) calls the CLI shim with a representative
   ZIP for that zone.
3. Reads `delta_usd` and `baseline_usd`; asserts `delta_usd /
   baseline_usd <= 2.0`.
4. On violation, prints `FAIL zone=<x> year=<y> ratio=<r>` and exits
   nonzero.

Failure modes:

- `tsx` missing → fail with a directive to run `npm install`.
- CLI shim returns non-JSON → fail with the raw output and exit 2.
- Bounds violation → exit 1 with the offending row.

## External dependencies

- `astro` — site framework, MIT, no runtime calls.
- `typescript` — types, Apache-2.0.
- `tsx` — dev dependency for the CLI shim, MIT.
- `vitest` — dev dependency, MIT.
- Python stdlib only for `sanity_bounds.py` (no `pip install`).

No network calls at build time. No external API. Data files are
checked in and reviewed.

## Reuse

Spec 0001 names the file layout. Spec 0002 implements the subset
covered by R-RPE-V1-001..012 and does not invent new modules. The
citation-renderer block from spec 0001 design is deferred verbatim to
spec 0003; this design does not re-spec it.

## Out of scope for v0.1

- `src/lib/citation_renderer.ts` and the build-time HTML scan
  (`check:citations`). Spec 0003.
- `scripts/voice_lint.mjs` (`check:voice`). Spec 0003.
- `check:a11y` (axe-core). Spec 0003.
- ZIP prefixes beyond the one mapped to DOM. Spec 0004 widens DOM
  coverage; spec 0005 adds other PJM zones.
- ISOs beyond PJM. Out of scope per AGENTS.md.
- Commercial / industrial bill modeling. Out of scope per AGENTS.md.
- Visualizations / charts on the methodology page. Spec 0004 if
  demand pulls.
- A GitHub Actions workflow. Local commands first; CI in spec 0003
  once the gates are stable.
