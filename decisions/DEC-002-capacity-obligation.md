# DEC-002 — capacity obligation replaces the kWh conversion

Status: accepted 2026-10-19. Supersedes the DEC-001 formula, the
`residential_allocation_share` calibration, and the DEC-001 tags and
sources for `COST_ALLOCATION`. The DEC-001 tag definitions, the
`PJM_LDA_RATES` rows and the 2.0x ratio gate still apply.

## why

DEC-001 computed

    price ($/MW-day) x 365 x residential_allocation_share
      x data_center_load_share x annual kWh / 1000

A capacity price is charged per MW of capacity obligation. PJM bills a
load-serving entity its daily unforced capacity obligation, built from
its customers' peak load contributions (PLC), times the final zonal
capacity price ([PJM Manual 18](https://www.pjm.com/-/media/DotCom/documents/manuals/m18.ashx),
sections 1.2.1 and 7.4-7.5). Annual kWh is energy. Multiplying the price
by kWh / 1000 gives $/day x MWh, which is not a bill amount, and the two
shares were left to absorb the difference.

Three checks show the old numbers did not hold:

- The DOM 2030 result, $2,248.40 a year, was about 20 times the
  household's whole capacity-charge change at the same price
  ($110/MW-day x 365 x 0.0028 MW = $112.42). A data-center slice cannot
  be larger than the charge it is a slice of.
- `residential_allocation_share = 0.04` was said to be calibrated to a
  ~$10-20/month residential impact at the 2025/26 cleared price. At the
  cleared DOM delta ($444.26 - $28.92 = $415.34/MW-day) the DEC-001
  formula gives $8,489.55 a year, $707.46 a month. The calibration does
  not reproduce its own target.
- `eval/sanity_bounds.py` re-implemented the same formula, and the 2.0x
  ratio gate passed DOM 2030 at 1.249x baseline. Two copies of one
  formula agree on its errors.

## decision

    delta_usd(zone, year) =
        capacity_price_delta_usd_per_mw_day(zone, year)   # USD / MW-day
      * 365                                               # day / year
      * household_plc_mw(zone)                            # MW
      * data_center_load_share(zone)                      # dimensionless

`price x 365 x household_plc_mw` is the household's whole
capacity-charge change. `data_center_load_share` takes a slice of it.

`residential_allocation_share` is removed. PJM assigns capacity
obligation to load by each customer's PLC, so a per-customer PLC
already carries the residential class's allocation. No cited source
showed a further class share is needed on top of a per-customer
obligation.

## inputs from `COST_ALLOCATION`

| constant | DOM | COMED | tag | basis |
|---|---|---|---|---|
| `household_plc_mw` | `0.0028` | `0.0019` | DOM `median`, COMED `upper-bound` | assumption: annual kWh / 8,760 h / 0.5, rounded to 0.1 kW |
| `data_center_load_share` | `0.10` | `0.12` | `conservative` | assumption; see below |
| `typical_residential_kwh_per_year` | `12384` | `8316` | `median` | [EIA Table 5A](https://www.eia.gov/electricity/sales_revenue_price/pdf/table_5A.pdf), 2024: 1,032 (VA) and 693 (IL) kWh/month x 12 |
| `baseline_usd_per_year` | `1785.24` | `1319.88` | `median` | EIA Table 5A, 2024: $148.77 (VA) and $109.99 (IL) a month x 12 |

`household_plc_mw`. The 0.5 is an assumed residential load factor at
PJM's five summer coincident peaks (average load / load at those
hours). No published Dominion or ComEd residential PLC was found.
ComEd gives one cross-check: it says the 2025/26 auction raised the
average residential bill by about $10.60 a month
([ComEd](https://poweringlives.comed.com/why-is-your-electric-bill-going-up/)).
At the 2025/26 ComEd price change of $241.00/MW-day ($269.92 - $28.92)
that implies about 1.45 kW. The 1.9 kW used here gives $167.13 a year
against ComEd's $127.20, 1.31x. The COMED row is tagged `upper-bound`.
The DOM row has no published comparison and is tagged `median`. Here
`median` means only that no direction of bias is established; it
departs from the DEC-001 definition ("the central value of published
estimates"), since no published estimate exists. The value is
unanchored.

`data_center_load_share`. DEC-001 cited this to a PJM 2026 load
forecast, and the methodology page linked the EIA table instead.
Neither source contains it. It is an assumption. The PJM market monitor
finds that existing and forecast data-center load added $7.27 billion
of the $16.12 billion (45.1%) in 2026/27 BRA revenues
([IMM, 2026/2027 BRA Part A](https://www.monitoringanalytics.com/reports/Reports/2025/IMM_Analysis_of_the_20262027_RPM_Base_Residual_Auction_Part_A_20251001.pdf)).
Shares of 0.10 and 0.12 sit well below that, so the tag moves from
`median` to `conservative`. The values are unchanged.

`typical_residential_kwh_per_year` and `baseline_usd_per_year` were
cited to `.../pdf/table5_a.pdf`, which now redirects to a generic EIA
page, and the values (14,000 kWh and $1,800; 8,500 kWh and $1,140) did
not match the table. They now carry the table's 2024 figures.

## sanity bounds

`eval/sanity_bounds.py` no longer re-implements the formula. It runs
the shipped model (`eval/model_rows.ts`) and checks, for every covered
(zone, year):

1. `delta_usd / baseline_usd <= 2.0` (the DEC-001 gate).
2. `delta_usd <= price x 365 x household_plc_mw`: the data-center slice
   stays within the household's whole capacity-charge change.
3. `household_plc_mw` is 0.5-10 kW and its implied load factor
   (annual kWh / 8,760 / PLC kW) is 0.25-1.0, which rejects a kWh or kW
   figure entered where MW belongs.
4. `0 <= data_center_load_share <= 1`.
5. The COMED PLC, priced at the 2025/26 change, lands within 0.5x-2x of
   ComEd's published $10.60/month.

Check 2 fails the DEC-001 formula by about 20x.

## before / after

| zone | year | DEC-001 delta | DEC-002 delta | whole capacity-charge change |
|---|---|---|---|---|
| DOM | 2026 | $408.80 | $2.04 | $20.44 |
| DOM | 2027 | $715.40 | $3.58 | $35.77 |
| DOM | 2028 | $1,124.20 | $5.62 | $56.21 |
| DOM | 2029 | $1,635.20 | $8.18 | $81.76 |
| DOM | 2030 | $2,248.40 | $11.24 | $112.42 |
| COMED | 2026 | $195.46 | $1.25 | $10.40 |
| COMED | 2027 | $364.85 | $2.33 | $19.42 |
| COMED | 2028 | $586.37 | $3.74 | $31.21 |
| COMED | 2029 | $846.98 | $5.41 | $45.08 |
| COMED | 2030 | $1,172.74 | $7.49 | $62.41 |

Baselines: DOM $1,800 to $1,785.24; COMED $1,140 to $1,319.88.

## open

- Resolved 2026-10-20 by [DEC-003](DEC-003-cleared-bra-prices.md),
  which replaces the price rows with cleared BRA prices. As written
  on 2026-10-19: the price rows are unchanged and stay `conservative`. They sit far
  below prices that have already cleared: the 2026/27 BRA cleared at
  the $329.17/MW-day cap across the whole PJM footprint and the 2027/28
  BRA at $333.44, changes of $300.25 and $304.52 over the $28.92 base,
  against fixture values of $15-35. At $300.25 the DOM household's
  whole capacity-charge change is $306.86 a year and the data-center
  slice $30.69; for COMED, $208.22 and $24.99. Under DEC-001 the low
  prices partly offset the units error. Re-pricing the rows is a
  separate decision.
- Manual 18 scales PLC by a zonal scaling factor and the forecast pool
  requirement to get the UCAP obligation. Both are taken as 1.0 here.
- Dominion Energy Virginia is vertically integrated. How PJM capacity
  prices reach a Virginia residential bill, net of Dominion's own
  capacity revenue, is not modelled.

## change log

| date | change |
|---|---|
| 2026-10-20 | Price open item resolved by DEC-003. The before / after table above shows DEC-002's figures at the old price rows. |
| 2026-10-19 | DEC-002 — capacity-obligation formula; `residential_allocation_share` removed; `household_plc_mw` added; share re-tagged `conservative`; EIA inputs re-cited to the 2024 table; bounds check runs the shipped model. |
