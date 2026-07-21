# Double Skillchain (3rd Combatant) — v3

**Branch:** `main` (small project; single lane — no worktrees needed)
**Created:** 2026-07-20
**Status:** In progress. **3.1–3.4 DONE + validated.** 3.1/3.2/3.3 committed; 3.4 (enemy filter on doubles) verified at 390px, committing now. Feature is functionally complete — only **3.5 ship** (push to Pages + phone-verify live + CLAUDE.md scope update) remains.
**Next Action:** 3.5 — push all v3 commits (deploys to Pages), verify on the live URL on a phone, update `CLAUDE.md` (v3→build/shipped, `chainConfirmations` note), move plan to `completed/`, update ROADMAP.
**Purpose:** Add an optional **third combatant** so the tool shows **double skillchains** — link 1 (A→B) floats a result, link 2 continues it (float→C) up a tier. This is the headline "Later" feature from v1/v2's parking lots.
**Security:** N/A — static client-side, no DB/API/user input.

## Context

v1 (2-combatant finder) and v2 (enemy weakness filter) are live at
https://sdjohnso.github.io/horizon-skillchains/. v3 generalizes the finder from **one link** to
**two links** (a "double skillchain": three weapon skills fire in sequence — WS1→WS2 makes
skillchain #1, then WS3 lands during the window to make skillchain #2).

**Two findings de-risk this before any code:**

1. **The data model is already chain-ready** (verified 2026-07-20). Tier-1 and tier-2 skillchain
   *results* (`liquefaction`, `fusion`, `gravitation`, …) double as valid **opener** tokens in
   `skillchains.json`'s combo table; only Light/Darkness (tier 3) never open → they terminate.
   So link 2 = feed link 1's floating result token back through the **same** `comboMap` lookup.
2. **The combo table already enforces Scott's tier rule** — no separate gate needed:
   - T1 openers → produce T1 **or** T2 results
   - T2 openers → produce **only** T3 results ("a step 2 can't start a step 1")
   - T3 tokens never appear as openers → chain ends naturally

**Mechanic confirmed by Scott (#3):** a formed skillchain *leaves its own property* for the next
link (Liquefaction leaves `liquefaction`). A floating T1 can open a new T1 or T2; a floating T2 is
the precursor only to T3; T3 ends. ("step" = tier.)

## Architecture

```
selA, selB, selC (C optional) ──► Engine.findDoubleChains(idA, idB, idC)
                                        │
   for each ordered role assignment (first, second, third) over {A,B,C}:
        link 1: tryPair(WS1, WS2)  ──► resolved floating token F1 (tier t1)   [existing dominance
                                        + pairConfirmations + comboOverrides]   logic, reused as-is]
        if t1 == 3 → terminal, not a double (covered by single-chain view)
        link 2: comboMap[F1 | prop(WS3)] ──► resolved F2 (tier t2)             [same lookup +
                                        + chainConfirmations override]          NEW override section]
                                        │
   emit sequence: [WS1→WS2 ⇒ F1] → [F1→WS3 ⇒ F2], final tier t2, MB elements = F2.elements
                                        │
   dominance: one double per ordered WS-triple (win each link); dedup identical sequences;
   group by final chain F2 (mirror current grouping); sort by final tier desc
                                        │
   enemy filter (v2): tagAgainstMob on the FINAL chain's elements (F2) — reuse unchanged
```

When **C is empty**, `render()` falls through to the existing `findSkillchains(a,b)` path — v1/v2
behavior is byte-for-byte unchanged.

## Override schema decision (#4 — settled)

Link 2 is the same property-combo lookup as link 1, so most of the override layer already covers it:

- `comboOverrides` (property-level) — **already governs link 2**; no change.
- `weaponSkillProperties` (WS-level) — applies to a WS in any role; no change.
- `pairConfirmations` — stays for **link 1**; engine resolves link 1 through it first, so link 2
  always chains from the **Horizon-resolved** floating token, never the raw PDF prediction.
- **NEW `chainConfirmations`** — the only new empirical unit: a link-2 result that depends on the
  specific closing WS (not just the property combo). Ships empty; populated as Scott tests.

```json
"chainConfirmations": [
  { "from": "liquefaction", "ws": "Closer WS Name",
    "result": "distortion"|null, "status": "confirmed"|"fizzles"|"different", "note": "" }
]
```
`from` = floating token entering link 2 (a T1 or T2 token); `ws` = link-2 closer WS.
Semantics mirror `pairConfirmations`: `fizzles` hides the double, `different` swaps the final
result, `confirmed` earns a ✓. Base data stays pristine; all Horizon truth stays in overrides.

## Files to Modify / Create

| File | Reason |
|------|--------|
| `engine.js` | Add `findDoubleChains(idA,idB,idC)`; refactor `tryPair`'s winner-resolution into a reusable `resolveLink(openerProps, closerProps, openerName, closerName)` so links 1 & 2 share it; read `chainConfirmations`. |
| `data/overrides.json` | Add empty `chainConfirmations: []` + `_schema` note. |
| `index.html` | Add optional third combatant `<select>` (`selC`), reusing the A/B markup/labels. |
| `styles.css` | Two-step sequence card (link 1 row → link 2 row), final-chain header, keep enemy highlight/resist styling. |
| `app.js` | Wire `selC`; branch render to double-chain cards when C set; tag doubles on final chain; enemy bar counts. |
| `CLAUDE.md` | Document double-skillchain scope move v3→build, `chainConfirmations`, and the "results carry their property forward" chaining rule (already in "Skillchain engine rules"; add the override note). |
| `plans/ROADMAP.md` | Add this plan under In progress. |

## Success Criteria

- Pick three combatants → every **double skillchain** they can make, each shown as a legible
  two-step sequence (WS1→WS2 ⇒ chain #1, then →WS3 ⇒ chain #2) with the final tier + MB elements.
- Tier rule holds: no T2→T1, no T2→T2, no T3→anything; T1 floats can go T1 or T2.
- One double per ordered WS-triple (dominance), de-duplicated; no combinatorial wall.
- Enemy filter works on the **final** chain's elements (weak-hit highlight/float, resist dim).
- Overrides honored end to end: a link-1 `fizzles`/`different` propagates into link 2; a
  `chainConfirmations` entry hides/swaps/ticks the double.
- **Leaving C empty = v1/v2 unchanged.** Verified on the live URL on a phone.

## Open Questions (confirm with Scott before/*during* 3.1–3.3)

1. ~~When C is set, show singles too or doubles only?~~ **DECIDED: doubles only** when all three are
   set. Two combatants (C empty) already show the single weapon-skill chains — no need to repeat them.
2. **Magic-burst window for a double = the final chain (F2) elements?** Lean: **yes** — consistent
   with v2's "whole chain's element set is the MB window" rule; F2 is what's on screen when you burst.
3. **Same source picked for 2–3 roles** (e.g. three players on the same weapon type) — allow it?
   Lean: **allow** (duplicate-safe permutation logic), since a real party can stack jobs/weapons.
4. **Ordering display:** collapse mirror orderings, or show each distinct WS-triple sequence?
   Lean: one row per distinct **final sequence** after dominance/dedup.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-20 | #3 confirmed: a formed skillchain leaves its **own property** for the next link; floating T1 → T1 or T2; floating T2 → T3 only; T3 ends | Scott, in-game mechanic; matches CLAUDE.md engine rules |
| 2026-07-20 | Data model verified **chain-ready**: T1/T2 result tokens reused as opener tokens; combo table already forbids illegal tier transitions → **no separate tier-gate code** | Script check of `skillchains.json` combos |
| 2026-07-20 | #4 settled: `comboOverrides`/`weaponSkillProperties` already cover link 2; keep `pairConfirmations` for link 1; add **`chainConfirmations`** (`from` token + closer `ws`) for link-2-specific empirical results; ships empty | Reuse over fork; matches how Horizon differences are discovered by testing |
| 2026-07-20 | Link 2 chains from the **override-resolved** link-1 result, not the PDF prediction | Correctness: a Horizon `different`/`fizzles` on link 1 must flow through |
| 2026-07-20 | Gated on enemy-filter 2.7 (ship or park) to respect WIP=2 | Plan-system WIP discipline |
| 2026-07-20 | Q1 DECIDED: **doubles only** when C is set; 2-combatant mode keeps showing single WS chains | Scott — singles are already covered by the 2-combatant view; no need to duplicate |

## Phases

### Phase 3 — Double skillchain

- [x] **3.1** Engine **DONE.** Extracted `tryPair`'s dominance into shared `resolveCombo(openerProps,
      closerProps)` (identical logic; `tryPair` now calls it). Added `resolveLink1` (WS+WS, applies
      `pairConfirmations`), `resolveLink2` (floating token + WS, applies `chainConfirmations`),
      `findChainConfirmation`, and `findDoubleChains(idA,idB,idC)`: 6 ordered role permutations
      (deduped by source-id triple), link 1 → if `tier<3` link 2 from the resolved float, sequence
      dedup, group by final chain, sorted final-tier desc + deterministic within-group order. Exposed
      on `window.Engine`. **Pure, no DOM.** *Validated:* node harness `scratchpad/harness31.js` — 11/11:
      engine output == an independent oracle (350 seq / 9 groups for Archery/Axe/Club **and** the
      all-same-source case); tier gate (no T2→non-T3) 0 bad; never starts link 2 from a T3 float;
      every seq's `link2.result` matches its group; MB elements == final chain elements; unknown id →
      `[]`; refactored `findSkillchains` still well-formed. Example: Blast Arrow→Brainshaker=Fragmentation
      (T2) → Decimation = Light (T3).

- [x] **3.2** Overrides **DONE.** Added `chainConfirmations: []` + `_schema` entry to `overrides.json`
      (ships empty); engine already wires it via `findChainConfirmation`/`resolveLink2` (fizzles→drop,
      different→swap final, confirmed→flag). *Validated:* node harness `scratchpad/harness32.js` — 9/9:
      empty section parses as `[]`; on a real double (fragmentation→Decimation=light, 5 seq) fizzles
      removes exactly those 5, different swaps all to a new final chain (grouped correctly), confirmed
      keeps them with `link2.status==='confirmed'`, and clearing restores baseline.

- [x] **3.3** UI **DONE.** Added optional `selC` (`index.html`, reuses `buildSelect`); grid now
      `1fr auto 1fr auto 1fr`, stacks single-column ≤560px (three pickers won't fit on a phone).
      `render()` branches to `renderDoubles(a,b,c)` when all three are set → **doubles-only** cards:
      final-chain header (orb + name + "Level III" pill + Magic-Burst orbs = final chain's elements)
      over per-sequence two-row bodies (`sequenceRow`: link 1 WS→WS ⇒ float chip, then `↳` float →
      WS ⇒ final chip; ✓ ticks on confirmed). New `scResult` chip + `.seqs/.seq/.seq-step` CSS.
      Leaving C empty keeps v1/v2 byte-identical. *Validated:* Playwright at 390px — C empty →
      "7 skillchains · 63 ways" (v1); C set → "9 doubles · 350 ways", 9 cards, enemy bar hidden,
      **zero console errors**; clearing C restores v1. Screenshot confirms Light/Level III card with
      correct 4-element MB orbs + readable `Blast Arrow→Brainshaker=Fragmentation ↳ →Decimation=Light`.

- [x] **3.4** Enemy filter integration **DONE.** `renderDoubles` now passes the double **groups**
      straight to `Engine.tagAgainstMob` (it reads only `.elements` = the final chain and preserves
      `.sequences`), then reuses the v2 filter/sort/enemy-bar path verbatim (weak-only default,
      show-all toggle, `sortForDisplay`). `doubleCard` gained the `weak-hit`/`resisted` classes, WEAK
      flag, and hot MB orbs. *Validated:* Playwright at 390px — Archery/Axe/Club vs **Antlion**
      (weak wind/light): 9 doubles → **4 weak-only**; enemy bar "Showing 4 that land on a weakness ·
      Show all 9"; 4 WEAK flags + 5 hot orbs; toggle → 9 shown, 1 resisted/dimmed, weak-hits floated
      to top; **zero console errors**. Screenshot confirms the Light card's WEAK badge + glow + ringed
      hot orbs.

- [ ] **3.5** Commit + push (auto-deploys to Pages); verify on the live URL on a phone; update
      `CLAUDE.md` (scope v3→build, `chainConfirmations` note) and `ROADMAP.md`.
      *Validation:* live phone check — pick 3 combatants, see doubles; pick an enemy, see the filter;
      clear C, confirm v1/v2 unchanged.

### Next Session Prompt (3.1)

> In `~/Developer/horizon-skillchains`, start plan `plans/double-skillchain.md` step 3.1. Read the
> plan header + Architecture + the `resolveLink` refactor note. In `engine.js`, extract `tryPair`'s
> winner-resolution into `resolveLink(...)`, then build `findDoubleChains(idA,idB,idC)` per the
> Architecture diagram (link 1 → floating token → link 2 through the same `comboMap`; combo table
> already enforces the tier gate; dominance per ordered WS-triple; dedup; group by final chain).
> Validate with a node harness against hand-worked PDF examples. Do NOT touch the UI yet.

## Follow-Up Plans (parking lot)

- **Triple+ chains / 4–6 party** — generalize `findDoubleChains` to N links (the recursion is the
  same: resolved float → next link until T3 or no combo). Watch the result-count explosion; may need
  "best chain to each enemy weakness" ranking rather than listing all.
- Per-job weapon-skill **level gating** (which WS a job actually has at a given level).
- Weapon damage-type weakness (v3-elements' dormant `weaponWeak`/`weaponStrong`) — separate from this.
