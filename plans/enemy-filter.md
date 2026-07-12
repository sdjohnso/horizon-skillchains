# Enemy Weakness Filter — v2

**Branch:** `main` (small project; single lane — no worktrees needed)
**Created:** 2026-07-12
**Status:** In Progress — data (2.1/2.2) + engine (2.4) + UI (2.5) shipped; property-dominance ("one more logic") shipped as its own plan. **2.3 retail cross-ref DONE** (126/130 families have a `retail` block; validated). **2.8 result-card UI polish DONE**: inline tier pill + WEAK flag, element name-chips → colored MB orbs with weak-element ring. Committed + pushed.
**Next Action:** 2.7 — wire the retail-divergence flag in `app.js`/`styles.css` (data + engine passthrough are ready; UI badge not built yet). Only open follow-up. Retail layer is **normalized** to one consistent primary-weakness definition (only 8 genuine divergences remain).
**Purpose:** Let the player pick an enemy and highlight/filter the skillchains that land on an element it's weak to — which also trims the wall of tier-1 results.
**Security:** N/A — static client-side, no DB/API/user input.

## Context

v1 (skillchain finder) is live at https://sdjohnso.github.io/horizon-skillchains/ and complete
(see `plans/completed/skillchain-finder.md`). Its one rough edge: two weapon types can produce
50+ tier-1 chains — a lot to scroll. v2 adds an **enemy picker**. When an enemy is chosen, the app
knows its elemental weaknesses (PDF pages 6-8) and highlights/filters skillchains whose elements the
enemy is **weak** to (bigger skillchain + magic-burst damage), and can de-emphasize ones it resists.
This is both a new feature AND the natural way to trim results down to what matters for the fight.

Scott's framing: highlight the chains that **end on** an element the enemy is weak to (the closer does
the most damage, and you magic-burst the skillchain's element right after).

### Two data layers (Scott's request)

- **PDF layer** = the mob weaknesses from Scott's guide (pages 6-8). Horizon-relevant, primary.
- **Retail layer** = cross-reference against retail FFXI mob weaknesses (BG Wiki / FFXIclopedia) as an
  extra layer of assistance. Store alongside the PDF values; surface differences subtly. Do NOT
  overwrite the PDF values — keep both so the tool can show "guide says X, retail says Y."

### Explicitly deferred to v3

- **Weapon damage-type weakness** (piercing / slashing / blunt / H2H — the eyedropper/hammer icons on
  the chart). v2 is elements only. Capture the weapon icons opportunistically during extraction if
  cheap, but the v2 UI does not use them.

## Architecture

```
data/mobs.json  ─ loaded by engine ─┐
                                     ▼
  user picks enemy (optional 3rd control)
                                     ▼
  engine tags each skillchain result:
    - weakHit  = chain.elements ∩ mob.weak   (highlight / float to top)
    - resisted = chain.elements ⊆ mob.strong (de-emphasize or hide)
                                     ▼
  UI: enemy dropdown (searchable, ~200 entries) + optional
      "only show what it's weak to" toggle
```

Elements are the 8 game elements (fire, ice, wind, earth, lightning, water, light, dark), same tokens
as skillchain `elements`, so matching is a direct set intersection. Plus a `all` marker for the
rainbow orb (weak/strong to everything).

## `data/mobs.json` schema (FINAL — built)

```json
{
  "mobs": {
    "Colibri": {
      "weak":   ["ice"],                // PDF/Horizon elements — primary (engine uses these)
      "strong": ["wind"],
      "weaponWeak":   ["piercing"],     // DORMANT v3: physical damage-type weakness
      "weaponStrong": [],               // DORMANT v3
      "retail": { "weak": ["ice"], "strong": ["wind"] },  // cross-ref layer (added in 2.3)
      "note": ""
    }
  }
}
```

- Keys are mob **families** (alphabetical, exactly as the chart lists them). 130 families with data.
- Top-level `weak`/`strong` = working (Horizon/PDF) element values the engine uses. Tokens = 8 elements
  + `"all"` (rainbow orb = weak/strong to everything).
- `weaponWeak`/`weaponStrong` = physical damage types (`piercing`/`slashing`/`blunt`/`h2h`) — captured now
  but **dormant**: v2 ignores them, v3 turns them on. Exact type behind each grey/brown tool icon is
  **provisional** (see `_weaponLegend._provisional`), verify in the v3 weapon pass.
- `retail` = cross-reference; added in 2.3; UI shows a subtle flag when it diverges from PDF. Never overwrites PDF.
- Fully-blank families are **omitted** entirely (not listed). Weapon-only families (Rafflesia) are retained
  for v3 but the **v2 picker lists only families with ≥1 weak/strong element** (129 of 130).
- Horizon corrections still go in `data/overrides.json` (`mobWeakness` section) — same philosophy as WS data.

## Files to Modify / Create

| File | Reason |
|------|--------|
| `data/mobs.json` | NEW. ~200 mobs, weak/strong elements (PDF) + retail cross-ref. |
| `engine.js` | Load mobs.json; add `tagAgainstMob(chains, mobId)` and a mob list accessor. |
| `index.html` | Add optional enemy `<select>` (searchable) + filter toggle. |
| `styles.css` | Weak-hit highlight, resisted de-emphasis, retail-divergence flag. |
| `app.js` | Wire enemy selection into render; sort/badge/filter. |
| `data/overrides.json` | Add `mobWeakness` override section (schema note). |
| `CLAUDE.md` | Document mobs.json + retail-layer + v3 deferral. |

## Success Criteria

- Pick two combatants + an enemy → chains whose elements the enemy is weak to are clearly highlighted
  and floated to the top; the list feels shorter/more actionable than v1's wall.
- Enemy picker is fast to use with ~200 entries (type to filter).
- Where PDF and retail disagree, the UI shows it (no silent overwrite).
- Selecting no enemy = v1 behavior unchanged.
- Deployed; verified on the live URL on a phone.

## Open Questions

- Default when an enemy is picked: highlight-and-sort (show all) vs. filter-to-weak-only? (Lean:
  highlight + sort by default, with a toggle to hard-filter. Confirm with Scott.)
- Match on the **skillchain's** elements, the **closing WS's** element, or both? (Lean: skillchain
  elements, since that's the magic-burst window. Confirm.)
- Retail source of truth: BG Wiki vs FFXIclopedia when they differ.
- Rainbow "all" and "no data" mobs — how to display.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-12 | v2 = elements only; weapon damage-type weakness → v3 | Scott's scope call |
| 2026-07-12 | Keep PDF + retail as two layers, don't overwrite | Scott wants retail as extra assistance |
| 2026-07-12 | Document weapon weaknesses NOW (dormant `weaponWeak`/`weaponStrong`), use in v3 | Scott: capture while reading rows — avoids re-extraction. Type taxonomy provisional. |
| 2026-07-12 | Chart is by **family**; list only families with data | Scott: "it's always by family. I would just list the families that have weaknesses." Fully-blank families omitted. |
| 2026-07-12 | Keep strong-only families (Behemoth, Ahriman, etc.) in picker | Still drive resist/de-emphasize + rainbow messaging. Revisit if Scott wants weak-only. |
| 2026-07-12 | Default view = **filter to weak-only** (toggle reveals rest) | Scott — most aggressive trim of the tier-1 wall |
| 2026-07-12 | Match weak-hit on the **whole skillchain's `elements` set**, NOT a single closing element | Scott: closing element = the WS property only for Tier 1; Tier 2/3 results carry a new multi-element set (Fusion=light+fire, Light=4 elements) with no single "closer" element. The magic-burst window = the full `chain.elements`. Rule: `mob.weak ∩ chain.elements ≠ ∅`. |
| 2026-07-12 | Element orb legend locked (red=fire/orange=earth/navy=water/cyan=ice/green=wind/purple=lightning/yellow=light/black=dark/rainbow=all) | Verified against Bomb/Demon/Djinn "all-but-one" rows + retail cross-checks. |
| 2026-07-12 | **2.3 retail layer added additively** — `retail:{weak,strong,source}` appended to 126/130 families; PDF `weak`/`strong` never overwritten (script only inserts). | Scott's two-layer rule; keeps "guide says X / retail says Y." |
| 2026-07-12 | **4 families skipped (no retail block)**: Avatar (weakness varies per avatar), Hydra (per-mob, no family-wide analog), Memory Receptacle (varies per Promyvion zone), Rafflesia (weapon-only, no clear retail element data). | Rule: no silent guessing where no real retail mapping exists. |
| 2026-07-12 | **Retail research methodology was split on the first pass, then NORMALIZED.** First pass: chunks A/B/D–F/T–Y read the consolidated Allakhazam chart (≈PDF); chunks C/G–I/K–M/O–R/S read BG Wiki granular per-element %% tables (anything >100% counted "weak") → over-broad weakness lists and inflated "divergences." Fix (per Scott): re-verified the 32 divergent/inflated families across 4 subagents pinned to ONE definition — the family's **primary/canonical weakness** as a consolidated mob-weakness chart expresses it (1–2 standout elements), not every element >100%. | Scott: "normalize the retail layer for consistency." Uniform source discipline beats uneven fan-out output. |
| 2026-07-12 | **Post-normalization: only 8 genuine retail divergences remain** (was ~34). Kept: **Behemoth** (retail weak lightning vs PDF strong lightning), **Gigas** (retail weak ice/lightning vs PDF strong ice/lightning — inversion), **Golem** (retail resist-all/no-weakness; BG per-element 70%% all vs PDF weak lightning), **Khimaira** (retail dual weak earth+ice vs PDF earth), **Orcish Warmachine** (retail absorbs fire → strong fire, added), **Orobon** (retail adds light-weak + dark-strong), **Sandworm** (retail adds earth-resist; consolidated-chart sourced, not re-touched), **Soulflayer** (retail confirmed only lightning-weak / fire,ice-strong; PDF's light-weak & dark-strong unverifiable in retail). The other 26 collapsed to PDF: their extra weak/strong entries were %%-table artifacts, and **Ahriman/Cardian/Wamoura** were confirmed INVERTED first-pass readings (all three are strong-to, not weak-to). | Divergence still derivable at render (PDF set ≠ retail set); `source` stored per family for provenance. |

## Phases

### Phase 2 — Enemy weakness filter

- [x] **2.1** Study pages 6-8; finalize `mobs.json` schema; extract **page 6** as a sample. Scott confirmed page-6 reads ("that all looks good"). Legend locked.
- [x] **2.2** Extract pages 7-8 (remaining mobs). 130 families total; JSON validates; every non-blank chart row present. Weapon layer captured (dormant).
- [x] **2.3** Cross-reference retail FFXI weaknesses into each mob's `retail` block; flag divergences. **DONE:** fanned out ~130 lookups across 9 alphabetical-chunk subagents (BG Wiki primary, FFXIclopedia fallback), merged via scratchpad script that only *appends* `retail:{weak,strong,source}` (PDF arrays untouched). 126 families mapped, **4 skipped** (Avatar, Hydra, Memory Receptacle, Rafflesia — no fixed retail family analog). Then **normalized** (see Decisions Log): re-verified the 32 families whose first-pass values came from BG granular resistance-%% tables against one consistent consolidated-chart / primary-weakness definition. 26 collapsed to the PDF value (their extra weaknesses were %%-table artifacts; Ahriman/Cardian/Wamoura were inverted readings), leaving **8 genuine divergences** (Behemoth, Gigas, Golem, Khimaira, Orcish Warmachine, Orobon, Sandworm, Soulflayer). Validated with node harness both passes.
- [x] **2.4** Engine: `listMobs` + `getMob` + `tagAgainstMob` (+ `elementColorOf`). Matches on full `chain.elements`; handles `all` rainbow + strong-all/no-weak fallbacks. **Validated:** node harness — Cluster (weak fire) highlights Liquefaction/Fusion/Light; Colibri resists Detonation; Demon resists 9; Ahriman(strong-all) resists all.
- [x] **2.5** UI: enemy picker (type-to-filter `<datalist>`) + weak-only default + Show-all toggle + weak-hit glow + hot element chip + resisted dim + enemy summary bar. **Validated:** screenshots at 390px (no-enemy = v1; weak-only trims 7→3; show-all floats hits to top).
- [x] **2.6** Commit + push (auto-deploys to Pages). Done for the v2 UI/engine (prior commits) and again for 2.3 retail data.
- [ ] **2.7** *(follow-up, from 2.3)* Wire the **retail-divergence flag** in the UI. Engine already returns `mob.retail` (engine.js `getMob`/`listMobs`); nothing in `app.js`/`styles.css` yet renders it. Compute divergence at render time (PDF `weak`/`strong` set ≠ `retail.weak`/`retail.strong` set) and show a subtle badge/tooltip ("guide says X · retail says Y"), citing `retail.source`. Confirm desired treatment with Scott before building.
- [x] **2.8** UI polish (result cards): tier "Level X" pill + WEAK flag inline on the skillchain-name row; element **name chips → colored element orbs** (reused `elementOrb`, `.orb.hot` ring/glow for the enemy's weak elements), prefixed with an **"MB:"** label (magic-burst elements). Removed dead `.elem-chip*` CSS. **Follow-up (same step):** brought the **MB label + orbs fully onto the name row** (grouped in `.sc-mb`, wraps as a unit); enlarged orbs to 22px (`.orb.mb`) + MB label to 13px; added an **element-name popup** (`.elem-tip`) that shows on hover (desktop) and tap (touch, auto-dismiss 2s), driven by `data-elem`/`aria-label` on every element orb (enemy bar included). **Validated:** screenshots at 390px — Detonation/Transfixion fit on one line, Fragmentation's longer name wraps the MB group; tapping an orb shows its element name ("Water"); no-enemy state has no WEAK flag; toggle intact. **Follow-up 2:** relabeled "MB:" → "Magic Burst:"; made it responsive — inline on the name row for tablet/desktop (≤620px column has room), and dropped to its own line below the name on phones via `@media (max-width: 540px) .sc-mb { flex-basis: 100% }`. Validated at 390px (stacked) and 760px (inline).

## Post-ship logic — property dominance → moved to its own plan

Confirmed with Scott and promoted to **`plans/property-dominance.md`** (both open questions answered:
higher tier wins, ties by list-order on opener then closer). Next engine work happens there.

## Follow-Up Plans (parking lot)

- **v3:** weapon damage-type weakness (piercing/slashing/blunt/H2H) — favor effective weapon types.
- 3-6 party members + multi-step chain visualization.
- Per-job weapon-skill level gating.
- Recreate the exact orb icon art (Gemini) if CSS orbs aren't enough.
- Contribute Horizon-specific WS/mob data back to the Horizon wiki.
