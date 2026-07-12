/* Horizon Skillchains — UI wiring */
(function () {
  "use strict";

  var selA, selB, resultsEl;

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

  function render() {
    var a = selA.value, b = selB.value;
    resultsEl.innerHTML = "";

    if (!a || !b) {
      resultsEl.appendChild(emptyState("Pick two combatants to see the skillchains they can make."));
      return;
    }

    var chains = Engine.findSkillchains(a, b);
    if (!chains.length) {
      resultsEl.appendChild(emptyState("No skillchains — these two can’t chain together."));
      return;
    }

    var count = chains.reduce(function (n, c) { return n + c.pairs.length; }, 0);
    resultsEl.appendChild(el("p", "count-line",
      chains.length + " skillchain" + (chains.length > 1 ? "s" : "") +
      " · " + count + " way" + (count > 1 ? "s" : "")));

    chains.forEach(function (c) { resultsEl.appendChild(chainCard(c)); });
  }

  function emptyState(msg) { return el("div", "empty", msg); }

  function chainCard(c) {
    var card = el("div", "sc-card tier-" + c.tier);

    var head = el("div", "sc-head");
    head.appendChild(orb(c.chain, false));
    var title = el("div", "sc-title");
    title.appendChild(el("div", "sc-name", Engine.chainLabel(c.chain)));
    var meta = el("div", "sc-meta");
    meta.appendChild(el("span", "tier-badge", "Level " + Engine.tierRoman(c.tier)));
    var chips = el("span", "elem-chips");
    c.elements.forEach(function (e) { chips.appendChild(el("span", "elem-chip", e)); });
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

    Engine.load("data/").then(function () {
      buildSelect(selA);
      buildSelect(selB);
      selA.addEventListener("change", render);
      selB.addEventListener("change", render);
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
