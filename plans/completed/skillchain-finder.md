# Skillchain Finder — v1

**Branch:** `main`
**Created:** 2026-07-12
**Status:** Phase 1 COMPLETE — v1 live at https://sdjohnso.github.io/horizon-skillchains/
**Next Action:** Verify data in-game and log results to data/overrides.json (see CLAUDE.md workflow). Then Phase 2 (enemy filter) or polish (icons via Gemini, results filter).
**Purpose:** Ship a mobile-first GitHub Pages tool where a player picks 2 combatants and sees every skillchain they can make.
**Security:** N/A — no DB, APIs, endpoints, or server-side user input. Purely static client-side lookups.

## Context

FFXI (Horizon server) players struggle to figure out which skillchains their party can make.
Scott built a clean PDF guide; this turns it into an interactive mobile-first web tool.
Horizon customizes weapon-skill properties, so Scott's PDF is the source of truth, not the wikis.

## Architecture

```
index.html ── loads ──> /data/*.json ──> engine.js (pure lookup) ──> renders results
                                            |
   user picks: [job + weapon | SMN + avatar] x2
                                            |
   engine enumerates every WS-pair (both directions) against skillchains.json combos
                                            |
   -> list of {skillchain, tier, elements, openerWS, closerWS}
```

- No build step, no framework. Static files served by GitHub Pages.
- Element icons recreated as CSS/SVG from the guide's colors (in `skillchains.json.properties[].color`).

## Files to Modify / Create

| File | Reason |
|------|--------|
| `data/skillchains.json` | Property + skillchain + combo table. **DONE — pending Scott verify.** |
| `data/weapons.json` | Weapon type -> WS -> ordered properties (PDF pp.2-4). |
| `data/summons.json` | Avatar -> blood pact -> ordered properties (PDF p.5). |
| `data/jobs.json` | Job -> usable weapon types; SMN -> avatars. |
| `index.html`, `styles.css`, `engine.js`, `ui.js` | The app. |
| `data/mobs.json` | Enemy weaknesses (PDF pp.6-8). v2 only. |

## Success Criteria

- On a phone, pick 2 combatants and see all formable skillchains, tiered, in < 2 taps each.
- SMN can pick weapon OR avatar; avatar blood-pact properties feed the engine.
- "No skillchain possible" shows a clean empty state.
- Width constrained to a readable paper-column; looks good on iPhone and desktop.
- Skillchain results match the PDF's recipe chart exactly.

## Open Questions

- Tier-1 skillchain magic-burst elements: assigned from each property's element — verify in-game.
- Do we show the *closer does more damage* / magic-burst hint inline? (Nice-to-have.)
- Repo name / GitHub Pages path — default `horizon-skillchains`.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-12 | GitHub Pages, static, vanilla JS | Free, public, no domain, zero backend needed |
| 2026-07-12 | v1 = 2 combatants + SMN/avatar; enemy filter = v2 | Scott's scope call |
| 2026-07-12 | PDF is source of truth over wikis | Horizon customizes WS properties |
| 2026-07-12 | No L2->L2; L2 only goes to L3 | Scott confirmed |
| 2026-07-12 | Recreate orb icons as CSS/SVG, not raster | Crisp on mobile, tweakable |

## Phases

### Phase 1 — Core finder (v1)

- [x] **1.1** Scaffold project, git, CLAUDE.md, `skillchains.json` combo table.
- [x] **1.2** Extract `weapons.json` from PDF pp.2-4 (WS -> ordered properties). 14 weapon types, ~110 WS. **Validation:** Scott spot-checks — pending.
- [x] **1.3** `summons.json` (p.5, 8 avatars) DONE. No `jobs.json` — v1 selects weapon type directly.
- [x] **1.4** `engine.js` — enumerates WS pairs both directions + overrides layer. **Validated** via node harness (Ifrit×Ramuh=Light, Sword×GSword=Darkness, etc. all correct).
- [x] **1.5** UI (`index.html`/`styles.css`/`app.js`) — 2 pickers, mobile-first, crystal orbs, tiered results, empty states. Screenshotted at 390px.
- [x] **1.6** Deployed to GitHub Pages (public repo sdjohnso/horizon-skillchains). Live URL verified 200, data loads over HTTPS, screenshotted Ifrit×Ramuh in production.
- [ ] **1.7** (polish) Optional "Level II+ only" filter — tier-1 pairs produce a lot of results.

### Phase 2 — Enemy weakness filter (v2)

- [ ] **2.1** Extract `mobs.json` (pp.6-8).
- [ ] **2.2** Add enemy picker; highlight chains ending on a weak element.

## Follow-Up Plans (parking lot)

- 3–6 party members + multi-step chain visualization.
- Per-job weapon-skill level gating (needs level data beyond the PDF).
- Contribute Horizon-specific WS data back to the Horizon wiki.
