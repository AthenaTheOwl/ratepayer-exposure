# Tasks — 0002 Design (v0.1)

Two PRs. PR A lands the data + formula + sanity gate; PR B lands the
pages + DEC-001 update + stale-data warning.

## PR A — data, formula, sanity-bounds gate

- [ ] Add `package.json` (Astro, TypeScript, tsx, vitest) and
      `astro.config.mjs` matching spec 0001 PR 1
- [ ] Add `src/data/schema.ts` defining `LdaRateRecord`,
      `CostAllocationRecord`, `ZipToLdaMap`
- [ ] Add `src/data/pjm_lda_rates.json` populated for DOM, years
      2026-2030, each record with `source_url`, `retrieved_iso`,
      `last_verified`
- [ ] Add `src/data/cost_allocation_rules.json` for DOM with the four
      fields named in design + `baseline_usd_per_year` + citations
- [ ] Add `src/data/zip_to_lda.json` with one prefix mapping to DOM
- [ ] Implement `src/lib/bill_delta.ts` per the
      `billDelta(input) -> BillDeltaResult` signature in design.md
- [ ] Add `src/lib/bill_delta.test.ts` with three reference cases
      (`low`, `median`, `upper` from DEC-001 tags)
- [ ] Add `src/lib/bill_delta_cli.ts` (tsx shim, prints JSON line)
- [ ] Add `eval/sanity_bounds.py` enforcing `delta/baseline <= 2.0`
      across every (zone, year) and exiting nonzero on violation
- [ ] Wire `npm run test`, `npm run check:bounds`, and `npm run
      check:stale-data` in `package.json`

## PR B — pages + methodology + verification

- [ ] Update `decisions/DEC-001-assumption-charter.md` to list every
      assumption used by `bill_delta.ts` with its tag
- [ ] Implement `src/pages/calculator.astro` (form + client island)
      handling the three result kinds (`ok`, `out_of_coverage`,
      `input_error`) and a noscript fallback
- [ ] Implement `src/pages/methodology.astro` rendering formula,
      assumption table, DOM data with citations, deferred-items list
- [ ] Add `scripts/check_stale_data.mjs` that warns (exit 0) on any
      `last_verified` older than 90 days
- [ ] Verify on clean clone: `npm install && npm run build && npm run
      test && npm run check:bounds` exits zero; `/calculator/` returns
      a number for the covered prefix and `outside v0.1 coverage` for
      others; `/methodology/` lists every assumption with a source URL

## Explicitly NOT in these two PRs

- [ ] `src/lib/citation_renderer.ts` and `npm run check:citations`
      (spec 0003)
- [ ] `scripts/voice_lint.mjs` (spec 0003)
- [ ] `npm run check:a11y` axe-core integration (spec 0003)
- [ ] GitHub Actions workflow (spec 0003)
- [ ] Additional PJM zones (spec 0004+)
