# Property Dominance — single-result skillchain resolution

**Branch:** `main` (small project; single lane)
**Created:** 2026-07-12
**Status:** ✅ Complete (2026-07-12) — deployed to Pages.
**Next Action:** None. `engine.js` `tryPair` now resolves one winner per directed pair; also fixed a latent same-source double-count. Validated by node harness (9/9) + 390px screenshot (Archery×Club 55→50 ways).
**Purpose:** Weapon skills carry **priority-ordered** properties. In-game, a directed WS pair fires exactly one skillchain — not one per property. The current engine emits a chain for every opener-prop × closer-prop combo, so multi-property WS (e.g. Flaming Arrow = `[liquefaction, transfixion]`) show **phantom chains** that never fire and an inflated "N ways" count. This is a correctness bug in the shipped v1 engine, surfaced during v2.
**Security:** N/A — static client-side, no DB/API/user input.

## The rule (confirmed with Scott, 2026-07-12)

For a directed pair — opener `O` (ordered props) closing into closer `C` (ordered props):

1. Enumerate all valid combos: `(pA @ i in O.props) × (pB @ j in C.props)` where `comboMap[pA|pB]` exists.
2. If none → **no skillchain** for this directed pair.
3. Otherwise pick the **winner**:
   - **highest tier** wins (retail "highest-level SC" rule — Scott confirmed higher tier wins);
   - tie on tier → **lowest opener index i** (dominant/earlier opener property wins);
   - still tied → **lowest closer index j** (dominant/earlier closer property wins).
   - Priority-order applies to **both** the opener and closer lists (Scott confirmed).
4. The winner's chain is THE result. Its `pA`/`pB` are the properties recorded for orb display.

**Flaming Arrow example** (`[liquefaction(0), transfixion(1)]` opening):
- Closer chains off liquefaction (any tier) and transfixion only makes an equal-or-lower tier → **liquefaction** wins (dominant).
- Closer can't chain off liquefaction but can off transfixion → **transfixion** fires (fallback).
- Closer makes a T2 off transfixion but only T1 off liquefaction → **transfixion** wins (higher tier beats dominance).

## Files to Modify

| File | Reason |
|------|--------|
| `engine.js` | `tryPair` → resolve to one winning combo per directed pair; keep pairConfirmation (`fizzles`/`different`) override applied AFTER resolution. |
| `plans/property-dominance.md` | This plan. |
| (maybe) `app.js` | Only if the "N ways" wording needs a tweak once counts drop. Likely no change. |

## Notes / gotchas

- Preserve the **two role assignments** (A opens B, and B opens A) — resolution is per *directed* pair.
- `pairConfirmations`: `fizzles` still suppresses; `different` still forces `conf.result`. Apply the override to the resolved winner (override beats computed result).
- The dedupe-per-pair guard (`seenForThisPair`) becomes moot — there's now one result per directed pair.
- Chaining rules (T1→T1/T2, T2→T3 only) are for multi-step 3+ WS chains — **out of scope here**; this is 2-WS resolution only.

## Success Criteria

- Each directed WS pair contributes at most one (chain, pair) row.
- Flaming Arrow (Archery) opening a closer that chains with both its props shows only the dominant/higher-tier result, not both.
- Total "ways" counts drop for multi-property arsenals; no *legitimate* single-property chain disappears.
- v1 behavior for single-property WS pairs is unchanged.

## Validation

- Node harness (see `scratchpad/test-engine.js` pattern): pick arsenals with multi-property WS; assert each directed pair yields ≤1 chain; spot-check Flaming Arrow cases against Scott's three examples above.
- Re-screenshot a couple of pairs to confirm counts look right and nothing legitimate vanished.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-12 | One skillchain per directed WS pair | Matches in-game; removes phantom chains |
| 2026-07-12 | Higher tier wins; ties by list-order (opener then closer); applies to both lists | Scott confirmed in-game |
