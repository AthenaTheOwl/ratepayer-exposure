# First PR after the scaffold

Narrow scope: project skeleton, assumption charter, voice and citation
gate skeletons, one placeholder page. No calculator yet.

## Title

`feat: astro scaffold, DEC-001 assumption charter, voice + citation gates`

## Files changed

- `package.json` (new) — Astro plus TypeScript plus cheerio (for the
  citation scan). No vitest yet; that lands with the model in PR 2.
- `astro.config.mjs` (new) — site URL placeholder, output static.
- `decisions/DEC-001-assumption-charter.md` (new) — defines the three
  assumption tags (conservative / median / upper-bound) and the rule
  that the methodology page renders the tag next to each assumption.
- `scripts/voice_lint.mjs` (new) — node script, banned-word list per
  portfolio.
- `scripts/check_citations.mjs` (new) — builds the site, walks `dist/`,
  parses HTML with cheerio, asserts every numeric span has an adjacent
  `<cite>` reference. Skeleton in this PR: runs, accepts pages with
  no numbers.
- `src/pages/placeholder.astro` (new) — a single page so `astro build`
  has something to render.

## Verification

```bash
npm install
npm run build
npm run check:voice
npm run check:citations
```

Expected: all four commands exit zero. `check:citations` prints
`OK: 1 page scanned, 0 numeric outputs`.

A reviewer should read DEC-001 and ask whether the three tags
adequately separate honest disagreement from honest uncertainty. If a
case in the field needs a fourth tag, add it before merging.

## What this PR does NOT do

- No calculator; PR 3.
- No data files; PR 2.
- No bill-delta model; PR 2.
- No sanity-bounds test; PR 2.
- No GitHub Action.
