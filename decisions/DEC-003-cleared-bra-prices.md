# DEC-003 — capacity prices from cleared Base Residual Auctions

Status: accepted 2026-10-20. Supersedes the DEC-001 `PJM_LDA_RATES`
rows (values, tag and source) and closes the first open item in
DEC-002. The DEC-002 formula, household inputs and bounds are
unchanged.

## why

The price rows were $15-$110/MW-day "extrapolated" from the 2025/2026
BRA and tagged `conservative`. Three auctions have cleared since, all
at the price cap, so the rows were no longer a conservative estimate
of an unknown price. They were below known prices by a factor of 5 to
20. The 2026 and 2027 rows cited a PJM article on the 2025/2026 BRA,
which says nothing about either year.

## what the model now uses

The price concept is unchanged: a delta in $/MW-day (UCAP) between the
zone's BRA resource clearing price and the same zone's 2024/2025 BRA
price. Two things were left implicit and are now stated:

- **Year mapping.** Calculator year N is PJM delivery year N/N+1
  (June 1, N to May 31, N+1). Each row now carries `delivery_year`.
- **Baseline.** $28.92/MW-day, the 2024/2025 BRA price for COMED and
  for the rest of RTO. DOM was not a modelled LDA in that auction and
  took the rest-of-RTO price
  ([2024/2025 BRA report](https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2024-2025/2024-2025-base-residual-auction-report.ashx),
  Table 3). It is the last auction before the large-load increase, so
  the delta is the price change since then.

Each row now stores the price, the baseline, the delta
(price - baseline), `price_basis` (`cleared` or `assumption`), a tag,
and a source URL for both the price and the baseline.

| year | delivery year | DOM price | COMED price | basis | tag | source |
|---|---|---|---|---|---|---|
| 2026 | 2026/2027 | $329.17 | $329.17 | cleared | `median` | [2026/2027 BRA report](https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2026-2027/2026-2027-bra-report.pdf) (July 22, 2025) |
| 2027 | 2027/2028 | $333.44 | $333.44 | cleared | `median` | [2027/2028 BRA report](https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2027-2028/2027-2028-bra-report.pdf) (December 17, 2025) |
| 2028 | 2028/2029 | $325.00 | $325.00 | cleared | `median` | [2028/2029 BRA report](https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2028-2029/2028-2029-bra-results-report.pdf) (July 14, 2026) |
| 2029 | 2029/2030 | $337.83 | $337.83 | assumption | `upper-bound` | [2029/2030 planning parameters](https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2029-2030/2029-2030-planning-period-parameters-for-base-residual-auction-report.pdf) (September 3, 2026) |
| 2030 | 2030/2031 | $337.83 | $337.83 | assumption | `conservative` | [PJM filing, FERC docket ER26-1556](https://www.pjm.com/pjmfiles/directory/etariff/FercDockets/9481/20260227-er26-1556-000.pdf) (February 27, 2026) |

All values were read from the PDFs on 2026-10-20.

**DOM and COMED.** In each of the three cleared auctions every LDA,
DOM and COMED included, cleared at the cap with a $0.00 locational
price adder (each report's "Offered and Cleared Megawatt and
Associated Prices by LDA" table). The two zones therefore carry the
same prices. In 2025/2026 they had differed (DOM $444.26, COMED
$269.92). Separation could return once the cap is lifted. PJM's no-cap
simulations had DOM at $542.83 for 2027/28 and COMED at $776.69 for
2028/29.

**2029 (assumption, `upper-bound`).** The 2029/2030 BRA runs in
December 2026 and has no result yet. The posted cap for the RTO and
every LDA is $337.83/MW-day (UCAP) and the floor is $181.91. The
auction cannot clear above the cap, so using it biases the row
upward. The last three BRAs all cleared at their caps.

**2030 (assumption, `conservative`).** The 2030/2031 BRA has no
parameters posted. PJM's filing extends the price collar only through
2029/2030 and says the VRR curve without the collar applies from
2030/2031. The row carries the 2029/2030 cap forward. PJM's no-cap
simulations of the last three auctions cleared at $388.57 (2026/27),
$529.80 (2027/28) and $554.72 (2028/29) RTO-wide, all above it, so a
flat $337.83 biases the row downward. This is not a forecast.

**Tag on the cleared rows.** The cleared rows are tagged `median` in
the DEC-002 sense: an observed value, with no direction of bias
established. They are BRA resource clearing prices, not the final
zonal net load prices billed after the incremental auctions, which can
differ slightly.

## before / after inputs ($/MW-day delta)

| year | DOM before | DOM after | COMED before | COMED after |
|---|---|---|---|---|
| 2026 | 20 | 300.25 | 15 | 300.25 |
| 2027 | 35 | 304.52 | 28 | 304.52 |
| 2028 | 55 | 296.08 | 45 | 296.08 |
| 2029 | 80 | 308.91 | 65 | 308.91 |
| 2030 | 110 | 308.91 | 90 | 308.91 |

## before / after outputs (USD a year per household)

| zone | year | data-center slice before | after | whole capacity-charge change before | after |
|---|---|---|---|---|---|
| DOM | 2026 | $2.04 | $30.69 | $20.44 | $306.86 |
| DOM | 2027 | $3.58 | $31.12 | $35.77 | $311.22 |
| DOM | 2028 | $5.62 | $30.26 | $56.21 | $302.59 |
| DOM | 2029 | $8.18 | $31.57 | $81.76 | $315.71 |
| DOM | 2030 | $11.24 | $31.57 | $112.42 | $315.71 |
| COMED | 2026 | $1.25 | $24.99 | $10.40 | $208.22 |
| COMED | 2027 | $2.33 | $25.34 | $19.42 | $211.18 |
| COMED | 2028 | $3.74 | $24.64 | $31.21 | $205.33 |
| COMED | 2029 | $5.41 | $25.71 | $45.08 | $214.23 |
| COMED | 2030 | $7.49 | $25.71 | $62.41 | $214.23 |

Baselines are unchanged (DOM $1,785.24, COMED $1,319.88). The largest
delta-to-baseline ratio is now 0.0195 (COMED 2029-2030), against the
2.0 gate. The 2026 rows match the figures DEC-002 gave in its open item
($30.69 and $306.86 for DOM; $24.99 and $208.22 for COMED).

The years no longer rise every year. 2028 is lower than 2027 because
the 2028/2029 cap ($325.00) is below the 2027/2028 cap ($333.44).

## checks

- `src/lib/bill_delta.test.ts` pins the published price, delivery year
  and basis for every row, the $28.92 baseline, delta = price -
  baseline, a PJM source URL for each row (the BRA report for the
  matching delivery year on cleared rows), every price inside $175.00 to
  $337.83, and each household delta inside $5-$100 a year.
- `eval/sanity_bounds.py` adds check 6: the delta equals price -
  baseline, the baseline is the 2024/2025 price, and each price lies
  inside the collar.

## open

- **Retail pass-through.** How BRA prices reach a Dominion (vertically
  integrated) or ComEd residential bill is still not modelled (DEC-002).
  The ComEd anchor check uses ComEd's published $10.60/month for
  2025/26. At the 2026/27 change the household's whole capacity charge
  is $208.22 a year, $17.35 a month.
- **Final zonal prices.** The model uses BRA clearing prices.
  Replacing them with PJM's final zonal net load prices would bring in
  incremental auction results.
- **2029/2030 BRA.** When it clears (scheduled December 2026), replace
  the 2029 row with the cleared price and revisit the 2030 assumption.
- **Calendar years.** A calendar-year bill spans two delivery years
  (January-May at the earlier price). This model maps one calendar
  year to one delivery year. It does not blend them.

## change log

| date | change |
|---|---|
| 2026-10-20 | DEC-003 — price rows replaced with cleared 2026/27-2028/29 BRA prices and tagged 2029/2030 assumptions; year mapped to delivery year; baseline and price stored per row with sources. |
