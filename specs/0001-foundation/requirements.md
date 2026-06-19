# Requirements — 0001 Foundation

## Functional requirements

- **R-RPE-001** The site SHALL render a calculator at `/calculator/`
  taking a ZIP code and emitting a 2026-2030 bill-delta estimate in
  USD per year.
- **R-RPE-002** The site SHALL render a methodology page at
  `/methodology/` listing every assumption, every data source, and the
  computation per R-RPE-005.
- **R-RPE-003** Every number rendered on every page SHALL carry an
  inline citation reference linking to a footnote with source URL and
  retrieval date.
- **R-RPE-004** The calculator SHALL run entirely client-side; ZIP
  codes SHALL not be transmitted to any server.
- **R-RPE-005** The bill-delta computation SHALL be defined in
  `src/lib/bill_delta.ts` with unit tests covering the documented
  reference cases.
- **R-RPE-006** The repo SHALL ship `decisions/DEC-001-assumption-charter.md`
  documenting which assumptions are conservative, which are
  median-of-published-estimates, and which are upper-bound.
- **R-RPE-007** A sanity-bounds check (`eval/sanity_bounds.py`) SHALL
  fail the build if any calculator output exceeds 200% of the baseline
  bill.

## Non-functional requirements

- **R-RPE-008** All prose SHALL pass `npm run check:voice`.
- **R-RPE-009** The build SHALL pass `npm run check:citations`
  asserting every numeric output has a citation reference.
- **R-RPE-010** The site SHALL pass `npm run check:a11y` with zero
  axe-core serious-or-higher violations.
- **R-RPE-011** The calculator SHALL respond within 200ms of user
  input on a 2024-class laptop.
- **R-RPE-012** The data files SHALL include a `last_verified` date
  field; entries older than 90 days SHALL emit a build warning.
