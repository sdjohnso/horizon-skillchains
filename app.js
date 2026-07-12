/* Horizon Skillchains — UI wiring */
(function () {
  "use strict";

  var selA, selB, resultsEl, selEnemy, enemyClear, enemyBar;
  var showAllChains = false;   // enemy filter: false = weak-only (default), true = show all

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Build an orb element for a property/skillchain token.
  function orb(token, small) {
    var colors = Engine.orbColors(token);
    var n = el("span", "orb" + (small ? " small" : ""));
    if (colors.length === 1) {
      n.style.background = "radial-gradient(circle at 35% 30%, " +
        lighten(colors[0]) + ", " + colors[0] + ")";
    } else {
      n.style.background = "conic-gradient(from 135deg, " +
        colors[0] + " 0deg 180deg, " + colors[1] + " 180deg 360deg)";
    }
    n.title = Engine.propLabel(token);
    return n;
  }
  // crude lighten for the highlight side of the radial
  function lighten(hex) {
    var c = hex.replace("#", "");
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    var r = Math.min(255, parseInt(c.substr(0,2),16) + 60);
    var g = Math.min(255, parseInt(c.substr(2,2),16) + 60);
    var b = Math.min(255, parseInt(c.substr(4,2),16) + 60);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function buildSelect(sel, selectedId) {
    var sources = Engine.listSources();
    sel.innerHTML = "";
    var ph = el("option", null, "Choose…");
    ph.value = "";
    sel.appendChild(ph);

    var groups = [
      { label: "Weapons", kind: "weapon" },
      { label: "Avatars (Summoner)", kind: "avatar" }
    ];
    groups.forEach(function (g) {
      var og = document.createElement("optgroup");
      og.label = g.label;
      sources.filter(function (s) { return s.kind === g.kind; })
             .forEach(function (s) {
        var o = el("option", null, s.label);
        o.value = s.id;
        if (s.id === selectedId) o.selected = true;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  }

  // Build a small orb straight from a raw element token (for the enemy's weakness display).
  function elementOrb(e) {
    var color = Engine.elementColorOf(e);
    var n = el("span", "orb small");
    n.style.background = "radial-gradient(circle at 35% 30%, " + lighten(color) + ", " + color + ")";
    n.title = e.charAt(0).toUpperCase() + e.slice(1);
    return n;
  }
  function rainbowOrb(titleText) {
    var n = el("span", "orb small rainbow");
    n.title = titleText || "All elements";
    return n;
  }

  function buildMobList() {
    var list = document.getElementById("mob-list");
    list.innerHTML = "";
    Engine.listMobs().forEach(function (m) {
      var o = document.createElement("option");
      o.value = m.name;
      list.appendChild(o);
    });
  }

  // Resolve the typed enemy value to a known family name (case-insensitive), or null.
  function resolveMob(value) {
    if (!value) return null;
    var v = value.trim().toLowerCase();
    if (!v) return null;
    var hit = Engine.listMobs().filter(function (m) { return m.name.toLowerCase() === v; })[0];
    return hit ? hit.name : null;
  }

  // The enemy summary bar: weakness orbs + how many chains land, + weak-only/show-all toggle.
  function buildEnemyBar(tag, shownCount, totalCount, canToggle) {
    enemyBar.innerHTML = "";
    enemyBar.hidden = false;

    var top = el("div", "enemy-bar-top");
    top.appendChild(el("span", "enemy-name", tag.mob.name));

    var orbs = el("span", "enemy-orbs");
    orbs.appendChild(el("span", "enemy-orbs-label", "weak"));
    if (tag.weakAll) {
      orbs.appendChild(rainbowOrb("Weak to all elements"));
      orbs.appendChild(el("span", "enemy-orbs-all", "all elements"));
    } else if (tag.mob.weak.length) {
      tag.mob.weak.forEach(function (e) { orbs.appendChild(elementOrb(e)); });
    } else {
      orbs.appendChild(el("span", "enemy-orbs-none", "none listed"));
    }
    top.appendChild(orbs);
    enemyBar.appendChild(top);

    var bottom = el("div", "enemy-bar-bottom");
    var summary = el("span", "enemy-summary");
    if (tag.strongAll) {
      summary.textContent = "Resists every element — no super-effective chains. Showing all.";
    } else if (tag.weakCount === 0) {
      summary.textContent = tag.hasWeak
        ? "None of these chains land on its weaknesses. Showing all."
        : "No listed weaknesses. Showing all.";
    } else if (tag.weakAll) {
      summary.textContent = "Weak to all elements — every chain lands.";
    } else {
      summary.textContent = showAllChains
        ? (tag.weakCount + " of " + totalCount + " land on a weakness")
        : ("Showing " + shownCount + " that land on a weakness");
    }
    bottom.appendChild(summary);

    if (canToggle) {
      var btn = el("button", "enemy-toggle", showAllChains ? "Weak only" : ("Show all " + totalCount));
      btn.type = "button";
      btn.addEventListener("click", function () { showAllChains = !showAllChains; render(); });
      bottom.appendChild(btn);
    }
    enemyBar.appendChild(bottom);
  }

  function sortForDisplay(chains) {
    return chains.slice().sort(function (x, y) {
      var wx = x.weakHit ? 0 : 1, wy = y.weakHit ? 0 : 1;
      if (wx !== wy) return wx - wy;                  // weak hits first
      var rx = x.resisted ? 1 : 0, ry = y.resisted ? 1 : 0;
      if (rx !== ry) return rx - ry;                  // resisted last
      if (y.tier !== x.tier) return y.tier - x.tier;  // then higher tier
      return x.chain.localeCompare(y.chain);
    });
  }

  function render() {
    var a = selA.value, b = selB.value;
    resultsEl.innerHTML = "";

    var mobName = resolveMob(selEnemy.value);
    enemyClear.hidden = !selEnemy.value;

    if (!a || !b) {
      enemyBar.hidden = true;
      resultsEl.appendChild(emptyState("Pick two combatants to see the skillchains they can make."));
      return;
    }

    var chains = Engine.findSkillchains(a, b);
    if (!chains.length) {
      enemyBar.hidden = true;
      resultsEl.appendChild(emptyState("No skillchains — these two can’t chain together."));
      return;
    }

    // No enemy chosen → v1 behavior.
    if (!mobName) {
      enemyBar.hidden = true;
      var count = chains.reduce(function (n, c) { return n + c.pairs.length; }, 0);
      resultsEl.appendChild(el("p", "count-line",
        chains.length + " skillchain" + (chains.length > 1 ? "s" : "") +
        " · " + count + " way" + (count > 1 ? "s" : "")));
      chains.forEach(function (c) { resultsEl.appendChild(chainCard(c)); });
      return;
    }

    // Enemy chosen → tag, then filter/highlight.
    var tag = Engine.tagAgainstMob(chains, mobName);
    var total = tag.chains.length;
    var display, canToggle;

    if (tag.weakCount === 0) {
      display = sortForDisplay(tag.chains);   // nothing to trim to; show all, dim resisted
      canToggle = false;
    } else if (tag.weakAll) {
      display = sortForDisplay(tag.chains);   // all are weak hits
      canToggle = false;
    } else if (showAllChains) {
      display = sortForDisplay(tag.chains);
      canToggle = true;
    } else {
      display = sortForDisplay(tag.chains.filter(function (c) { return c.weakHit; }));
      canToggle = true;
    }

    buildEnemyBar(tag, display.length, total, canToggle);
    display.forEach(function (c) { resultsEl.appendChild(chainCard(c)); });
  }

  function emptyState(msg) { return el("div", "empty", msg); }

  function chainCard(c) {
    var card = el("div", "sc-card tier-" + c.tier);
    if (c.weakHit) card.className += " weak-hit";
    else if (c.resisted) card.className += " resisted";

    var head = el("div", "sc-head");
    head.appendChild(orb(c.chain, false));
    var title = el("div", "sc-title");
    var name = el("div", "sc-name", Engine.chainLabel(c.chain));
    if (c.weakHit) name.appendChild(el("span", "weak-flag", "weak"));
    title.appendChild(name);
    var meta = el("div", "sc-meta");
    meta.appendChild(el("span", "tier-badge", "Level " + Engine.tierRoman(c.tier)));
    var chips = el("span", "elem-chips");
    var hot = {};
    (c.weakElements || []).forEach(function (e) { hot[e] = true; });
    c.elements.forEach(function (e) {
      chips.appendChild(el("span", "elem-chip" + (hot[e] ? " hot" : ""), e));
    });
    meta.appendChild(chips);
    title.appendChild(meta);
    head.appendChild(title);
    card.appendChild(head);

    var pairs = el("div", "pairs");
    c.pairs.forEach(function (p) { pairs.appendChild(pairRow(p)); });
    card.appendChild(pairs);
    return card;
  }

  function pairRow(p) {
    var row = el("div", "pair");
    row.appendChild(wsSpan(p.opener, p.openerSource, p.openProp));
    row.appendChild(el("span", "arrow", "→"));
    row.appendChild(wsSpan(p.closer, p.closerSource, p.closeProp));
    if (p.status === "confirmed") {
      var t = el("span", "confirm-tick", "✓");
      t.title = "Confirmed on Horizon";
      row.appendChild(t);
    }
    return row;
  }

  function wsSpan(name, source, prop) {
    var s = el("span", "ws");
    s.appendChild(orb(prop, true));
    s.appendChild(el("span", "ws-name", name));
    s.appendChild(el("span", "ws-src", source));
    return s;
  }

  function init() {
    selA = document.getElementById("selA");
    selB = document.getElementById("selB");
    resultsEl = document.getElementById("results");
    selEnemy = document.getElementById("selEnemy");
    enemyClear = document.getElementById("enemyClear");
    enemyBar = document.getElementById("enemyBar");

    Engine.load("data/").then(function () {
      buildSelect(selA);
      buildSelect(selB);
      buildMobList();
      selA.addEventListener("change", render);
      selB.addEventListener("change", render);
      // Re-render on enemy change; reset the weak-only default whenever the enemy changes.
      selEnemy.addEventListener("input", function () { showAllChains = false; render(); });
      enemyClear.addEventListener("click", function () {
        selEnemy.value = ""; showAllChains = false; render(); selEnemy.focus();
      });
      render();
    }).catch(function (err) {
      resultsEl.appendChild(emptyState("Couldn’t load data: " + err.message +
        ". If viewing locally, serve the folder (e.g. python3 -m http.server)."));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
