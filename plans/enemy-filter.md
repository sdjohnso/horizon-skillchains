# Enemy Weakness Filter — v2

**Branch:** `main` (small project; single lane — no worktrees needed)
**Created:** 2026-07-12
**Status:** Not Started
**Next Action:** Study mob chart pages 6-8 structure, define `data/mobs.json` schema, extract a first page as a sample and confirm format before grinding all ~200 mobs.
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

## `data/mobs.json` schema (proposed)

```json
{
  "mobs": {
    "Colibri": {
      "weak":   ["ice", "light"],       // PDF/Horizon — primary
      "strong": ["wind"],
      "retail": { "weak": ["ice"], "strong": ["wind"] },  // cross-reference layer
      "note": ""
    }
  }
}
```

- Top-level `weak`/`strong` = the working (Horizon/PDF) values the engine uses.
- `retail` = cross-reference; UI shows a subtle flag when it diverges from PDF.
- Overrides for Horizon corrections continue to go in `data/overrides.json` (add a `mobWeakness`
  section when needed) — same philosophy as the WS data.

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

## Phases

### Phase 2 — Enemy weakness filter

- [ ] **2.1** Study pages 6-8; finalize `mobs.json` schema; extract **page 6** as a sample. **Validation:** Scott eyeballs ~10 decoded mobs for orb-reading accuracy (same red/orange care as WS extraction).
- [ ] **2.2** Extract pages 7-8 (remaining mobs). **Validation:** every mob on the chart present; spot-check multi-orb rows.
- [ ] **2.3** Cross-reference retail FFXI weaknesses into each mob's `retail` block; flag divergences.
- [ ] **2.4** Engine: `mobs` accessor + `tagAgainstMob`. **Validation:** node harness — a mob weak to `fire` highlights Liquefaction/Fusion/Light chains.
- [ ] **2.5** UI: enemy picker (searchable) + highlight/sort + optional filter toggle + retail-divergence flag. **Validation:** screenshot at 390px with an enemy selected.
- [ ] **2.6** Commit + push (auto-deploys to Pages). **Validation:** live URL, phone check.

## Follow-Up Plans (parking lot)

- **v3:** weapon damage-type weakness (piercing/slashing/blunt/H2H) — favor effective weapon types.
- 3-6 party members + multi-step chain visualization.
- Per-job weapon-skill level gating.
- Recreate the exact orb icon art (Gemini) if CSS orbs aren't enough.
- Contribute Horizon-specific WS/mob data back to the Horizon wiki.
