# A capacity price is upstream of a household bill

Method update: October 18, 2026. Proposed experiments below are not reported as executed results.

`src/lib/bill_delta.ts` applies fixture price and allocation assumptions to an annual household estimate. The result is a scenario calculation. Attributing a real customer's bill increase requires the applicable tariff, effective period, customer class, utility cost-recovery treatment and a counterfactual holding other drivers constant.

Before updating rates, audit the units through every factor: dollars per MW-day is a capacity charge; annual kWh is energy. Converting between them requires a stated capacity-obligation or load-factor relationship. Allocation shares do not supply that missing physical conversion. Document the intended interpretation and verify it against a named tariff before presenting a refreshed empirical estimate.

The next proposed fixture holds household consumption constant while varying only the allocation rule, then holds the tariff fixed while varying the large-load scenario. Report these effects separately. A zero allocation share should produce zero attributed amount; an out-of-coverage ZIP should remain out of coverage. Source reachability and retrieval dates do not establish continued tariff applicability. This note flags the required methodology review and makes no tariff or policy recommendation.

## References

- https://www.ferc.gov/explainer-interconnection-final-rule
