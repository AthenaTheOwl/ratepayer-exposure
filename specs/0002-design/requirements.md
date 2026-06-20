# Requirements — 0002 Design (v0.1)

Scope narrowing of `specs/0001-foundation/requirements.md` to what the
v0.1 implementation phase can ship. The v0.1 product is: an Astro page
with a client-side ZIP-code calculator that computes a 2026-2030
bill-delta from a documented formula, gated by a sanity-bounds check,
with a companion methodology page.

The citation-rendering gate, voice gate, and a11y gate are deferred to
spec 0003+. They remain in spec 0001 as portfolio-level requirements;
v0.1 ships the model and the pages without the automated gates around
them.

## Functional requirements

- **R-RPE-V1-001** The site SHALL render `/calculator/` taking a US
  ZIP code and emitting a USD-per-year bill-delta for each year
  2026-2030. (Refines R-RPE-001.)
- **R-RPE-V1-002** The site SHALL render `/methodology/` listing the
  formula, every assumption with its DEC-001 tag, and every source
  URL with retrieval date. (Refines R-RPE-002.)
- **R-RPE-V1-003** The calculator SHALL compute entirely in the
  browser; no ZIP, no input, and no derived value SHALL be sent to
  any server. (Carries R-RPE-004.)
- **R-RPE-V1-004** The formula SHALL live in `src/lib/bill_delta.ts`
  as a pure function `billDelta(zip, year) -> { delta_usd,
  baseline_usd, sources[] }`, with vitest cases covering three
  documented reference inputs. (Refines R-RPE-005.)
- **R-RPE-V1-005** `decisions/DEC-001-assumption-charter.md` SHALL
  enumerate every assumption used by the formula and tag each one
  `conservative`, `median`, or `upper-bound`. (Carries R-RPE-006.)
- **R-RPE-V1-006** `eval/sanity_bounds.py` SHALL fail the build with
  a nonzero exit and the offending `(zone, year)` if any computed
  `delta_usd / baseline_usd` exceeds 2.0. (Carries R-RPE-007.)
- **R-RPE-V1-007** v0.1 SHALL cover exactly one PJM LDA zone (DOM)
  and one ZIP prefix that maps to it; other ZIPs SHALL return the
  sentinel value `out_of_coverage` and the page SHALL display
  "outside v0.1 coverage" rather than a number.
- **R-RPE-V1-008** Each data file under `src/data/` SHALL include a
  `last_verified` ISO date per record; `npm run check:stale-data`
  SHALL emit a warning (not a failure) when any record is older than
  90 days. (Refines R-RPE-012.)

## Non-functional requirements

- **R-RPE-V1-009** The calculator result SHALL render within 200ms of
  user input on a 2024-class laptop. (Carries R-RPE-011.)
- **R-RPE-V1-010** The client bundle SHALL make zero network calls at
  runtime; the formula's data files SHALL be inlined at build time.
- **R-RPE-V1-011** `npm install && npm run build && npm run test &&
  npm run check:bounds` SHALL exit zero on a fresh clone with no
  hidden state.
- **R-RPE-V1-012** The methodology page SHALL render every assumption
  with an inline source link; v0.1 enforces this by review only, the
  automated `check:citations` gate lands in spec 0003.

## Deferred to spec 0003+

- R-RPE-003 (every-number-cited) — automated gate ships in 0003.
- R-RPE-008 (`check:voice`) — banned-terms lint ships in 0003.
- R-RPE-009 (`check:citations`) — build-time HTML scan ships in 0003.
- R-RPE-010 (`check:a11y`) — axe-core gate ships in 0003.
- Additional PJM zones beyond DOM ship in 0004.
- ISOs beyond PJM remain out of scope per AGENTS.md.
