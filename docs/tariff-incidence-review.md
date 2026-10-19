# A capacity price is upstream of a household bill

Method update: October 18, 2026. Proposed experiments below are not reported as executed results.

`src/lib/bill_delta.ts` applies fixture price and allocation assumptions to an annual household estimate. The result is a scenario calculation. Attributing a real customer's bill increase requires the applicable tariff, effective period, customer class, utility cost-recovery treatment and a counterfactual holding other drivers constant.

Before updating rates, audit the units through every factor: dollars per MW-day is a capacity charge; annual kWh is energy. Converting between them requires a stated capacity-obligation or load-factor relationship. Allocation shares do not supply that missing physical conversion. Document the intended interpretation and verify it against a named tariff before presenting a refreshed empirical estimate.

The next proposed fixture holds household consumption constant while varying only the allocation rule, then holds the tariff fixed while varying the large-load scenario. Report these effects separately. A zero allocation share should produce zero attributed amount; an out-of-coverage ZIP should remain out of coverage. Source reachability and retrieval dates do not establish continued tariff applicability. This note flags the required methodology review and makes no tariff or policy recommendation.

Follow-up, October 19, 2026: [DEC-002](../decisions/DEC-002-capacity-obligation.md) replaces the kWh term with a stated household capacity obligation (PLC, MW) and removes the residential allocation share.

## References

- PJM Manual 18: PJM Capacity Market, Rev. 63, sections 1.2.1 and 7.4–7.5: an LSE's Locational Reliability Charge is its Daily Unforced Capacity Obligation (MW, built from customer Peak Load Contributions) multiplied by the Final Zonal Capacity Price ($/MW-day). https://www.pjm.com/-/media/documents/manuals/m18.ashx (retrieved 2026-10-19)
