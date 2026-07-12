/*
 * Horizon Skillchains — engine
 * Pure data-lookup logic. No DOM. Loaded as a plain script; exposes window.Engine.
 *
 * Model:
 *  - A combatant has an "arsenal": a list of weapon skills, each with an ordered
 *    list of property tokens (tier-1 property names OR tier-2 skillchain names).
 *  - A skillchain forms when an OPENER weapon skill has property pA and a CLOSER
 *    weapon skill has property pB, and (pA -> pB) is in the combination table.
 *  - Overrides (data/overrides.json) are layered on at load time.
 */
(function () {
  "use strict";

  var state = {
    skillchains: null, // data/skillchains.json
    weapons: null,     // data/weapons.json
    summons: null,     // data/summons.json
    overrides: null,   // data/overrides.json
    mobs: null,        // data/mobs.json
    comboMap: null,    // "open|close" -> chainName
    elementColor: null,// element -> hex
    elements: null     // the 8 element tokens
  };

  function key(open, close) { return open + "|" + close; }

  // Build element->color from the tier-1 properties (each property carries element + color).
  function buildElementColors(skillchains) {
    var map = {};
    Object.keys(skillchains.properties).forEach(function (p) {
      var prop = skillchains.properties[p];
      map[prop.element] = prop.color;
    });
    return map;
  }

  // Expand a mob's weak/strong list to a lookup of element->true.
  // "all" (rainbow orb) expands to every element; result carries a .__all marker.
  function expandElems(list) {
    var out = {};
    (list || []).forEach(function (e) {
      if (e === "all") {
        out.__all = true;
        state.elements.forEach(function (el) { out[el] = true; });
      } else {
        out[e] = true;
      }
    });
    return out;
  }

  // Build the combo lookup, then apply comboOverrides.
  function buildComboMap(skillchains, overrides) {
    var map = {};
    skillchains.combos.forEach(function (c) { map[key(c.open, c.close)] = c.chain; });
    (overrides.comboOverrides || []).forEach(function (o) {
      if (o.chain === null) { delete map[key(o.open, o.close)]; }
      else { map[key(o.open, o.close)] = o.chain; }
    });
    return map;
  }

  // Apply weaponSkillProperties overrides in place onto an arsenal list.
  function applyWSOverrides(skills, wsOverrides) {
    return skills.map(function (ws) {
      if (wsOverrides && Object.prototype.hasOwnProperty.call(wsOverrides, ws.name)) {
        return { name: ws.name, properties: wsOverrides[ws.name].slice() };
      }
      return { name: ws.name, properties: (ws.properties || []).slice() };
    });
  }

  // Load all data files. Returns a promise.
  function load(basePath) {
    basePath = basePath || "data/";
    var files = ["skillchains", "weapons", "summons", "overrides", "mobs"];
    return Promise.all(files.map(function (f) {
      return fetch(basePath + f + ".json").then(function (r) {
        if (!r.ok) throw new Error("Failed to load " + f + ".json (" + r.status + ")");
        return r.json();
      });
    })).then(function (res) {
      state.skillchains = res[0];
      state.weapons = res[1];
      state.summons = res[2];
      state.overrides = res[3];
      state.mobs = res[4];
      state.elementColor = buildElementColors(state.skillchains);
      state.elements = Object.keys(state.skillchains.properties).map(function (p) {
        return state.skillchains.properties[p].element;
      });
      state.comboMap = buildComboMap(state.skillchains, state.overrides);
      return state;
    });
  }

  // A "source" is a weapon type or an avatar. Returns { id, kind, label, skills }.
  function listSources() {
    var out = [];
    var w = state.weapons.weapons;
    Object.keys(w).forEach(function (id) {
      out.push({ id: "weapon:" + id, kind: "weapon", label: w[id].label, skills: w[id].skills });
    });
    var a = state.summons.avatars;
    Object.keys(a).forEach(function (id) {
      out.push({ id: "avatar:" + id, kind: "avatar", label: a[id].label, skills: a[id].skills });
    });
    return out;
  }

  function getSource(id) {
    return listSources().filter(function (s) { return s.id === id; })[0] || null;
  }

  // Look up a pairConfirmation for opener a + closer b (by WS name).
  function findConfirmation(aName, bName) {
    var list = (state.overrides.pairConfirmations || []);
    for (var i = 0; i < list.length; i++) {
      if (list[i].a === aName && list[i].b === bName) return list[i];
    }
    return null;
  }

  // Core: given two source ids, return every skillchain the two arsenals can form.
  // Result: array of chain groups, sorted by tier desc, each with the WS pairs that make it.
  function findSkillchains(idA, idB) {
    var A = getSource(idA), B = getSource(idB);
    if (!A || !B) return [];
    var wsOv = state.overrides.weaponSkillProperties;
    var skillsA = applyWSOverrides(A.skills, wsOv);
    var skillsB = applyWSOverrides(B.skills, wsOv);

    var groups = {}; // chainName -> { chain, tier, elements, pairs: [] }

    function tryPair(opener, closer, openerSrc, closerSrc) {
      var seenForThisPair = {}; // avoid dupe chain per WS-pair (multi-property WS)
      opener.properties.forEach(function (pA) {
        closer.properties.forEach(function (pB) {
          var chain = state.comboMap[key(pA, pB)];
          if (!chain) return;
          if (seenForThisPair[chain]) return;
          seenForThisPair[chain] = true;

          var conf = findConfirmation(opener.name, closer.name);
          if (conf && conf.status === "fizzles") return; // confirmed no-chain in-game
          var resultChain = (conf && conf.status === "different" && conf.result) ? conf.result : chain;

          var def = state.skillchains.skillchains[resultChain];
          if (!def) return;
          if (!groups[resultChain]) {
            groups[resultChain] = {
              chain: resultChain, tier: def.tier, elements: def.elements.slice(), pairs: []
            };
          }
          groups[resultChain].pairs.push({
            opener: opener.name, openerSource: openerSrc.label, openProp: pA,
            closer: closer.name, closerSource: closerSrc.label, closeProp: pB,
            status: conf ? conf.status : null
          });
        });
      });
    }

    // Both role assignments: A opens / B closes, and B opens / A closes.
    skillsA.forEach(function (wa) {
      skillsB.forEach(function (wb) {
        tryPair(wa, wb, A, B);
        tryPair(wb, wa, B, A);
      });
    });

    var arr = Object.keys(groups).map(function (k) { return groups[k]; });
    arr.sort(function (x, y) {
      if (y.tier !== x.tier) return y.tier - x.tier;       // higher tier first
      return x.chain.localeCompare(y.chain);
    });
    return arr;
  }

  // ----- enemy weakness (v2) -----

  // Families the v2 picker offers: those with >=1 weak/strong ELEMENT (weapon-only
  // families like Rafflesia are retained in the data for v3 but not listed here).
  function listMobs() {
    var m = state.mobs.mobs;
    return Object.keys(m).filter(function (name) {
      var v = m[name];
      return (v.weak && v.weak.length) || (v.strong && v.strong.length);
    }).sort(function (a, b) { return a.localeCompare(b); }).map(function (name) {
      var v = m[name];
      return { name: name, weak: v.weak || [], strong: v.strong || [], retail: v.retail || null };
    });
  }

  function getMob(name) {
    var v = state.mobs.mobs[name];
    if (!v) return null;
    return { name: name, weak: v.weak || [], strong: v.strong || [], retail: v.retail || null };
  }

  // Tag each chain against a mob. weakHit = chain.elements intersects mob.weak
  // (the magic-burst window is the whole skillchain's element set). resisted =
  // every element of the chain is resisted. Returns a summary object; does not mutate input.
  function tagAgainstMob(chains, mobName) {
    var mob = getMob(mobName);
    if (!mob) return { mob: null, chains: chains, weakCount: chains.length, hasWeak: false, weakAll: false, strongAll: false };

    var weakSet = expandElems(mob.weak);
    var strongSet = expandElems(mob.strong);
    var weakCount = 0;

    var tagged = chains.map(function (c) {
      var matched = c.elements.filter(function (e) { return weakSet[e]; });
      var resisted = c.elements.length > 0 && c.elements.every(function (e) { return strongSet[e]; });
      var weakHit = matched.length > 0;
      if (weakHit) weakCount++;
      var out = {};
      Object.keys(c).forEach(function (k) { out[k] = c[k]; });
      out.weakHit = weakHit;
      out.weakElements = matched;
      out.resisted = resisted && !weakHit;
      return out;
    });

    return {
      mob: mob,
      chains: tagged,
      weakCount: weakCount,
      hasWeak: mob.weak.length > 0,
      weakAll: !!weakSet.__all,
      strongAll: !!strongSet.__all
    };
  }

  function elementColorOf(e) { return (state.elementColor && state.elementColor[e]) || "#999"; }

  // ----- display helpers -----

  // Colors for rendering a property token's orb (1 color for tier-1, 2 for tier-2/3).
  function orbColors(token) {
    var p = state.skillchains.properties[token];
    if (p) return [p.color];
    var sc = state.skillchains.skillchains[token];
    if (sc) return sc.elements.map(function (e) { return state.elementColor[e]; });
    return ["#999"];
  }

  function chainLabel(token) {
    var sc = state.skillchains.skillchains[token];
    if (sc && sc.label) return sc.label;
    return token.charAt(0).toUpperCase() + token.slice(1);
  }
  function propLabel(token) {
    var p = state.skillchains.properties[token];
    if (p && p.label) return p.label;
    return chainLabel(token);
  }
  function tierRoman(t) { return t === 3 ? "III" : t === 2 ? "II" : "I"; }

  window.Engine = {
    load: load,
    listSources: listSources,
    getSource: getSource,
    findSkillchains: findSkillchains,
    listMobs: listMobs,
    getMob: getMob,
    tagAgainstMob: tagAgainstMob,
    elementColorOf: elementColorOf,
    orbColors: orbColors,
    chainLabel: chainLabel,
    propLabel: propLabel,
    tierRoman: tierRoman,
    _state: state
  };
})();
