# AGENTS.md — ratepayer-exposure

Operating contract for AI agents working in this repo.

## What this repo is

A public calculator that estimates per-bill exposure to data-center
load growth, with full methodology and a hard rule that every output
number cites a source. The audience is ratepayer advocates, state AG
energy desks, and local press. Adversaries are utility lobbying
shops.

## Roles you may see in tasks

| Role | What they do |
|---|---|
| `data-curator` | Maintains the LDA rate and cost-allocation JSON files |
| `model-author` | Owns `bill_delta.ts` and its test fixtures |
| `citation-renderer` | Ensures every number on every page carries an inline citation |
| `sanity-checker` | Runs the bounds test in CI |

Not all roles are implemented in v0.

## Voice constraints

- No marketing words. No "leverage", "synergy", "best-in-class",
  "seamless", "cutting-edge".
- No antithetical reversals as a structural device.
- No advocacy register. The numbers carry the argument.
- Every output number renders with an inline `[n]` citation linking to
  a footnote with the source URL and retrieval date.

## Gates

Built and running in CI (`.github/workflows/ci.yml`):

```bash
npm test                      # vitest
npm run check:bounds          # python eval/sanity_bounds.py — no delta > 200%
npm run check:stale-data      # node scripts/check_stale_data.mjs
npm run build                 # astro build succeeds
```

Planned, not built: `check:voice` (banned terms scan),
`check:citations` (every numeric output carries an inline `[n]`
citation), and `check:a11y` (axe-core). The citation rule under Voice
constraints is stated policy; until `check:citations` exists, an
uncited number is caught in review, not by a gate. Do not cite these
three as if they run.

## Out of scope

- ISOs beyond PJM for v0. MISO, ERCOT, CAISO later if demand pulls.
- Commercial / industrial bill modeling. Residential only.
- Storing user inputs. The calculator runs client-side; ZIP codes are
  not logged.
- Policy recommendations in the page voice. Numbers only; advocacy
  groups own the framing downstream.
