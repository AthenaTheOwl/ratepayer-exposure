# Tasks — 0001 Foundation

## PR 1 — Scaffold + assumption charter

- [ ] Add `package.json` with Astro + TypeScript + axe-core
- [ ] Add `astro.config.mjs`
- [ ] Add `decisions/DEC-001-assumption-charter.md` with the three
  assumption tags
- [ ] Add `scripts/voice_lint.mjs`
- [ ] Add `scripts/check_citations.mjs` (skeleton, runs but accepts
  empty pages)
- [ ] Add a placeholder page so `astro build` succeeds
- [ ] Confirm `npm install && npm run build && npm run check:voice` passes

## PR 2 — Data files + bill_delta library

- [ ] Add `src/data/pjm_lda_rates.json` for one zone (DOM) populated
  from a publicly cited source
- [ ] Add `src/data/cost_allocation_rules.json` for the same zone
- [ ] Add `src/data/zip_to_lda.json` covering one ZIP prefix
- [ ] Implement `src/lib/bill_delta.ts` per design
- [ ] Add vitest cases covering three reference scenarios
- [ ] Add `eval/sanity_bounds.py` and wire to `npm run check:bounds`

## PR 3 — Calculator + methodology page

- [ ] Implement `src/pages/calculator.astro` with client-side
  computation
- [ ] Implement `src/pages/methodology.astro` rendering DEC-001 and
  the computation outline
- [ ] Implement `src/lib/citation_renderer.ts` and the build-time scan
- [ ] Confirm `npm run check:citations` passes against the rendered
  pages
- [ ] Add the `npm run check:all` umbrella script

## Out of scope for foundation

- [ ] ISOs beyond PJM (spec 0003)
- [ ] Commercial / industrial bills (out of scope, see AGENTS.md)
- [ ] SVG illustrations on methodology page (spec 0004 if ever)
