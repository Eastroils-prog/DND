/* =========================================================
   WORLD KEEPER — NPCs, Locations, Family Tree, Backup
   Everything is saved in your browser (localStorage).
   ========================================================= */
(function () {
  const STORE_KEY = 'dnd-world-v1';
  const RACES = ['Human', 'Elf', 'Half-Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Orc', 'Orc', 'Tiefling', 'Dragonborn', 'Goblin', 'Aasimar'];
  const ALIGNMENTS = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil', 'Unknown'];
  const STATUSES = ['Alive', 'Dead', 'Missing', 'Unknown'];
  const LOC_TYPES = ['City', 'Town', 'Village', 'Tavern / Inn', 'Castle / Keep', 'Temple', 'Shop', 'Dungeon', 'Wilderness', 'Other'];
  // Relationship types. Left = what the OTHER person is to this NPC. Right = the opposite direction.
  const BONDS = {
    'Friend': 'Friend', 'Best friend': 'Best friend', 'Rival': 'Rival', 'Enemy': 'Enemy', 'Lover': 'Lover', 'Ally': 'Ally',
    'Business partner': 'Business partner', 'Employer': 'Employee', 'Employee': 'Employer', 'Mentor': 'Student', 'Student': 'Mentor',
    'Owes money to them': 'Is owed money by them', 'Is owed money by them': 'Owes money to them', 'Secretly hates': 'Is secretly hated by',
    'Is secretly hated by': 'Secretly hates', 'Betrothed': 'Betrothed',
  };
  const BAD_BONDS = ['Rival', 'Enemy', 'Secretly hates', 'Is secretly hated by'];
  const FACTION_TYPES = ['Guild', 'Noble house', 'Cult', 'Army / military', 'Thieves guild', 'Church / temple', 'Merchant company', 'Secret society', 'Adventuring party', 'Other'];
  const PRICE_LEVELS = [[0.75, 'Very cheap'], [0.9, 'Cheap'], [1, 'Normal'], [1.15, 'Pricey'], [1.3, 'Expensive'], [1.6, 'Very expensive']];
  const EXPOSURE = [[1.7, 'Front line ⚔️'], [1.3, 'Near the war'], [1, 'Normal'], [0.6, 'Far from the war'], [0.2, 'Untouched by the war']];
  const labelOf = (list, v) => (list.find(([x]) => x === Number(v)) || [v, 'Normal'])[1];
  const numOpts = (list, cur) => list.map(([v, l]) => `<option value="${v}" ${Number(cur) === v ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const safeImg = s => (typeof s === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s)) ? s : '';

  // ---------- helpers ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const addUnique = (arr, v) => { if (!arr.includes(v)) arr.push(v); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  // SECURITY: every piece of text you type goes through esc() before it is shown,
  // so names like <script> can't run code in the page.
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const opts = (list, cur) => list.map(v => `<option ${v === cur ? 'selected' : ''}>${esc(v)}</option>`).join('');

  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  window.toast = toast;

  // ---------- data ----------
  // ---------- your world: Frindeval (data lives in world-data.js) ----------
  function buildFrindeval() {
    if (!window.FRINDEVAL) return { version: 3, frindeval: WORLD_VERSION, locations: [], factions: [], npcs: [], maps: [], roads: [], monsters: [], sim: { day: 0, log: [] } };
    const W = JSON.parse(JSON.stringify(window.FRINDEVAL)); // copy, so the original data stays untouched
    if (window.FRINDEVAL_GENERATE) window.FRINDEVAL_GENERATE(W, 10); // fill every place up to 10 people
    if (window.FRINDEVAL_ANCESTORS) window.FRINDEVAL_ANCESTORS(W);   // parents & grandparents for all, 5 generations for nobles
    const world = { version: 3, frindeval: WORLD_VERSION, locations: [], factions: [], npcs: [], maps: [], roads: [], monsters: [], sim: { day: 0, log: [] } };
    const id = {};
    world.maps = W.maps.map(m => ({ id: m.id, name: m.name, src: m.src, hidden: !!m.hidden, pins: {} }));
    world.locations = W.locations.map(l => {
      const L = { id: (id['L:' + l.key] = uid()), name: l.name, type: l.type, region: l.region, notes: l.notes || '',
        priceMod: l.priceMod || 1, warExposure: l.warExposure || 1, hidden: !!l.hidden };
      for (const [mid, xy] of Object.entries(l.pins || {})) { const m = world.maps.find(x => x.id === mid); if (m) m.pins[L.id] = xy; }
      return L;
    });
    world.factions = W.factions.map(f => ({ id: (id['F:' + f.key] = uid()), name: f.name, type: f.type, color: f.color,
      hqId: id['L:' + f.hq] || null, goals: f.goals || '', notes: f.notes || '', public: !!f.public }));
    W.npcs.forEach(n => { id['N:' + n.key] = uid(); });
    world.npcs = W.npcs.map(n => ({
      id: id['N:' + n.key], name: n.name, race: n.race || '', gender: n.gender || '', age: n.age || '', occupation: n.occupation || '',
      alignment: n.alignment || 'True Neutral', status: n.status || 'Alive', description: n.description || '', notes: n.notes || '',
      locationId: id['L:' + n.loc] || null, known: !!n.known, portrait: '',
      parents: (n.parents || []).map(k => id['N:' + k]).filter(Boolean), spouses: [], siblings: [], bonds: [],
      factions: (n.factions || []).map(([k, rank]) => ({ id: id['F:' + k], rank })).filter(f => f.id),
      ...(n.generated ? { generated: true } : {}), ...(n.ancestor ? { ancestor: true } : {}),
    }));
    world.roads = (W.roads || []).map(([a, b, d]) => [id['L:' + a], id['L:' + b], d]).filter(r => r[0] && r[1]);
    // travellers: some start at home, some already on the road
    for (const [k, mv] of Object.entries(W.movers || {})) {
      const n = world.npcs.find(x => x.id === id['N:' + k]);
      const route = mv.route.map(x => id['L:' + x]).filter(Boolean);
      if (!n || route.length < 2) continue;
      if (n.locationId !== route[0]) route.unshift(n.locationId); // always start from home
      n.travel = { kind: mv.kind, route: [...new Set(route)], stop: 0, stay: 1 + Math.floor(Math.random() * 3), road: null };
      if (Math.random() < 0.3) {
        const total = 1 + Math.floor(Math.random() * 3);
        n.travel.road = { from: route[0], to: n.travel.route[1], left: 1 + Math.floor(Math.random() * total), total };
        n.travel.stop = 1; n.locationId = null;
      }
    }
    const byKey = k => world.npcs.find(x => x.id === id['N:' + k]);
    W.npcs.forEach(n => {
      if (!n.spouse) return;
      const a = byKey(n.key), b = byKey(n.spouse);
      if (a && b) { addUnique(a.spouses, b.id); addUnique(b.spouses, a.id); }
    });
    W.bonds.forEach(([ak, type, bk, note]) => {
      const a = byKey(ak), b = byKey(bk);
      if (!a || !b || !BONDS[type]) return;
      a.bonds.push({ id: b.id, type, note: note || '' }); b.bonds.push({ id: a.id, type: BONDS[type], note: note || '' });
    });
    return world;
  }
  const sampleWorld = buildFrindeval;

  // One-time upgrades of your saved world:
  //  v1: remove the old example world (Oakvale & the Ironfoots)  ·  v2: Frindeval lore, the Sultanate, villagers, travellers.
  // Everything YOU made or changed is kept: things are only ADDED when a place/person with that name doesn't exist yet.
  const OLD_EXAMPLE = {
    locations: ['Oakvale', 'The Prancing Griffin', 'Stonewatch Keep', 'Saltmere'],
    npcs: ['Old Durgan Ironfoot', 'Brom Ironfoot', 'Hilda Ironfoot', 'Torin Ironfoot', 'Mara Ironfoot', 'Elsa Brightwater', 'Lord Aldric Vex'],
    factions: ['The Iron Brotherhood', "The Queen's Eyes", 'Saltmere Trading Company'],
  };
  const WORLD_VERSION = 3;
  let migratedToFrindeval = false;
  function removeOldExample(s) {
    const oldL = new Set(s.locations.filter(l => OLD_EXAMPLE.locations.includes(l.name)).map(l => l.id));
    const oldN = new Set(s.npcs.filter(n => OLD_EXAMPLE.npcs.includes(n.name)).map(n => n.id));
    const oldF = new Set(s.factions.filter(f => OLD_EXAMPLE.factions.includes(f.name)).map(f => f.id));
    s.locations = s.locations.filter(l => !oldL.has(l.id));
    s.factions = s.factions.filter(f => !oldF.has(f.id));
    s.npcs = s.npcs.filter(n => !oldN.has(n.id));
    s.npcs.forEach(n => {
      if (oldL.has(n.locationId)) n.locationId = null;
      ['parents', 'spouses', 'siblings'].forEach(k => { n[k] = n[k].filter(x => !oldN.has(x)); });
      n.bonds = n.bonds.filter(b => !oldN.has(b.id));
      n.factions = n.factions.filter(f => !oldF.has(f.id));
    });
  }
  function mergeWorld(s, F) {
    const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
    const lmap = {}, fmap = {}, nmap = {};
    F.locations.forEach(l => {
      const mine = s.locations.find(x => same(x.name, l.name));
      if (!mine) { s.locations.push(l); lmap[l.id] = l.id; return; }
      lmap[l.id] = mine.id;
      if (!mine.notes || /Not described yet/.test(mine.notes)) Object.assign(mine, { notes: l.notes, region: l.region, type: mine.type || l.type, priceMod: l.priceMod, warExposure: l.warExposure });
      else if (/^The Dunes$/.test(mine.region || '')) mine.region = l.region;
    });
    F.factions.forEach(f => {
      const mine = s.factions.find(x => same(x.name, f.name));
      if (mine) { fmap[f.id] = mine.id; return; }
      f.hqId = lmap[f.hqId] || null; s.factions.push(f); fmap[f.id] = f.id;
    });
    const remapTravel = t => t && ({ ...t, route: t.route.map(id => lmap[id]).filter(Boolean),
      road: t.road ? { ...t.road, from: lmap[t.road.from], to: lmap[t.road.to] } : null });
    const added = [], matched = [];
    F.npcs.forEach(n => {
      const mine = s.npcs.find(x => same(x.name, n.name));
      if (mine) { nmap[n.id] = mine.id; matched.push([mine, n]); if (!mine.travel && n.travel) { mine.travel = remapTravel(n.travel); if (mine.travel.road) mine.travel.road = null; } return; }
      nmap[n.id] = n.id; added.push(n);
    });
    const addedIds = new Set(added.map(n => n.id));
    // people you already had get their new ancestors (only if they had no parents yet)
    matched.forEach(([mine, n]) => { if (!mine.parents.length && n.parents.length) mine.parents = n.parents.map(x => nmap[x]).filter(Boolean); });
    added.forEach(n => {
      n.locationId = lmap[n.locationId] || null;
      ['parents', 'spouses', 'siblings'].forEach(k => { n[k] = n[k].map(x => nmap[x]).filter(Boolean); });
      n.bonds = n.bonds.map(b => ({ ...b, id: nmap[b.id] })).filter(b => b.id);
      n.factions = n.factions.map(f => ({ ...f, id: fmap[f.id] })).filter(f => f.id);
      if (n.travel) n.travel = remapTravel(n.travel);
      s.npcs.push(n);
    });
    // links from new people to people you already had: add the other half (e.g. "Kamal is Halvar's ally")
    added.forEach(n => {
      n.spouses.forEach(x => { const o = s.npcs.find(p => p.id === x); if (o && !addedIds.has(o.id) && !o.spouses.includes(n.id)) o.spouses.push(n.id); });
      n.bonds.forEach(b => { const o = s.npcs.find(p => p.id === b.id); if (o && !addedIds.has(o.id) && !o.bonds.some(x => x.id === n.id)) o.bonds.push({ id: n.id, type: BONDS[b.type], note: b.note }); });
    });
    s.maps = s.maps || [];
    F.maps.forEach(fm => {
      let mine = s.maps.find(m => m.id === fm.id);
      if (!mine) { mine = { ...fm, pins: {} }; s.maps.push(mine); }
      for (const [lid, xy] of Object.entries(fm.pins)) { const t = lmap[lid]; if (t && !mine.pins[t]) mine.pins[t] = xy; }
    });
    s.roads = Array.isArray(s.roads) ? s.roads : [];
    F.roads.forEach(([a, b, d]) => {
      const A = lmap[a], B = lmap[b];
      if (A && B && !s.roads.some(r => (r[0] === A && r[1] === B) || (r[0] === B && r[1] === A))) s.roads.push([A, B, d]);
    });
    s.frindeval = WORLD_VERSION; s.version = 3;
    migratedToFrindeval = true;
  }

  const safeMapSrc = s => (typeof s === 'string' && /^maps\/[\w.-]+\.(jpg|jpeg|png|webp)$/.test(s)) ? s : safeImg(s);
  function normalize(s) {
    if (!s || typeof s !== 'object') return sampleWorld();
    s.locations = (Array.isArray(s.locations) ? s.locations : []).filter(l => l && l.id).map(l => ({
      priceMod: 1, warExposure: 1, ...l,
    }));
    s.factions = (Array.isArray(s.factions) ? s.factions : []).filter(f => f && f.id).map(f => ({ color: '#c98a3d', goals: '', notes: '', hqId: null, ...f }));
    s.npcs = (Array.isArray(s.npcs) ? s.npcs : []).filter(n => n && n.id).map(n => ({
      parents: [], spouses: [], siblings: [], bonds: [], factions: [], ...n,
    }));
    s.npcs.forEach(n => {
      n.portrait = safeImg(n.portrait);
      n.bonds = n.bonds.filter(b => b && BONDS[b.type]);
      n.factions = n.factions.filter(f => f && f.id);
    });
    s.factions.forEach(f => { if (!/^#[0-9a-fA-F]{6}$/.test(f.color)) f.color = '#c98a3d'; f.public = f.public === true; });
    s.npcs.forEach(n => { n.known = n.known === true; });
    s.locations.forEach(l => { l.hidden = l.hidden === true; });
    s.maps = (Array.isArray(s.maps) ? s.maps : []).filter(m => m && m.id && safeMapSrc(m.src)).map(m => {
      const pins = {};
      for (const [lid, xy] of Object.entries(m.pins || {})) {
        if (Array.isArray(xy) && xy.length === 2 && xy.every(v => Number.isFinite(v) && v >= 0 && v <= 100)) pins[lid] = xy;
      }
      return { id: String(m.id), name: String(m.name || 'Map'), src: safeMapSrc(m.src), hidden: m.hidden === true, pins };
    });
    s.monsters = (Array.isArray(s.monsters) ? s.monsters : []).filter(m => m && m.id && m.name).map(m => ({ ...m, custom: true }));
    s.roads = (Array.isArray(s.roads) ? s.roads : []).filter(r => Array.isArray(r) && r.length === 3 && r[2] > 0);
    s.sim = s.sim && typeof s.sim === 'object' ? { day: Number(s.sim.day) || 0, log: Array.isArray(s.sim.log) ? s.sim.log.slice(0, 150) : [] } : { day: 0, log: [] };
    s.npcs.forEach(n => {
      const t = n.travel;
      if (!t || !Array.isArray(t.route) || t.route.length < 2) { delete n.travel; return; }
      if (t.road && !(t.road.from && t.road.to && t.road.left >= 0)) t.road = null;
    });
    if ((s.frindeval || 0) < WORLD_VERSION) { removeOldExample(s); mergeWorld(s, buildFrindeval()); }
    return s;
  }
  function load() {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* ignore */ }
    return sampleWorld();
  }
  function saveLocal() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast('⚠️ Could not save (browser storage full or blocked)'); }
  }
  // every change: save in this browser, then tell the cloud (if you're logged in it uploads a moment later)
  function save() { saveLocal(); if (window.Cloud) window.Cloud.changed(); }
  let state = load(); saveLocal();
  if (migratedToFrindeval) {
    migratedToFrindeval = false;
    if (window.Cloud) window.Cloud.changed(); // upload the new world next time you're logged in
    setTimeout(() => toast('🗺 Welcome to Frindeval! The old example towns were replaced with your world.'), 400);
  }

  const npc = id => state.npcs.find(n => n.id === id);
  const loc = id => state.locations.find(l => l.id === id);
  const byName = (a, b) => a.name.localeCompare(b.name);
  const childrenOf = id => state.npcs.filter(n => n.parents.includes(id));
  function siblingsOf(id) {
    const me = npc(id); if (!me) return [];
    const set = new Set(me.siblings);
    state.npcs.forEach(n => { if (n.id !== id && n.parents.some(p => me.parents.includes(p))) set.add(n.id); });
    set.delete(id);
    return [...set].map(npc).filter(Boolean);
  }
  function isDescendant(ofId, maybeId, seen = new Set()) {
    for (const c of childrenOf(ofId)) {
      if (c.id === maybeId) return true;
      if (!seen.has(c.id)) { seen.add(c.id); if (isDescendant(c.id, maybeId, seen)) return true; }
    }
    return false;
  }
  const remove = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); };

  function addRelation(aId, type, bId) {
    const a = npc(aId), b = npc(bId);
    if (!a || !b) return 'Pick someone first.';
    if (aId === bId) return "An NPC can't be related to themselves!";
    if (type === 'parent') {
      if (isDescendant(aId, bId)) return `${b.name} is already a descendant of ${a.name} — that would loop the family tree.`;
      addUnique(a.parents, bId);
    } else if (type === 'child') {
      if (isDescendant(bId, aId)) return `${a.name} is already a descendant of ${b.name} — that would loop the family tree.`;
      addUnique(b.parents, aId);
    } else if (type === 'spouse') { addUnique(a.spouses, bId); addUnique(b.spouses, aId); }
    else if (type === 'sibling') { addUnique(a.siblings, bId); addUnique(b.siblings, aId); }
    save(); return null;
  }
  function removeRelation(aId, type, bId) {
    const a = npc(aId), b = npc(bId); if (!a || !b) return;
    if (type === 'parent') remove(a.parents, bId);
    if (type === 'child') remove(b.parents, aId);
    if (type === 'spouse') { remove(a.spouses, bId); remove(b.spouses, aId); }
    if (type === 'sibling') {
      remove(a.siblings, bId); remove(b.siblings, aId);
      // siblings that come from sharing a parent can only be removed by removing the parent link
      if (a.parents.some(p => b.parents.includes(p))) toast('They still share a parent, so they stay siblings. Remove the parent link to change that.');
    }
    save();
  }
  function deleteNpc(id) {
    state.npcs = state.npcs.filter(n => n.id !== id);
    state.npcs.forEach(n => { remove(n.parents, id); remove(n.spouses, id); remove(n.siblings, id); n.bonds = n.bonds.filter(b => b.id !== id); });
    save();
  }
  const faction = id => state.factions.find(f => f.id === id);
  function addBond(aId, type, bId, note) {
    const a = npc(aId), b = npc(bId);
    if (!a || !b) return 'Pick someone first.';
    if (aId === bId) return "An NPC can't have a relationship with themselves!";
    if (!BONDS[type]) return 'Unknown relationship type.';
    a.bonds = a.bonds.filter(x => !(x.id === bId && x.type === type));
    b.bonds = b.bonds.filter(x => !(x.id === aId && x.type === BONDS[type]));
    a.bonds.push({ id: bId, type, note }); b.bonds.push({ id: aId, type: BONDS[type], note });
    save(); return null;
  }
  function removeBond(aId, type, bId) {
    const a = npc(aId), b = npc(bId);
    if (a) a.bonds = a.bonds.filter(x => !(x.id === bId && x.type === type));
    if (b) b.bonds = b.bonds.filter(x => !(x.id === aId && x.type === BONDS[type]));
    save();
  }
  const membersOf = fid => state.npcs.filter(n => n.factions.some(f => f.id === fid));
  const rankIn = (n, fid) => (n.factions.find(f => f.id === fid) || {}).rank || '';
  function joinFaction(nId, fId, rank) {
    const n = npc(nId); if (!n || !faction(fId)) return 'Pick a faction first.';
    n.factions = n.factions.filter(f => f.id !== fId); n.factions.push({ id: fId, rank: rank || 'Member' });
    save(); return null;
  }
  function leaveFaction(nId, fId) { const n = npc(nId); if (n) { n.factions = n.factions.filter(f => f.id !== fId); save(); } }

  // ---------- portraits: shrink the picture so it fits in browser storage ----------
  function readPortrait(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('not an image'));
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
        const side = Math.min(img.width, img.height); // crop to a square from the middle
        c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2.6, side, side, 0, 0, S, S);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }
  const avatar = (n, size = 36) => n.portrait
    ? `<img class="avatar" src="${esc(n.portrait)}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="avatar ph" style="width:${size}px;height:${size}px;font-size:${size * 0.45}px">${esc((n.name || '?').trim()[0] || '?')}</span>`;

  // ---------- printable NPC cards ----------
  function printNpcs(list, withSecrets) {
    if (!list.length) return toast('Nobody to print.');
    let area = $('#printArea');
    if (!area) { area = document.createElement('div'); area.id = 'printArea'; document.body.appendChild(area); }
    area.innerHTML = list.map(n => {
      const l = loc(n.locationId);
      const fam = [
        ['Parents', n.parents.map(npc).filter(Boolean)], ['Spouse', n.spouses.map(npc).filter(Boolean)],
        ['Siblings', siblingsOf(n.id)], ['Children', childrenOf(n.id)],
      ].filter(([, p]) => p.length).map(([k, p]) => `<div><b>${k}:</b> ${p.map(x => esc(x.name)).join(', ')}</div>`).join('');
      const bonds = n.bonds.filter(b => npc(b.id) && (withSecrets || !b.type.startsWith('Secretly') && !b.type.startsWith('Is secretly')))
        .map(b => `<div><b>${esc(b.type)}:</b> ${esc(npc(b.id).name)}${b.note ? ' — ' + esc(b.note) : ''}</div>`).join('');
      const facs = n.factions.filter(f => faction(f.id)).map(f => `${esc(faction(f.id).name)} (${esc(f.rank)})`).join(', ');
      return `<div class="pcard">
        <div class="pcard-head">${avatar(n, 72)}<div><h2>${esc(n.name)}</h2>
          <div>${[n.race, n.gender, n.age && 'Age ' + n.age, n.occupation].filter(Boolean).map(esc).join(' · ')}</div>
          ${withSecrets ? `<div>${esc(n.alignment)} · ${esc(n.status)}</div>` : ''}
          ${l ? `<div>📍 ${esc(l.name)}</div>` : ''}</div></div>
        ${n.description ? `<p class="prewrap">${esc(n.description)}</p>` : ''}
        ${facs ? `<div><b>Factions:</b> ${facs}</div>` : ''}
        ${fam}${bonds}
        ${withSecrets && n.notes ? `<div class="psecret prewrap"><b>🤫 DM secrets:</b> ${esc(n.notes)}</div>` : ''}
      </div>`;
    }).join('');
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { window.print(); setTimeout(done, 500); }, 50);
  }

  // ---------- routing (tabs) ----------
  const ui = { who: '', routeDraft: [], npcId: null, editing: false, search: '', locFilter: '', treeId: null, editLocId: null, editFacId: null, facId: null };
  function route() {
    const tab = (location.hash || '#npcs').slice(1).split('/')[0];
    document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    if (tab !== 'market') window.Market.stop();
    const app = $('#app');
    ({ npcs: renderNpcs, locations: renderLocations, factions: renderFactions, maps: renderMaps, bestiary: renderBestiary, tree: renderTree, market: () => window.Market.render(app), settings: renderSettings, cloud: renderSettings }[tab] || renderNpcs)(app);
  }
  // lets the market read your locations (for city prices)
  window.World = { locations: () => state.locations, esc };
  window.addEventListener('hashchange', route);
  function go(tab) { if (location.hash === '#' + tab) route(); else location.hash = tab; }

  // ================= NPCs =================
  function renderNpcs(app) {
    if (ui.npcId && !npc(ui.npcId)) ui.npcId = null;
    app.innerHTML = `
      <div class="split">
        <aside class="panel">
          <div class="row"><h2 style="margin:0">NPCs <span class="muted small">(${state.npcs.length})</span></h2>
            <button class="btn primary" id="newNpc" style="flex:0">+ New NPC</button></div>
          <div class="row" style="margin-top:8px">
            <button class="btn small" id="randNpc" title="Make up a random NPC instantly (no internet needed)">🎲 Random NPC</button>
            <button class="btn small" id="aiNpc" title="Describe an NPC and let the AI write it">🤖 AI NPC</button>
          </div>
          <div class="stack" style="margin-top:12px">
            <input id="npcSearch" placeholder="🔍 Search name, job, race…" value="${esc(ui.search)}">
            <select id="npcWho">${[['', '👥 Everyone (living world)'], ['main', '⭐ Main characters'], ['villagers', '🏡 Villagers'], ['travel', '🐎 Travellers'], ['road', '🛤 On the road now'], ['ancestors', '📜 Ancestors (family trees)'], ['all', '🗂 Absolutely everyone']]
              .map(([v, l]) => `<option value="${v}" ${ui.who === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <select id="npcLoc"><option value="">📍 All locations</option><option value="__none" ${ui.locFilter === '__none' ? 'selected' : ''}>Unknown / wandering</option>
              ${[...state.locations].sort(byName).map(l => `<option value="${l.id}" ${ui.locFilter === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
          </div>
          <ul class="item-list" id="npcList"></ul>
        </aside>
        <section class="panel" id="npcDetail"></section>
      </div>`;
    $('#newNpc').onclick = () => { ui.npcId = null; ui.draft = null; ui.editing = true; renderNpcDetail(); };
    $('#randNpc').onclick = () => { ui.npcId = null; ui.draft = randomNpc(confirm('Give them a family too?\n\nOK = yes, with family\nCancel = just one NPC')); ui.editing = true; renderNpcList(); renderNpcDetail(); };
    $('#aiNpc').onclick = () => { ui.npcId = null; ui.editing = false; ui.draft = null; renderNpcList(); renderAiPanel(); };
    $('#npcSearch').oninput = e => { ui.search = e.target.value; renderNpcList(); };
    $('#npcLoc').onchange = e => { ui.locFilter = e.target.value; renderNpcList(); };
    $('#npcWho').onchange = e => { ui.who = e.target.value; renderNpcList(); };
    renderNpcList(); renderNpcDetail();
  }

  function renderNpcList() {
    const q = ui.search.trim().toLowerCase();
    const list = state.npcs.filter(n =>
      (!q || [n.name, n.occupation, n.race].some(v => (v || '').toLowerCase().includes(q))) &&
      (!ui.locFilter || (ui.locFilter === '__none' ? !loc(n.locationId) : n.locationId === ui.locFilter)) &&
      (ui.who === 'all' || (ui.who === 'ancestors' ? n.ancestor : !n.ancestor && (!ui.who || (ui.who === 'main' ? !n.generated : ui.who === 'villagers' ? n.generated : ui.who === 'travel' ? !!n.travel : !!(n.travel && n.travel.road)))))
    ).sort(byName);
    $('#npcList').innerHTML = list.length ? list.map(n => `
      <li data-id="${n.id}" class="li-flex ${n.id === ui.npcId ? 'sel' : ''}">${avatar(n)}<div>
        <div>${esc(n.name)} ${n.status !== 'Alive' ? `<span class="badge ${n.status === 'Dead' ? 'dead' : 'missing'}">${esc(n.status)}</span>` : ''}</div>
        <div class="sub">${esc([n.race, n.occupation].filter(Boolean).join(' · '))} ${n.travel && n.travel.road && loc(n.travel.road.to) ? '· 🐎 → ' + esc(loc(n.travel.road.to).name) : loc(n.locationId) ? '· 📍 ' + esc(loc(n.locationId).name) : ''}</div>
      </div></li>`).join('') : '<li class="muted" style="cursor:default">No NPCs found.</li>';
    document.querySelectorAll('#npcList li[data-id]').forEach(li => li.onclick = () => {
      ui.npcId = li.dataset.id; ui.editing = false; renderNpcList(); renderNpcDetail();
      if (window.innerWidth < 800) $('#npcDetail').scrollIntoView({ behavior: 'smooth' });
    });
  }

  function renderNpcDetail() {
    const box = $('#npcDetail'); if (!box) return;
    const n = npc(ui.npcId);
    if (ui.editing) return renderNpcForm(box, n);
    if (!n) {
      box.innerHTML = `<div class="empty"><div style="font-size:3rem">🧙</div><p>Pick an NPC from the list, or make a new one.</p>
        <button class="btn primary" id="emptyNew">+ New NPC</button></div>`;
      $('#emptyNew').onclick = () => { ui.editing = true; renderNpcDetail(); };
      return;
    }
    const l = loc(n.locationId);
    const field = (k, v) => v ? `<div class="field-view"><div class="k">${k}</div>${esc(v)}</div>` : '';
    const chipList = (people, type) => people.length ? people.map(p => `
      <span class="chip"><a href="#" data-goto="${p.id}">${esc(p.name)}</a>
      <button class="btn-x" title="Remove link" data-unlink="${type}" data-other="${p.id}">×</button></span>`).join('') : '<span class="muted small">none yet</span>';
    const others = state.npcs.filter(o => o.id !== n.id).sort(byName);
    const bondChips = n.bonds.filter(b => npc(b.id)).map(b => `
      <span class="chip ${BAD_BONDS.includes(b.type) ? 'bad' : ''}"><span class="muted small">${esc(b.type)}:</span>&nbsp;<a href="#" data-goto="${b.id}">${esc(npc(b.id).name)}</a>
      ${b.note ? `<span class="muted small">&nbsp;— ${esc(b.note)}</span>` : ''}
      <button class="btn-x" title="Remove" data-unbond="${esc(b.type)}" data-other="${b.id}">×</button></span>`).join('') || '<span class="muted small">none yet</span>';
    const facChips = n.factions.filter(f => faction(f.id)).map(f => {
      const F = faction(f.id);
      return `<span class="chip" style="border-color:${F.color}"><span class="dot" style="background:${F.color}"></span>
        <a href="#factions" data-fac="${F.id}">${esc(F.name)}</a>&nbsp;<span class="muted small">${esc(f.rank)}</span>
        <button class="btn-x" title="Leave faction" data-leave="${F.id}">×</button></span>`;
    }).join('') || '<span class="muted small">not in any faction</span>';
    box.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <label class="portrait" title="Click to upload a picture">
          ${n.portrait ? `<img src="${esc(n.portrait)}" alt="Portrait of ${esc(n.name)}">` : '<span>📷<br>Add<br>picture</span>'}
          <input type="file" id="portraitFile" accept="image/*" hidden>
        </label>
        <div style="flex:1 1 240px">
          <h2 style="margin-bottom:4px">${esc(n.name)}</h2>
          <div>${[n.race, n.gender, n.age && `Age ${n.age}`, n.occupation, n.alignment].filter(Boolean).map(v => `<span class="badge">${esc(v)}</span>`).join('')}
          <span class="badge ${n.status === 'Dead' ? 'dead' : n.status !== 'Alive' ? 'missing' : ''}">${esc(n.status)}</span></div>
        </div>
        <div class="row" style="flex:0 1 auto">
          <button class="btn" id="editNpc">✏️ Edit</button>
          <button class="btn" id="treeNpc">🌳 Family tree</button>
          <button class="btn danger" id="delNpc">🗑 Delete</button>
        </div>
      </div>
      <div class="row" style="margin-top:8px;justify-content:flex-start">
        <button class="btn small" id="printPlayer" style="flex:0">🖨 Player card</button>
        <button class="btn small" id="printDm" style="flex:0">🖨 DM card (with secrets)</button>
        <button class="btn small" id="toggleKnown" style="flex:0" title="Decide if players can see this NPC in the player view">${n.known ? '👁 Players know them — hide' : '🙈 Hidden from players — show'}</button>
        ${n.portrait ? '<button class="btn small danger" id="rmPortrait" style="flex:0">Remove picture</button>' : ''}
      </div>
      <div class="stack" style="margin-top:14px">
        <div class="field-view"><div class="k">📍 Location</div>${l ? `<a href="#" id="gotoLoc">${esc(l.name)}</a>${state.maps.some(m => m.pins[l.id]) ? ' <button class="btn small" id="npcOnMap" type="button">🗺 On map</button>' : ''} <span class="muted small">${esc(l.type || '')}${l.region ? ' · ' + esc(l.region) : ''}</span>` : '<span class="muted">Unknown / wandering</span>'}</div>
        ${n.description ? `<div class="field-view prewrap"><div class="k">Description</div>${esc(n.description)}</div>` : ''}
        ${n.notes ? `<div class="field-view prewrap secret"><div class="k">🤫 Secret DM notes</div>${esc(n.notes)}</div>` : ''}
        <div>
          <h3>👪 Family</h3>
          <div class="rel-group"><b>Parents</b>${chipList(n.parents.map(npc).filter(Boolean), 'parent')}</div>
          <div class="rel-group"><b>Spouse / partner</b>${chipList(n.spouses.map(npc).filter(Boolean), 'spouse')}</div>
          <div class="rel-group"><b>Siblings</b>${chipList(siblingsOf(n.id), 'sibling')}</div>
          <div class="rel-group"><b>Children</b>${chipList(childrenOf(n.id), 'child')}</div>
          ${others.length ? `
          <div class="row" style="margin-top:10px">
            <select id="relOther" style="flex:2 1 160px"><option value="">Choose an NPC…</option>${others.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select>
            <span class="muted" style="flex:0">is ${esc(n.name.split(' ')[0])}'s</span>
            <select id="relType" style="flex:1 1 120px">
              <option value="parent">parent</option><option value="child">child</option>
              <option value="spouse">spouse / partner</option><option value="sibling">sibling</option></select>
            <button class="btn primary" id="addRel" style="flex:0">+ Link</button>
          </div>` : '<p class="muted small">Add more NPCs to build a family.</p>'}
        </div>
        <div>
          <h3>🤝 Relationships</h3>
          <div class="rel-group">${bondChips}</div>
          ${others.length ? `
          <div class="row">
            <select id="bondOther" style="flex:2 1 160px"><option value="">Choose an NPC…</option>${others.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select>
            <span class="muted" style="flex:0">is ${esc(n.name.split(' ')[0])}'s</span>
            <select id="bondType" style="flex:1 1 140px">${Object.keys(BONDS).map(t => `<option>${esc(t)}</option>`).join('')}</select>
            <input id="bondNote" maxlength="120" placeholder="note (optional) e.g. owes 50 gp" style="flex:2 1 180px">
            <button class="btn primary" id="addBond" style="flex:0">+ Add</button>
          </div>` : ''}
        </div>
        <div>
          <h3>⚜️ Factions</h3>
          <div class="rel-group">${facChips}</div>
          ${state.factions.length ? `
          <div class="row">
            <select id="facSel" style="flex:2 1 160px"><option value="">Choose a faction…</option>${[...state.factions].sort(byName).map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('')}</select>
            <input id="facRank" maxlength="40" placeholder="rank, e.g. Member" style="flex:1 1 120px">
            <button class="btn primary" id="joinFac" style="flex:0">+ Join</button>
          </div>` : '<p class="muted small">Make factions in the ⚜️ Factions tab.</p>'}
        </div>
        <div>
          <h3>🧭 Travel</h3>
          ${travelHtml(n)}
        </div>
      </div>`;
    wireTravel(n);
    $('#printPlayer').onclick = () => printNpcs([n], false);
    $('#toggleKnown').onclick = () => { n.known = !n.known; save(); toast(n.known ? '👁 Players can now see this NPC (no secrets).' : '🙈 Hidden from the player view.'); renderNpcDetail(); };
    $('#printDm').onclick = () => printNpcs([n], true);
    $('#portraitFile').onchange = async e => {
      try { n.portrait = await readPortrait(e.target.files[0]); save(); toast('📷 Picture added!'); renderNpcList(); renderNpcDetail(); }
      catch (err) { toast("⚠️ That file isn't a picture I can read."); }
    };
    const rp = $('#rmPortrait'); if (rp) rp.onclick = () => { n.portrait = ''; save(); renderNpcList(); renderNpcDetail(); };
    box.querySelectorAll('[data-unbond]').forEach(b => b.onclick = () => { removeBond(n.id, b.dataset.unbond, b.dataset.other); renderNpcDetail(); });
    box.querySelectorAll('[data-leave]').forEach(b => b.onclick = () => { leaveFaction(n.id, b.dataset.leave); renderNpcDetail(); });
    box.querySelectorAll('[data-fac]').forEach(a => a.onclick = e => { e.preventDefault(); ui.facId = a.dataset.fac; go('factions'); });
    const ab = $('#addBond');
    if (ab) ab.onclick = () => {
      const err = addBond(n.id, $('#bondType').value, $('#bondOther').value, $('#bondNote').value.trim());
      if (err) return toast(err);
      toast('Relationship added!'); renderNpcDetail();
    };
    const jf = $('#joinFac');
    if (jf) jf.onclick = () => {
      const err = joinFaction(n.id, $('#facSel').value, $('#facRank').value.trim());
      if (err) return toast(err);
      toast('Joined the faction!'); renderNpcDetail();
    };
    $('#editNpc').onclick = () => { ui.editing = true; renderNpcDetail(); };
    $('#treeNpc').onclick = () => { ui.treeId = n.id; go('tree'); };
    $('#delNpc').onclick = () => {
      if (!confirm(`Delete ${n.name}? Their family links will be removed too.`)) return;
      deleteNpc(n.id); ui.npcId = null; toast(`${n.name} has been removed from the world.`); renderNpcs($('#app'));
    };
    const gl = $('#gotoLoc'); if (gl) gl.onclick = e => { e.preventDefault(); go('locations'); };
    const om = $('#npcOnMap'); if (om) om.onclick = () => showOnMap(l.id);
    box.querySelectorAll('[data-goto]').forEach(a => a.onclick = e => { e.preventDefault(); ui.npcId = a.dataset.goto; renderNpcList(); renderNpcDetail(); });
    box.querySelectorAll('[data-unlink]').forEach(b => b.onclick = () => {
      removeRelation(n.id, b.dataset.unlink, b.dataset.other); renderNpcDetail();
    });
    const add = $('#addRel');
    if (add) add.onclick = () => {
      const err = addRelation(n.id, $('#relType').value, $('#relOther').value);
      if (err) return toast(err);
      toast('Family link added!'); renderNpcDetail();
    };
  }

  function renderNpcForm(box, n) {
    const isNew = !n;
    const draft = isNew ? ui.draft : null;
    n = n || { name: '', race: 'Human', gender: '', age: '', occupation: '', alignment: 'True Neutral', status: 'Alive', locationId: ui.locFilter && ui.locFilter !== '__none' ? ui.locFilter : '', description: '', notes: '', known: false, ...(draft ? draft.fields : {}) };
    const rels = draft ? draft.relatives : [];
    box.innerHTML = `
      <h2>${isNew ? (draft ? `${draft.ai ? '🤖' : '🎲'} Check your new NPC, then save` : '✨ New NPC') : '✏️ Edit ' + esc(n.name)}</h2>
      ${draft ? '<p class="small muted" style="margin-top:-6px">Change anything you like before saving. Not happy? Press the button again for another one.</p>' : ''}
      <form id="npcForm" class="stack" autocomplete="off">
        <div><label>Name *</label><input name="name" required maxlength="80" value="${esc(n.name)}" placeholder="e.g. Gundren Rockseeker"></div>
        <div class="grid2">
          <div><label>Race</label><input name="race" list="raceList" maxlength="40" value="${esc(n.race)}"><datalist id="raceList">${RACES.map(r => `<option value="${r}">`).join('')}</datalist></div>
          <div><label>Gender</label><input name="gender" maxlength="30" value="${esc(n.gender)}"></div>
          <div><label>Age</label><input name="age" maxlength="20" value="${esc(n.age)}"></div>
          <div><label>Occupation / job</label><input name="occupation" maxlength="60" value="${esc(n.occupation)}" placeholder="e.g. Innkeeper"></div>
          <div><label>Alignment</label><select name="alignment">${opts(ALIGNMENTS, n.alignment)}</select></div>
          <div><label>Status</label><select name="status">${opts(STATUSES, n.status)}</select></div>
        </div>
        <div><label>📍 Location</label>
          <select name="locationId"><option value="">Unknown / wandering</option>
          ${[...state.locations].sort(byName).map(l => `<option value="${l.id}" ${l.id === n.locationId ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
          <div class="small muted" style="margin-top:4px">Need a new place? Add it in the 🏰 Locations tab.</div></div>
        <div><label>Description (looks, personality, voice)</label><textarea name="description" maxlength="4000">${esc(n.description)}</textarea></div>
        <div><label>🤫 Secret DM notes (plots, secrets)</label><textarea name="notes" maxlength="4000">${esc(n.notes)}</textarea></div>
        <label class="check"><input type="checkbox" name="known" ${n.known ? 'checked' : ''}> 👁 Players have met this NPC <span class="muted small">(shows in the player view, without secrets)</span></label>
        ${rels.length ? `<div class="field-view">
          <label class="check" style="margin-bottom:6px"><input type="checkbox" id="addRels" checked> 👪 Also add their family (${rels.length})</label>
          <ul class="small" style="margin:0;padding-left:20px">${rels.map(r => `<li><b>${esc(r.relation)}</b>: ${esc(r.name)} — ${esc([r.race, r.age && 'age ' + r.age, r.occupation].filter(Boolean).join(', '))}</li>`).join('')}</ul></div>` : ''}
        <div class="row" style="justify-content:flex-end">
          <button type="button" class="btn" id="cancelNpc" style="flex:0">Cancel</button>
          <button type="submit" class="btn primary" style="flex:0">💾 Save NPC</button>
        </div>
      </form>`;
    $('#cancelNpc').onclick = () => { ui.editing = false; ui.draft = null; renderNpcDetail(); };
    $('#npcForm').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries());
      Object.keys(f).forEach(k => f[k] = String(f[k]).trim());
      if (!f.name) return toast('Your NPC needs a name!');
      f.locationId = f.locationId || null;
      f.known = e.target.known.checked;
      if (isNew) {
        const created = { id: uid(), parents: [], spouses: [], siblings: [], bonds: [], factions: [], portrait: '', ...f };
        state.npcs.push(created); ui.npcId = created.id;
        const addRels = $('#addRels');
        if (rels.length && addRels && addRels.checked) createRelatives(created, rels);
        toast(`✨ ${f.name} joins your world!${rels.length && addRels && addRels.checked ? ` (with ${rels.length} family members)` : ''}`);
        ui.draft = null;
      } else {
        Object.assign(npc(n.id), f); toast('Saved!');
      }
      save(); ui.editing = false; renderNpcList(); renderNpcDetail();
    };
    $('input[name=name]', box).focus();
  }

  // ================= LOCATIONS =================
  function renderLocations(app) {
    const editing = ui.editLocId ? loc(ui.editLocId) : null;
    const l = editing || { name: '', type: 'Village', region: '', notes: '', priceMod: 1, warExposure: 1 };
    const unplaced = state.npcs.filter(n => !loc(n.locationId) && !n.ancestor && n.status !== 'Dead' && !(n.travel && n.travel.road));
    app.innerHTML = `
      <div class="panel">
        <h2>${editing ? '✏️ Edit ' + esc(editing.name) : '🏰 Add a location'}</h2>
        <form id="locForm" class="stack" autocomplete="off">
          <div class="grid2">
            <div><label>Name *</label><input name="name" required maxlength="80" value="${esc(l.name)}" placeholder="e.g. Waterdeep"></div>
            <div><label>Type</label><select name="type">${opts(LOC_TYPES, l.type)}</select></div>
            <div><label>Region / inside of</label><input name="region" maxlength="80" value="${esc(l.region)}" placeholder="e.g. Sword Coast"></div>
            <div><label>💰 Price level here</label><select name="priceMod">${numOpts(PRICE_LEVELS, l.priceMod)}</select></div>
            <div><label>⚔️ How close is the war?</label><select name="warExposure">${numOpts(EXPOSURE, l.warExposure)}</select></div>
          </div>
          <div><label>Notes</label><textarea name="notes" maxlength="4000" style="min-height:60px">${esc(l.notes)}</textarea></div>
          <label class="check"><input type="checkbox" name="hidden" ${l.hidden ? 'checked' : ''}> 🙈 Secret place (hide from the player view)</label>
          <div class="row" style="justify-content:flex-end">
            ${editing ? '<button type="button" class="btn" id="cancelLoc" style="flex:0">Cancel</button>' : ''}
            <button class="btn primary" type="submit" style="flex:0">${editing ? '💾 Save' : '+ Add location'}</button>
          </div>
        </form>
      </div>
      <div class="loc-grid">
        ${[...state.locations].sort(byName).map(L => {
          const people = state.npcs.filter(n => n.locationId === L.id).sort(byName);
          return `<div class="panel loc-card">
            <h3>${esc(L.name)}</h3>
            <div class="small muted">${esc(L.type || '')}${L.region ? ' · ' + esc(L.region) : ''}</div>
            ${L.notes ? `<p class="small prewrap">${esc(L.notes)}</p>` : ''}
            <div class="small" style="margin-top:6px"><b>${people.length}</b> NPC${people.length === 1 ? '' : 's'} here:</div>
            <ul>${people.slice(0, 8).map(p => `<li><a href="#" data-goto="${p.id}">${esc(p.name)}</a> <span class="muted small">${esc(p.occupation || '')}</span></li>`).join('') || '<li class="muted small">nobody yet</li>'}
              ${people.length > 8 ? `<li><a href="#" data-allat="${L.id}">…and ${people.length - 8} more</a></li>` : ''}</ul>
            ${(() => { const coming = state.npcs.filter(p => p.travel && p.travel.road && p.travel.road.to === L.id);
              return coming.length ? `<div class="small muted">🐎 On the way here: ${coming.map(p => `${esc(p.name)} (${p.travel.road.left} d)`).join(', ')}</div>` : ''; })()}
            ${L.hidden ? '<span class="badge missing">🙈 secret place</span>' : ''}
            <details class="small enemies-box"><summary>⚔️ Possible enemies (${enemiesAt(L).length})</summary>
              <div style="margin:6px 0">${enemyChips(L)}</div>
              <button class="btn small" data-encounter="${L.id}">🎲 Roll encounter</button> <span data-encout="${L.id}"></span></details>
            <div class="small muted">💰 ${esc(labelOf(PRICE_LEVELS, L.priceMod))} prices · ⚔️ ${esc(labelOf(EXPOSURE, L.warExposure))}</div>
            <div class="row" style="margin-top:8px">
              <button class="btn small" data-prices="${L.id}">💰 Prices here</button>
              ${state.maps.some(m => m.pins[L.id]) ? `<button class="btn small" data-showmap="${L.id}">🗺 On map</button>` : ''}
              <button class="btn small" data-print="${L.id}" ${people.length ? '' : 'disabled'}>🖨 Print NPCs</button>
            </div>
            <div class="row" style="margin-top:6px"><button class="btn small" data-edit="${L.id}">✏️ Edit</button><button class="btn small danger" data-del="${L.id}">🗑 Delete</button></div>
          </div>`;
        }).join('')}
        ${unplaced.length ? `<div class="panel loc-card"><h3>❔ Unknown / wandering</h3>
          <ul>${unplaced.map(p => `<li><a href="#" data-goto="${p.id}">${esc(p.name)}</a></li>`).join('')}</ul></div>` : ''}
      </div>
      ${state.locations.length ? '' : '<div class="empty">No locations yet — add your first one above!</div>'}`;
    $('#locForm').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries());
      Object.keys(f).forEach(k => f[k] = String(f[k]).trim());
      if (!f.name) return toast('The location needs a name!');
      f.priceMod = Number(f.priceMod) || 1; f.warExposure = Number(f.warExposure) || 1;
      f.hidden = e.target.hidden.checked;
      if (editing) { Object.assign(editing, f); toast('Saved!'); }
      else { state.locations.push({ id: uid(), ...f }); toast(`🏰 ${f.name} added to the map!`); }
      ui.editLocId = null; save(); renderLocations(app);
    };
    const c = $('#cancelLoc'); if (c) c.onclick = () => { ui.editLocId = null; renderLocations(app); };
    app.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { ui.editLocId = b.dataset.edit; renderLocations(app); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    app.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const L = loc(b.dataset.del), count = state.npcs.filter(n => n.locationId === L.id).length;
      if (!confirm(`Delete ${L.name}?${count ? ` The ${count} NPC(s) living there will become "Unknown / wandering".` : ''}`)) return;
      state.locations = state.locations.filter(x => x.id !== L.id);
      state.maps.forEach(mp => { delete mp.pins[L.id]; });
      state.npcs.forEach(n => { if (n.locationId === L.id) n.locationId = null; });
      if (ui.editLocId === L.id) ui.editLocId = null;
      save(); toast(`${L.name} was removed.`); renderLocations(app);
    });
    app.querySelectorAll('[data-goto]').forEach(a => a.onclick = e => { e.preventDefault(); ui.npcId = a.dataset.goto; ui.editing = false; go('npcs'); });
    app.querySelectorAll('[data-prices]').forEach(b => b.onclick = () => { window.Market.setCity(b.dataset.prices); go('market'); });
    app.querySelectorAll('[data-showmap]').forEach(b => b.onclick = () => showOnMap(b.dataset.showmap));
    wireEnemyChips(app);
    app.querySelectorAll('[data-allat]').forEach(a => a.onclick = e => { e.preventDefault(); ui.locFilter = a.dataset.allat; ui.who = ''; ui.search = ''; ui.npcId = null; go('npcs'); });
    app.querySelectorAll('[data-print]').forEach(b => b.onclick = () => {
      const people = state.npcs.filter(n => n.locationId === b.dataset.print).sort(byName);
      printNpcs(people, confirm('Include secret DM notes?\n\nOK = DM copy (with secrets)\nCancel = player copy'));
    });
  }

  // ================= FACTIONS =================
  function renderFactions(app) {
    const editing = ui.editFacId ? faction(ui.editFacId) : null;
    const f = editing || { name: '', type: 'Guild', color: '#c98a3d', hqId: '', goals: '', notes: '' };
    app.innerHTML = `
      <div class="panel">
        <h2>${editing ? '✏️ Edit ' + esc(editing.name) : '⚜️ Add a faction'}</h2>
        <p class="small muted" style="margin-top:-6px">Guilds, noble houses, cults, armies, thieves' guilds… any group of NPCs.</p>
        <form id="facForm" class="stack" autocomplete="off">
          <div class="grid2">
            <div><label>Name *</label><input name="name" required maxlength="80" value="${esc(f.name)}" placeholder="e.g. The Zhentarim"></div>
            <div><label>Type</label><select name="type">${opts(FACTION_TYPES, f.type)}</select></div>
            <div><label>Headquarters</label><select name="hqId"><option value="">Unknown / none</option>
              ${[...state.locations].sort(byName).map(l => `<option value="${l.id}" ${l.id === f.hqId ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div>
            <div><label>Players know it exists?</label><label class="check" style="margin-top:8px"><input type="checkbox" name="public" ${f.public ? 'checked' : ''}> 👁 Yes, show in the player view</label></div>
            <div><label>Banner color</label><input type="color" name="color" value="${esc(f.color)}" style="height:40px;padding:3px"></div>
          </div>
          <div class="grid2">
            <div><label>Goals (what do they want?)</label><textarea name="goals" maxlength="2000" style="min-height:60px">${esc(f.goals)}</textarea></div>
            <div><label>🤫 Secret DM notes</label><textarea name="notes" maxlength="2000" style="min-height:60px">${esc(f.notes)}</textarea></div>
          </div>
          <div class="row" style="justify-content:flex-end">
            ${editing ? '<button type="button" class="btn" id="cancelFac" style="flex:0">Cancel</button>' : ''}
            <button class="btn primary" type="submit" style="flex:0">${editing ? '💾 Save' : '+ Add faction'}</button>
          </div>
        </form>
      </div>
      <div class="loc-grid">
        ${[...state.factions].sort(byName).map(F => {
          const members = membersOf(F.id).sort(byName), hq = loc(F.hqId);
          const nonMembers = state.npcs.filter(n => !members.includes(n)).sort(byName);
          return `<div class="panel loc-card fac-card ${ui.facId === F.id ? 'sel' : ''}" id="fac-${F.id}" style="border-top:4px solid ${F.color}">
            <h3>${esc(F.name)}</h3>
            <div class="small muted">${esc(F.type)}${hq ? ' · 🏠 ' + esc(hq.name) : ''} · ${F.public ? '👁 public' : '🙈 secret'}</div>
            ${F.goals ? `<p class="small prewrap"><b>Goals:</b> ${esc(F.goals)}</p>` : ''}
            ${F.notes ? `<p class="small prewrap field-view secret">🤫 ${esc(F.notes)}</p>` : ''}
            <div class="small" style="margin-top:6px"><b>${members.length}</b> member${members.length === 1 ? '' : 's'}:</div>
            <ul class="members">${members.map(p => `<li>${avatar(p, 24)} <a href="#" data-goto="${p.id}">${esc(p.name)}</a>
              <span class="muted small">${esc(rankIn(p, F.id))}</span>
              <button class="btn-x" title="Remove from faction" data-kick="${p.id}" data-f="${F.id}">×</button></li>`).join('') || '<li class="muted small">no members yet</li>'}</ul>
            ${nonMembers.length ? `<div class="row">
              <select data-addsel="${F.id}" style="flex:2 1 120px"><option value="">Add member…</option>${nonMembers.map(n => `<option value="${n.id}">${esc(n.name)}</option>`).join('')}</select>
              <input data-addrank="${F.id}" maxlength="40" placeholder="rank" style="flex:1 1 70px">
              <button class="btn small primary" data-add="${F.id}" style="flex:0">+</button></div>` : ''}
            <div class="row" style="margin-top:8px">
              <button class="btn small" data-print="${F.id}" ${members.length ? '' : 'disabled'}>🖨 Print</button>
              <button class="btn small" data-edit="${F.id}">✏️ Edit</button>
              <button class="btn small danger" data-del="${F.id}">🗑 Delete</button></div>
          </div>`;
        }).join('')}
      </div>
      ${state.factions.length ? '' : '<div class="empty">No factions yet — add your first one above!</div>'}`;
    $('#facForm').onsubmit = e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target).entries());
      Object.keys(d).forEach(k => d[k] = String(d[k]).trim());
      if (!d.name) return toast('The faction needs a name!');
      if (!/^#[0-9a-fA-F]{6}$/.test(d.color)) d.color = '#c98a3d';
      d.hqId = d.hqId || null;
      d.public = e.target.public.checked;
      if (editing) { Object.assign(editing, d); toast('Saved!'); }
      else { state.factions.push({ id: uid(), ...d }); toast(`⚜️ ${d.name} has been founded!`); }
      ui.editFacId = null; save(); renderFactions(app);
    };
    const c = $('#cancelFac'); if (c) c.onclick = () => { ui.editFacId = null; renderFactions(app); };
    app.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { ui.editFacId = b.dataset.edit; renderFactions(app); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    app.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const F = faction(b.dataset.del);
      if (!confirm(`Delete ${F.name}? Members stay in your world, they just leave the faction.`)) return;
      state.factions = state.factions.filter(x => x.id !== F.id);
      state.npcs.forEach(n => { n.factions = n.factions.filter(x => x.id !== F.id); });
      if (ui.editFacId === F.id) ui.editFacId = null;
      save(); toast(`${F.name} has been disbanded.`); renderFactions(app);
    });
    app.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
      const fid = b.dataset.add;
      const err = joinFaction(app.querySelector(`[data-addsel="${fid}"]`).value, fid, app.querySelector(`[data-addrank="${fid}"]`).value.trim());
      if (err) return toast('Pick an NPC first.');
      ui.facId = fid; renderFactions(app);
    });
    app.querySelectorAll('[data-kick]').forEach(b => b.onclick = () => { leaveFaction(b.dataset.kick, b.dataset.f); renderFactions(app); });
    app.querySelectorAll('[data-goto]').forEach(a => a.onclick = e => { e.preventDefault(); ui.npcId = a.dataset.goto; ui.editing = false; go('npcs'); });
    app.querySelectorAll('[data-print]').forEach(b => b.onclick = () => {
      printNpcs(membersOf(b.dataset.print).sort(byName), confirm('Include secret DM notes?\n\nOK = DM copy (with secrets)\nCancel = player copy'));
    });
    if (ui.facId) { const el = document.getElementById('fac-' + ui.facId); if (el) el.scrollIntoView({ block: 'center' }); }
  }

  // ================= BESTIARY =================
  const CR_XP = { '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900,
    11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000, 21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000 };
  const CRS = Object.keys(CR_XP).sort((a, b) => crNum(a) - crNum(b));
  function crNum(cr) { cr = String(cr); return cr.includes('/') ? 1 / Number(cr.split('/')[1]) : Number(cr) || 0; }
  const pbOf = cr => Math.max(2, Math.ceil(crNum(cr) / 4) + 1);
  const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const SKILL_ABIL = { Acrobatics: 'DEX', 'Animal Handling': 'WIS', Arcana: 'INT', Athletics: 'STR', Deception: 'CHA', History: 'INT', Insight: 'WIS', Intimidation: 'CHA',
    Investigation: 'INT', Medicine: 'WIS', Nature: 'INT', Perception: 'WIS', Performance: 'CHA', Persuasion: 'CHA', Religion: 'INT', 'Sleight of Hand': 'DEX', Stealth: 'DEX', Survival: 'WIS' };
  const modOf = s => Math.floor((Number(s) - 10) / 2);
  const sgn = n => (n >= 0 ? '+' : '−') + Math.abs(n);
  const allMonsters = () => (window.BESTIARY || []).concat(state.monsters || []);
  const monster = id => allMonsters().find(m => m.id === id);
  const sameName = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  const enemiesAt = L => allMonsters().filter(m => (m.habitats || []).some(h => sameName(h, L.name) || sameName(h, L.region || '')))
    .sort((a, b) => crNum(a.cr) - crNum(b.cr));
  function monsterMath(m) {
    const pb = pbOf(m.cr), mods = {};
    ABIL.forEach((a, i) => { mods[a] = modOf((m.abil || [])[i] ?? 10); });
    const [n, d] = m.hd || [1, 8];
    const hp = Math.max(1, Math.floor(n * (d + 1) / 2) + n * mods.CON);
    return { pb, mods, hp, hpDice: `${n}d${d}${n * mods.CON ? ` ${n * mods.CON > 0 ? '+' : '−'} ${Math.abs(n * mods.CON)}` : ''}` };
  }
  // turns {hit:STR}, {dc:CON}, [2d6+STR] into real numbers for this creature
  function fillText(m, text) {
    const { pb, mods } = monsterMath(m);
    return esc(text)
      .replace(/\{hit:(STR|DEX|CON|INT|WIS|CHA)\}/g, (_, a) => sgn(pb + mods[a]))
      .replace(/\{dc:(STR|DEX|CON|INT|WIS|CHA)\}/g, (_, a) => `DC ${8 + pb + mods[a]}`)
      .replace(/\[(\d+)d(\d+)(?:\s*\+\s*(STR|DEX|CON|INT|WIS|CHA|\d+))?\]/g, (_, x, y, b) => {
        const bonus = b ? (/^\d+$/.test(b) ? Number(b) : mods[b]) : 0;
        const avg = Math.max(1, Math.floor(x * (Number(y) + 1) / 2 + bonus));
        return `${avg} (${x}d${y}${bonus ? ` ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)}` : ''})`;
      })
      .replace(/\n/g, '<br>');
  }
  function statBlockHtml(m) {
    const { pb, mods, hp, hpDice } = monsterMath(m);
    const skillList = (m.skills || []).map(([s, a, mult]) => `${s} ${sgn(mods[a || SKILL_ABIL[s] || 'WIS'] + pb * (mult || 1))}`);
    const percSkill = (m.skills || []).find(([s]) => s === 'Perception');
    const passive = 10 + mods.WIS + (percSkill ? pb * (percSkill[2] || 1) : 0);
    const line = (k, v) => v ? `<div class="sb-line"><b>${k}</b> ${esc(v)}</div>` : '';
    const block = (title, list) => list && list.length ? `${title ? `<h4 class="sb-sect">${title}</h4>` : ''}${list.map(([n, t]) => `<p class="sb-p"><b><i>${esc(n)}.</i></b> ${fillText(m, t)}</p>`).join('')}` : '';
    return `<div class="statblock">
      <div class="sb-name">${esc(m.name)}</div>
      <div class="sb-meta">${esc(m.size || 'Medium')} ${esc(m.type || 'creature')}, ${esc(m.align || 'unaligned')}</div>
      <div class="sb-rule"></div>
      <div class="sb-line"><b>Armor Class</b> ${esc(m.ac)}${m.acNote ? ` (${esc(m.acNote)})` : ''}</div>
      <div class="sb-line"><b>Hit Points</b> ${hp} (${hpDice})</div>
      <div class="sb-line"><b>Speed</b> ${esc(m.speed || '30 ft.')}</div>
      <div class="sb-rule"></div>
      <div class="sb-abil">${ABIL.map((a, i) => `<div><b>${a}</b><br>${(m.abil || [])[i] ?? 10} (${sgn(mods[a])})</div>`).join('')}</div>
      <div class="sb-rule"></div>
      ${(m.saves || []).length ? `<div class="sb-line"><b>Saving Throws</b> ${m.saves.map(a => `${a[0]}${a.slice(1).toLowerCase()} ${sgn(mods[a] + pb)}`).join(', ')}</div>` : ''}
      ${skillList.length ? `<div class="sb-line"><b>Skills</b> ${esc(skillList.join(', '))}</div>` : ''}
      ${line('Damage Vulnerabilities', m.vuln)}${line('Damage Resistances', m.res)}${line('Damage Immunities', m.imm)}${line('Condition Immunities', m.cimm)}
      <div class="sb-line"><b>Senses</b> ${m.senses ? esc(m.senses) + ', ' : ''}passive Perception ${passive}</div>
      ${line('Languages', m.lang || '—')}
      <div class="sb-line sb-cr"><span><b>Challenge</b> ${esc(m.cr)} (${(CR_XP[m.cr] || 0).toLocaleString()} XP)</span><span><b>Proficiency Bonus</b> ${sgn(pb)}</span></div>
      <div class="sb-rule"></div>
      ${block('', m.traits)}
      ${block('Actions', m.actions)}
      ${block('Bonus Actions', m.bonus)}
      ${block('Reactions', m.reactions)}
      ${m.legendary ? `<h4 class="sb-sect">Legendary Actions</h4><p class="sb-p">${fillText(m, m.legendary.intro || '')}</p>${(m.legendary.actions || []).map(([n, t]) => `<p class="sb-p sb-leg"><b>${esc(n)}.</b> ${fillText(m, t)}</p>`).join('')}` : ''}
    </div>`;
  }
  function placesFor(m) { // locations where this creature can appear
    return state.locations.filter(L => (m.habitats || []).some(h => sameName(h, L.name) || sameName(h, L.region || ''))).sort(byName);
  }
  function rollEncounter(L) {
    const list = enemiesAt(L); if (!list.length) return null;
    const m = list[Math.floor(Math.random() * list.length)], c = crNum(m.cr);
    const d = s => 1 + Math.floor(Math.random() * s);
    const count = m.boss ? 1 : c < 1 ? d(6) + 1 : c <= 2 ? d(4) : c <= 5 ? d(2) : 1;
    return { m, count };
  }
  function enemyChips(L) {
    const list = enemiesAt(L);
    if (!list.length) return '<span class="muted small">none known</span>';
    return list.map(m => `<a href="#" class="chip enemy ${m.boss ? 'boss' : ''}" data-monster="${esc(m.id)}">${m.boss ? '💀 ' : ''}${esc(m.name)} <span class="muted small">CR ${esc(m.cr)}</span></a>`).join('');
  }
  function wireEnemyChips(root) {
    root.querySelectorAll('[data-monster]').forEach(a => a.onclick = e => { e.preventDefault(); ui.monsterId = a.dataset.monster; ui.monsterEdit = false; go('bestiary'); });
    root.querySelectorAll('[data-encounter]').forEach(b => b.onclick = () => {
      const L = loc(b.dataset.encounter), r = L && rollEncounter(L);
      const out = root.querySelector(`[data-encout="${b.dataset.encounter}"]`);
      if (out) out.innerHTML = r ? `🎲 <b>${r.count}× <a href="#" data-monster="${esc(r.m.id)}">${esc(r.m.name)}</a></b> (CR ${esc(r.m.cr)})` : 'No enemies known here.';
      wireEnemyChips(out || root);
    });
  }

  function renderBestiary(app) {
    const mons = allMonsters();
    if (!monster(ui.monsterId)) ui.monsterId = mons.length ? mons[0].id : null;
    const q = (ui.mSearch || '').toLowerCase();
    const types = [...new Set(mons.map(m => (m.type || '').split(' ')[0]))].sort();
    const list = mons.filter(m => (!q || m.name.toLowerCase().includes(q) || (m.habitats || []).join(' ').toLowerCase().includes(q))
      && (!ui.mType || (m.type || '').startsWith(ui.mType))
      && (!ui.mGroup || (ui.mGroup === 'dungeon' ? !!m.dungeon : ui.mGroup === 'regional' ? !m.dungeon && !m.custom : !!m.custom)))
      .sort((a, b) => crNum(a.cr) - crNum(b.cr) || a.name.localeCompare(b.name));
    app.innerHTML = `
      <div class="split">
        <aside class="panel">
          <div class="row"><h2 style="margin:0">🐉 Bestiary <span class="muted small">(${mons.length})</span></h2>
            <button class="btn primary" id="newMonster" style="flex:0">+ New</button></div>
          <div class="stack" style="margin-top:12px">
            <input id="mSearch" placeholder="🔍 Search name or place…" value="${esc(ui.mSearch || '')}">
            <div class="row">
              <select id="mGroup">${[['', 'All creatures'], ['regional', '🗺 Regional enemies'], ['dungeon', '⚱️ Vestige dungeons'], ['custom', '✏️ Your creatures']].map(([v, l]) => `<option value="${v}" ${ui.mGroup === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
              <select id="mType"><option value="">All types</option>${types.map(t => `<option ${ui.mType === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
            </div>
          </div>
          <ul class="item-list" id="mList">${list.map(m => `<li data-mid="${esc(m.id)}" class="${m.id === ui.monsterId ? 'sel' : ''}">
            <div>${m.boss ? '💀 ' : ''}${esc(m.name)} <span class="badge">CR ${esc(m.cr)}</span></div>
            <div class="sub">${esc(m.size || '')} ${esc(m.type || '')}${m.dungeon ? ' · ⚱️ ' + esc(m.dungeon) : ''}${m.custom ? ' · ✏️ yours' : ''}</div></li>`).join('') || '<li class="muted">No creatures found.</li>'}</ul>
        </aside>
        <section id="mDetail"></section>
      </div>`;
    $('#mSearch').oninput = e => { ui.mSearch = e.target.value; const p = e.target.selectionStart; renderBestiary(app); const i = $('#mSearch'); i.focus(); i.setSelectionRange(p, p); };
    $('#mGroup').onchange = e => { ui.mGroup = e.target.value; renderBestiary(app); };
    $('#mType').onchange = e => { ui.mType = e.target.value; renderBestiary(app); };
    $('#newMonster').onclick = () => { ui.monsterEdit = 'new'; renderMonsterDetail(); };
    app.querySelectorAll('[data-mid]').forEach(li => li.onclick = () => { ui.monsterId = li.dataset.mid; ui.monsterEdit = false; renderBestiary(app); });
    renderMonsterDetail();
  }
  function renderMonsterDetail() {
    const box = $('#mDetail'); if (!box) return;
    if (ui.monsterEdit) return renderMonsterForm(box, ui.monsterEdit === 'new' ? null : monster(ui.monsterId));
    const m = monster(ui.monsterId);
    if (!m) { box.innerHTML = '<div class="panel empty">No creatures yet.</div>'; return; }
    const places = placesFor(m);
    box.innerHTML = `
      <div class="row" style="justify-content:flex-start;margin-bottom:10px">
        <button class="btn small" id="mPrint" style="flex:0">🖨 Print</button>
        ${m.custom ? '<button class="btn small" id="mEdit" style="flex:0">✏️ Edit</button><button class="btn small danger" id="mDelete" style="flex:0">🗑 Delete</button>'
          : '<button class="btn small" id="mCopy" style="flex:0">📄 Copy & edit</button>'}
      </div>
      <div class="bestiary-detail">
        ${statBlockHtml(m)}
        <div class="panel stack sb-side">
          ${m.lore ? `<div><h3>📖 Lore</h3><p class="small prewrap">${esc(m.lore)}</p></div>` : ''}
          <div><h3>📍 Where to meet it</h3>
            <div class="small muted" style="margin-bottom:6px">${esc((m.habitats || []).join(', ') || 'Nowhere set yet')}</div>
            <div>${places.slice(0, 40).map(L => `<a href="#" class="chip" data-mplace="${L.id}">${L.type === 'Dungeon' ? '⚱️ ' : ''}${esc(L.name)}</a>`).join('') || '<span class="muted small">No matching places.</span>'}
            ${places.length > 40 ? `<span class="muted small">…and ${places.length - 40} more</span>` : ''}</div></div>
        </div>
      </div>`;
    box.querySelectorAll('[data-mplace]').forEach(a => a.onclick = e => { e.preventDefault(); if (!showOnMap(a.dataset.mplace)) go('locations'); });
    $('#mPrint').onclick = () => {
      let area = $('#printArea'); if (!area) { area = document.createElement('div'); area.id = 'printArea'; document.body.appendChild(area); }
      area.innerHTML = statBlockHtml(m);
      document.body.classList.add('printing');
      const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done); setTimeout(() => { window.print(); setTimeout(done, 500); }, 50);
    };
    const cp = $('#mCopy'); if (cp) cp.onclick = () => {
      const copy = JSON.parse(JSON.stringify(m)); copy.id = 'c-' + uid(); copy.custom = true; copy.name = m.name + ' (copy)'; delete copy.boss;
      (state.monsters = state.monsters || []).push(copy); save(); ui.monsterId = copy.id; ui.monsterEdit = 'edit'; renderBestiary($('#app'));
    };
    const ed = $('#mEdit'); if (ed) ed.onclick = () => { ui.monsterEdit = 'edit'; renderMonsterDetail(); };
    const de = $('#mDelete'); if (de) de.onclick = () => {
      if (!confirm(`Delete ${m.name}?`)) return;
      state.monsters = state.monsters.filter(x => x.id !== m.id); save(); ui.monsterId = null; renderBestiary($('#app'));
    };
  }
  // simple editor: lists are written one per line as "Name. Description"
  const listToText = l => (l || []).map(([n, t]) => `${n}. ${t.replace(/\n/g, ' / ')}`).join('\n');
  const textToList = t => String(t || '').split('\n').map(s => s.trim()).filter(Boolean).map(s => {
    const i = s.indexOf('. '); return i > 0 ? [s.slice(0, i), s.slice(i + 2).replace(/ \/ /g, '\n')] : [s, ''];
  });
  function renderMonsterForm(box, m) {
    const isNew = !m;
    m = m || { name: '', size: 'Medium', type: 'monstrosity', align: 'unaligned', ac: 13, acNote: '', hd: [4, 8], speed: '30 ft.', abil: [10, 10, 10, 10, 10, 10], cr: '1', habitats: [] };
    const regions = [...new Set(state.locations.map(l => l.region).filter(Boolean))];
    box.innerHTML = `<div class="panel">
      <h2>${isNew ? '✨ New creature' : '✏️ Edit ' + esc(m.name)}</h2>
      <p class="small muted">Tip: in actions you can write <code>{hit:STR}</code> for the attack bonus, <code>{dc:CON}</code> for a save DC and <code>[2d6+STR]</code> for damage — the numbers are worked out for you.</p>
      <form id="mForm" class="stack" autocomplete="off">
        <div class="grid2">
          <div><label>Name *</label><input name="name" required maxlength="80" value="${esc(m.name)}"></div>
          <div><label>Size</label><select name="size">${opts(['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'], m.size)}</select></div>
          <div><label>Type</label><input name="type" value="${esc(m.type)}" placeholder="e.g. undead, beast, dragon"></div>
          <div><label>Alignment</label><input name="align" value="${esc(m.align)}"></div>
          <div><label>Armor Class</label><input name="ac" type="number" min="1" max="30" value="${esc(m.ac)}"></div>
          <div><label>Armor note</label><input name="acNote" value="${esc(m.acNote || '')}" placeholder="natural armor"></div>
          <div><label>Hit Dice (how many)</label><input name="hdN" type="number" min="1" max="60" value="${esc((m.hd || [])[0] || 4)}"></div>
          <div><label>Hit Die size</label><select name="hdD">${[4, 6, 8, 10, 12, 20].map(d => `<option ${d === (m.hd || [])[1] ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
          <div><label>Speed</label><input name="speed" value="${esc(m.speed)}"></div>
          <div><label>Challenge</label><select name="cr">${CRS.map(c => `<option ${String(m.cr) === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        </div>
        <div class="grid6">${ABIL.map((a, i) => `<div><label>${a}</label><input name="ab${i}" type="number" min="1" max="30" value="${esc((m.abil || [])[i] ?? 10)}"></div>`).join('')}</div>
        <div class="grid2">
          <div><label>Saving throws (e.g. DEX, CON)</label><input name="saves" value="${esc((m.saves || []).join(', '))}"></div>
          <div><label>Skills (e.g. Perception, Stealth)</label><input name="skills" value="${esc((m.skills || []).map(s => s[0] + (s[2] === 2 ? '*' : '')).join(', '))}" placeholder="* = double proficiency"></div>
          <div><label>Damage vulnerabilities</label><input name="vuln" value="${esc(m.vuln || '')}"></div>
          <div><label>Damage resistances</label><input name="res" value="${esc(m.res || '')}"></div>
          <div><label>Damage immunities</label><input name="imm" value="${esc(m.imm || '')}"></div>
          <div><label>Condition immunities</label><input name="cimm" value="${esc(m.cimm || '')}"></div>
          <div><label>Senses</label><input name="senses" value="${esc(m.senses || '')}" placeholder="darkvision 60 ft."></div>
          <div><label>Languages</label><input name="lang" value="${esc(m.lang || '')}"></div>
        </div>
        <div><label>📍 Where it lives (places or regions, comma separated)</label><input name="habitats" list="habList" value="${esc((m.habitats || []).join(', '))}">
          <datalist id="habList">${regions.concat(state.locations.map(l => l.name)).map(x => `<option value="${esc(x)}">`).join('')}</datalist>
          <div class="small muted">Regions: ${esc(regions.join(' · '))}</div></div>
        <div><label>Traits (one per line: "Name. What it does")</label><textarea name="traits">${esc(listToText(m.traits))}</textarea></div>
        <div><label>Actions</label><textarea name="actions">${esc(listToText(m.actions))}</textarea></div>
        <div class="grid2">
          <div><label>Bonus actions</label><textarea name="bonus">${esc(listToText(m.bonus))}</textarea></div>
          <div><label>Reactions</label><textarea name="reactions">${esc(listToText(m.reactions))}</textarea></div>
        </div>
        <div><label>Legendary actions (leave empty if none)</label><textarea name="legendary">${esc(m.legendary ? listToText(m.legendary.actions) : '')}</textarea></div>
        <div><label>Lore</label><textarea name="lore">${esc(m.lore || '')}</textarea></div>
        <div class="row" style="justify-content:flex-end">
          <button type="button" class="btn" id="mCancel" style="flex:0">Cancel</button>
          <button type="submit" class="btn primary" style="flex:0">💾 Save creature</button>
        </div>
      </form></div>`;
    $('#mCancel').onclick = () => { ui.monsterEdit = false; renderMonsterDetail(); };
    $('#mForm').onsubmit = e => {
      e.preventDefault();
      const f = e.target, field = k => f.elements.namedItem(k), v = k => String(field(k).value || '').trim();
      if (!v('name')) return toast('Your creature needs a name!');
      const split = s => s.split(',').map(x => x.trim()).filter(Boolean);
      const data = {
        name: v('name'), size: v('size'), type: v('type'), align: v('align'), ac: Number(v('ac')) || 10, acNote: v('acNote'),
        hd: [Math.max(1, Number(v('hdN')) || 1), Number(v('hdD')) || 8], speed: v('speed'), cr: v('cr'),
        abil: ABIL.map((_, i) => Math.max(1, Math.min(30, Number(field('ab' + i).value) || 10))),
        saves: split(v('saves')).map(s => s.toUpperCase().slice(0, 3)).filter(s => ABIL.includes(s)),
        skills: split(v('skills')).map(s => { const exp = s.endsWith('*'); const nm = s.replace('*', '').trim(); const k = Object.keys(SKILL_ABIL).find(x => sameName(x, nm)); return k ? (exp ? [k, SKILL_ABIL[k], 2] : [k, SKILL_ABIL[k]]) : null; }).filter(Boolean),
        vuln: v('vuln'), res: v('res'), imm: v('imm'), cimm: v('cimm'), senses: v('senses'), lang: v('lang'),
        habitats: split(v('habitats')), lore: v('lore'),
        traits: textToList(v('traits')), actions: textToList(v('actions')), bonus: textToList(v('bonus')), reactions: textToList(v('reactions')),
        legendary: v('legendary') ? { intro: "The creature can take 3 legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. It regains spent legendary actions at the start of its turn.", actions: textToList(v('legendary')) } : null,
        custom: true,
      };
      if (isNew) { data.id = 'c-' + uid(); (state.monsters = state.monsters || []).push(data); ui.monsterId = data.id; toast(`🐉 ${data.name} added to the bestiary!`); }
      else { Object.assign(m, data); toast('Saved!'); }
      save(); ui.monsterEdit = false; renderBestiary($('#app'));
    };
  }

  // ================= TRAVEL SIMULATION =================
  // Traders, nobles and couriers walk their route one day at a time. Each "🌙 End the day" moves everyone.
  const KIND_LABEL = { trader: '🐎 Trader', noble: '👑 Noble', courier: '🦅 Courier' };
  const stayFor = kind => kind === 'courier' ? 1 + Math.floor(Math.random() * 2) : kind === 'noble' ? 2 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 3);
  function travelDays(a, b) { // shortest road trip in days (Dijkstra); 3 days if no road is known
    if (a === b) return 0;
    const g = {};
    state.roads.forEach(([x, y, d]) => { (g[x] = g[x] || []).push([y, d]); (g[y] = g[y] || []).push([x, d]); });
    const dist = { [a]: 0 }, todo = [a], done = new Set();
    while (todo.length) {
      todo.sort((p, q) => dist[p] - dist[q]);
      const k = todo.shift(); if (done.has(k)) continue; done.add(k);
      if (k === b) return dist[k];
      for (const [n, d] of g[k] || []) if (dist[n] === undefined || dist[k] + d < dist[n]) { dist[n] = dist[k] + d; todo.push(n); }
    }
    return 3;
  }
  function simulateDay() {
    state.sim.day++;
    const day = state.sim.day, events = [];
    state.npcs.forEach(n => {
      const t = n.travel; if (!t) return;
      t.route = t.route.filter(id => loc(id));
      if (t.route.length < 2) { delete n.travel; return; }
      if (n.status === 'Dead' || n.status === 'Missing') return;
      if (t.road) {
        t.road.left--;
        if (t.road.left <= 0) {
          n.locationId = loc(t.road.to) ? t.road.to : t.route[0];
          events.push({ day, id: n.id, text: `${n.name} arrived in ${loc(n.locationId).name}` });
          t.road = null; t.stay = stayFor(t.kind);
        }
      } else {
        t.stay = (t.stay || 1) - 1;
        if (t.stay <= 0) {
          const cur = t.route.indexOf(n.locationId);
          const from = cur >= 0 ? t.route[cur] : (n.locationId || t.route[t.stop || 0]);
          const next = ((cur >= 0 ? cur : (t.stop || 0)) + 1) % t.route.length;
          const to = t.route[next], d = Math.max(1, travelDays(from, to));
          t.stop = next; t.road = { from, to, left: d, total: d }; n.locationId = null;
          events.push({ day, id: n.id, text: `${n.name} left ${loc(from) ? loc(from).name : '?'} for ${loc(to).name} (${d} day${d === 1 ? '' : 's'})` });
        }
      }
    });
    state.sim.log = [...events.reverse(), ...state.sim.log].slice(0, 150);
    save();
    return events;
  }
  function travelHtml(n) {
    const t = n.travel;
    if (t) {
      const status = t.road
        ? `On the road from <b>${esc(loc(t.road.from) ? loc(t.road.from).name : '?')}</b> to <b>${esc(loc(t.road.to) ? loc(t.road.to).name : '?')}</b> — arrives in ${t.road.left} day${t.road.left === 1 ? '' : 's'}.`
        : `Staying in <b>${esc(loc(n.locationId) ? loc(n.locationId).name : '?')}</b> — leaves in ${t.stay || 1} day${(t.stay || 1) === 1 ? '' : 's'}.`;
      return `<div class="field-view small">${KIND_LABEL[t.kind] || '🐎 Traveller'} · ${status}
        <div style="margin-top:6px">Route: ${t.route.map(id => esc(loc(id) ? loc(id).name : '?')).join(' → ')} → (back)</div></div>
        <div class="row" style="margin-top:8px;justify-content:flex-start"><button class="btn small danger" id="stopTravel" style="flex:0">🏠 Stop travelling (stay here)</button></div>`;
    }
    const d = ui.routeDraft.filter(id => loc(id));
    return `<p class="small muted" style="margin:0 0 6px">Stays at home. Make them travel between places (moves each time you press 🌙 End the day):</p>
      <div class="rel-group">${d.map((id, i) => `<span class="chip">${i + 1}. ${esc(loc(id).name)} <button class="btn-x" data-unstop="${i}">×</button></span>`).join('') || ''}</div>
      <div class="row">
        <select id="routeStop" style="flex:2 1 160px"><option value="">Add a stop…</option>${[...state.locations].sort(byName).map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select>
        <select id="routeKind" style="flex:1 1 110px"><option value="trader">🐎 Trader</option><option value="noble">👑 Noble</option><option value="courier">🦅 Courier</option></select>
        <button class="btn primary" id="startTravel" style="flex:0" ${d.length ? '' : 'disabled'}>Start</button>
      </div>`;
  }
  function wireTravel(n) {
    const st = $('#stopTravel');
    if (st) st.onclick = () => {
      if (n.travel && n.travel.road) n.locationId = n.travel.road.to;
      delete n.travel; save(); toast(`${n.name} settles down.`); renderNpcList(); renderNpcDetail();
    };
    const rs = $('#routeStop'); if (rs) rs.onchange = () => { if (rs.value) { ui.routeDraft.push(rs.value); renderNpcDetail(); } };
    document.querySelectorAll('[data-unstop]').forEach(b => b.onclick = () => { ui.routeDraft.splice(+b.dataset.unstop, 1); renderNpcDetail(); });
    const go2 = $('#startTravel');
    if (go2) go2.onclick = () => {
      const route = [...new Set([n.locationId, ...ui.routeDraft].filter(id => loc(id)))];
      if (route.length < 2) return toast('Pick at least one other place (and give them a home location).');
      n.travel = { kind: $('#routeKind').value, route, stop: 0, stay: 1, road: null };
      ui.routeDraft = []; save(); toast(`🐎 ${n.name} will set off at the end of the day.`); renderNpcList(); renderNpcDetail();
    };
  }
  function travelPanel() {
    const onRoad = state.npcs.filter(p => p.travel && p.travel.road);
    return `<div class="split" style="grid-template-columns:1fr 1fr;margin-top:12px">
      <div class="field-view"><div class="row" style="justify-content:space-between"><b>🛤 On the road (${onRoad.length})</b>
        <button class="btn small primary" id="simDay" style="flex:0">🌙 End the day</button></div>
        <ul class="members small travel-list">${onRoad.map(p => `<li><a href="#" data-tgoto="${p.id}">${esc(p.name)}</a> <span class="muted">${esc(loc(p.travel.road.from) ? loc(p.travel.road.from).name : '?')} → ${esc(loc(p.travel.road.to) ? loc(p.travel.road.to).name : '?')} · ${p.travel.road.left} d</span></li>`).join('') || '<li class="muted">Nobody is travelling right now.</li>'}</ul></div>
      <div class="field-view"><b>📜 Travel log</b> <span class="small muted">· world day ${state.sim.day}</span>
        <ul class="members small travel-list">${state.sim.log.slice(0, 30).map(e => `<li><span class="muted">Day ${e.day}:</span>&nbsp;${esc(e.text)}</li>`).join('') || '<li class="muted">Press 🌙 End the day to move the world forward.</li>'}</ul></div>
    </div>`;
  }

  // ================= MAPS =================
  // Each map is a picture. A pin puts one of your locations at "x% from the left, y% from the top".
  function readMapImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('not an image'));
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, 2000 / img.width), c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }
  function renderMaps(app) {
    const maps = state.maps;
    if (!maps.find(m => m.id === ui.mapId)) ui.mapId = maps.length ? maps[0].id : null;
    const m = maps.find(x => x.id === ui.mapId);
    const zoom = ui.mapZoom || 100;
    app.innerHTML = `
      <div class="panel">
        <div class="row" style="justify-content:space-between">
          <h2 style="margin:0;flex:0 1 auto">🗺 Maps</h2>
          <label class="btn small" style="flex:0;margin:0;color:var(--text)">⬆️ Add your own map<input type="file" id="mapUpload" accept="image/*" hidden></label>
        </div>
        <div class="cat-chips" style="margin-top:10px">
          ${maps.map(x => `<button class="btn small ${x.id === ui.mapId ? 'on' : ''}" data-map="${esc(x.id)}">${x.hidden ? '🙈 ' : ''}${esc(x.name)}</button>`).join('') || '<span class="muted">No maps yet — add one!</span>'}
        </div>
        ${m ? `
        <div class="row map-tools">
          <select id="pinLoc" style="flex:2 1 220px"><option value="">📍 Place or move a pin: choose a place…</option>
            ${[...state.locations].sort(byName).map(l => `<option value="${l.id}" ${ui.pinLoc === l.id ? 'selected' : ''}>${m.pins[l.id] ? '✓ ' : ''}${esc(l.name)}</option>`).join('')}</select>
          <span class="small muted" style="flex:1 1 140px">${ui.pinLoc ? '👆 now click on the map' : `${Object.keys(m.pins).length} places pinned`}</span>
          <span class="row" style="flex:0 1 auto;gap:4px">${[100, 150, 200, 300].map(z => `<button class="btn small ${z === zoom ? 'on' : ''}" data-zoom="${z}">${z}%</button>`).join('')}</span>
        </div>
        <div class="map-scroll"><div class="map-inner" id="mapInner" style="width:${zoom}%">
          <img src="${esc(m.src)}" alt="${esc(m.name)}" id="mapImg" draggable="false" class="${ui.pinLoc ? 'placing' : ''}">
          ${Object.entries(m.pins).filter(([lid]) => loc(lid)).map(([lid, [x, y]]) => {
            const L = loc(lid), n = state.npcs.filter(p => p.locationId === lid).length;
            return `<button class="pin ${L.type === 'Dungeon' ? 'dungeon' : L.hidden ? 'secret' : ''} ${ui.pinSel === lid ? 'sel' : ''}" data-pin="${lid}" style="left:${x}%;top:${y}%" title="${esc(L.name)}${n ? ` — ${n} NPC${n === 1 ? '' : 's'}` : ''}">${n ? `<span>${n}</span>` : ''}</button>`;
          }).join('')}
          ${state.npcs.filter(p => p.travel && p.travel.road && m.pins[p.travel.road.from] && m.pins[p.travel.road.to]).map(p => {
            const r = p.travel.road, [x1, y1] = m.pins[r.from], [x2, y2] = m.pins[r.to], f = Math.min(0.9, Math.max(0.1, (r.total - r.left + 0.5) / r.total));
            return `<button class="traveller ${p.generated ? '' : 'main'}" data-traveller="${p.id}" style="left:${x1 + (x2 - x1) * f}%;top:${y1 + (y2 - y1) * f}%" title="${esc(p.name)} → ${esc(loc(r.to).name)} (${r.left} d)">${p.travel.kind === 'noble' ? '👑' : p.travel.kind === 'courier' ? '🦅' : '🐎'}</button>`;
          }).join('')}
        </div></div>
        <div id="pinCard"></div>
        ${travelPanel()}
        <div class="row" style="margin-top:10px;justify-content:flex-start">
          <button class="btn small" id="mapHide" style="flex:0">${m.hidden ? '🙈 Hidden from players — show' : '👁 Players can see this map — hide'}</button>
          <button class="btn small" id="mapRename" style="flex:0">✏️ Rename</button>
          <button class="btn small danger" id="mapDelete" style="flex:0">🗑 Delete map</button>
        </div>` : ''}
      </div>`;
    app.querySelectorAll('[data-map]').forEach(b => b.onclick = () => { ui.mapId = b.dataset.map; ui.pinSel = null; ui.pinLoc = ''; renderMaps(app); });
    $('#mapUpload').onchange = async e => {
      try {
        const src = await readMapImage(e.target.files[0]);
        const name = (prompt('Name for this map?', e.target.files[0].name.replace(/\.[^.]+$/, '')) || 'My map').slice(0, 60);
        const nm = { id: uid(), name, src, hidden: false, pins: {} };
        state.maps.push(nm); ui.mapId = nm.id; save(); renderMaps(app);
        toast(src.length > 1500000 ? '🗺 Map added. It\'s a big picture — keep a backup!' : '🗺 Map added!');
      } catch (err) { toast("⚠️ That file isn't a picture I can read."); }
    };
    if (!m) return;
    app.querySelectorAll('[data-zoom]').forEach(b => b.onclick = () => { ui.mapZoom = +b.dataset.zoom; renderMaps(app); });
    $('#pinLoc').onchange = e => { ui.pinLoc = e.target.value; renderMaps(app); };
    $('#mapImg').onclick = e => {
      if (!ui.pinLoc) return;
      const r = e.target.getBoundingClientRect();
      const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10, y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
      m.pins[ui.pinLoc] = [Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y))];
      ui.pinSel = ui.pinLoc; ui.pinLoc = ''; save(); renderMaps(app); toast('📍 Pin placed!');
    };
    app.querySelectorAll('[data-pin]').forEach(b => b.onclick = e => { e.stopPropagation(); ui.pinSel = b.dataset.pin; renderMaps(app); });
    $('#mapHide').onclick = () => { m.hidden = !m.hidden; save(); renderMaps(app); };
    $('#mapRename').onclick = () => { const n = prompt('New name for this map:', m.name); if (n && n.trim()) { m.name = n.trim().slice(0, 60); save(); renderMaps(app); } };
    $('#mapDelete').onclick = () => {
      if (!confirm(`Delete the map "${m.name}"? Your places and NPCs stay — only the picture and its pins are removed.`)) return;
      state.maps = state.maps.filter(x => x !== m); ui.mapId = null; save(); renderMaps(app);
    };
    renderPinCard(m);
    app.querySelectorAll('[data-traveller]').forEach(b => b.onclick = e => { e.stopPropagation(); ui.npcId = b.dataset.traveller; ui.editing = false; go('npcs'); });
    const ed = $('#simDay'); if (ed) ed.onclick = () => { window.Market.endDay(); renderMaps(app); };
    app.querySelectorAll('[data-tgoto]').forEach(a => a.onclick = e => { e.preventDefault(); ui.npcId = a.dataset.tgoto; ui.editing = false; go('npcs'); });
    const sel = app.querySelector('.pin.sel'); if (sel && ui.mapZoom > 100) sel.scrollIntoView({ block: 'center', inline: 'center' });
  }
  function renderPinCard(m) {
    const box = $('#pinCard'), L = loc(ui.pinSel);
    if (!box) return;
    if (!L || !m.pins[L.id]) { box.innerHTML = '<p class="small muted" style="margin:10px 0 0">Click a pin to see who lives there.</p>'; return; }
    const people = state.npcs.filter(n => n.locationId === L.id).sort(byName);
    box.innerHTML = `<div class="field-view pin-card">
      <div class="row" style="justify-content:space-between"><div style="flex:1 1 200px">
        <h3 style="margin:0">${esc(L.name)} ${L.hidden ? '<span class="badge missing">🙈 secret</span>' : ''}</h3>
        <div class="small muted">${esc(L.type || '')}${L.region ? ' · ' + esc(L.region) : ''} · 💰 ${esc(labelOf(PRICE_LEVELS, L.priceMod))} · ⚔️ ${esc(labelOf(EXPOSURE, L.warExposure))}</div></div>
        <button class="btn-x" id="pinClose" title="Close">✕</button></div>
      ${L.notes ? `<p class="small prewrap">${esc(L.notes.length > 400 ? L.notes.slice(0, 400) + '…' : L.notes)}</p>` : ''}
      <ul class="members">${people.map(p => `<li>${avatar(p, 24)} <a href="#" data-goto="${p.id}">${esc(p.name)}</a> <span class="muted small">${esc(p.occupation || '')}</span></li>`).join('') || '<li class="muted small">No NPCs here yet.</li>'}</ul>
      <div class="small" style="margin:8px 0 4px"><b>⚔️ Possible enemies here</b> <button class="btn small" data-encounter="${L.id}">🎲 Roll encounter</button> <span data-encout="${L.id}"></span></div>
      <div>${enemyChips(L)}</div>
      <div class="row" style="justify-content:flex-start">
        <button class="btn small" id="pinNewNpc" style="flex:0">+ NPC here</button>
        <button class="btn small" id="pinPrices" style="flex:0">💰 Prices here</button>
        <button class="btn small" id="pinMove" style="flex:0">📍 Move pin</button>
        <button class="btn small danger" id="pinRemove" style="flex:0">Remove pin</button>
      </div></div>`;
    $('#pinClose').onclick = () => { ui.pinSel = null; renderMaps($('#app')); };
    wireEnemyChips(box);
    box.querySelectorAll('[data-goto]').forEach(a => a.onclick = e => { e.preventDefault(); ui.npcId = a.dataset.goto; ui.editing = false; go('npcs'); });
    $('#pinNewNpc').onclick = () => { ui.npcId = null; ui.draft = null; ui.locFilter = L.id; ui.editing = true; go('npcs'); };
    $('#pinPrices').onclick = () => { window.Market.setCity(L.id); go('market'); };
    $('#pinMove').onclick = () => { ui.pinLoc = L.id; renderMaps($('#app')); };
    $('#pinRemove').onclick = () => { delete m.pins[L.id]; ui.pinSel = null; save(); renderMaps($('#app')); };
  }
  function showOnMap(lid) {
    const m = state.maps.find(x => x.id === ui.mapId && x.pins[lid]) || state.maps.find(x => x.pins[lid]);
    if (!m) return false;
    ui.mapId = m.id; ui.pinSel = lid; ui.pinLoc = ''; go('maps'); return true;
  }

  // ================= FAMILY TREE =================
  // how many generations to show above the selected person (nobles: 5 by default)
  const isNobleNpc = n => n && n.factions.some(f => { const F = faction(f.id); return F && F.type === 'Noble house'; });
  const treeGens = () => ui.treeGens || (isNobleNpc(npc(ui.treeId)) ? 5 : 2);
  function renderTree(app) {
    if (!npc(ui.treeId)) ui.treeId = (npc(ui.npcId) || state.npcs.find(n => n.parents.length || n.spouses.length) || state.npcs[0] || {}).id || null;
    if (!state.npcs.length) { app.innerHTML = '<div class="panel empty">Add some NPCs first, then link them as family.</div>'; return; }
    app.innerHTML = `
      <div class="panel">
        <div class="row">
          <h2 style="margin:0;flex:0 1 auto">🌳 Family tree of</h2>
          <select id="treeSel" style="max-width:320px">${[...state.npcs].sort(byName).map(n => `<option value="${n.id}" ${n.id === ui.treeId ? 'selected' : ''}>${esc(n.name)}</option>`).join('')}</select>
          <label class="small muted" style="flex:0 1 auto;margin:0">Generations back
            <select id="treeGens" style="width:auto">${[1, 2, 3, 4, 5, 6].map(g => `<option ${g === treeGens() ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
          <button class="btn" id="treeEdit" style="flex:0">✏️ Edit family links</button>
        </div>
        <div class="legend"><span>Click a person to center the tree on them.</span>
          <span style="color:var(--gold)">■ selected</span><span style="color:#c58aa8">┅ spouse</span><span style="color:var(--red)">✝ dead</span></div>
        <div class="tree-wrap" id="treeWrap"></div>
      </div>`;
    $('#treeSel').onchange = e => { ui.treeId = e.target.value; renderTree(app); };
    $('#treeGens').onchange = e => { ui.treeGens = +e.target.value; renderTree(app); };
    $('#treeEdit').onclick = () => { ui.npcId = ui.treeId; ui.editing = false; go('npcs'); };
    drawTree($('#treeWrap'));
  }

  function drawTree(wrap) {
    const focus = npc(ui.treeId); if (!focus) return;
    const used = new Set();
    const take = ids => ids.filter(id => npc(id) && !used.has(id) && used.add(id));
    // build generations: grandparents, parents, (siblings + focus + spouses), children, grandchildren
    const focusRow = [];
    used.add(focus.id);
    const sibs = take(siblingsOf(focus.id).map(s => s.id));
    const spouses = take(focus.spouses);
    focusRow.push(...sibs, focus.id, ...spouses);
    // ancestors: one row per generation, as many as chosen
    const ancestorRows = [];
    let gen = [focus.id];
    for (let g = 0; g < treeGens(); g++) {
      const ps = take(gen.flatMap(id => npc(id).parents));
      if (!ps.length) break;
      const steps = g === 0 ? take(ps.flatMap(p => npc(p).spouses)) : []; // step-parents
      ancestorRows.unshift([...ps, ...steps]);
      gen = ps;
    }
    const kids = take([focus.id, ...spouses].flatMap(id => childrenOf(id).map(c => c.id)));
    const kidSpouses = take(kids.flatMap(k => npc(k).spouses));
    const grandkids = take(kids.concat(kidSpouses).flatMap(id => childrenOf(id).map(c => c.id)));
    const rows = [...ancestorRows, focusRow, [...kids, ...kidSpouses], grandkids].filter(r => r.length);

    const W = 160, H = 58, GX = 22, GY = 70, PAD = 24;
    const maxCols = Math.max(...rows.map(r => r.length));
    const width = Math.max(600, maxCols * (W + GX) - GX + PAD * 2);
    const height = rows.length * (H + GY) - GY + PAD * 2;
    const pos = {};
    rows.forEach((row, ri) => {
      const rowW = row.length * (W + GX) - GX, x0 = (width - rowW) / 2;
      row.forEach((id, ci) => { pos[id] = { x: x0 + ci * (W + GX), y: PAD + ri * (H + GY) }; });
    });

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', width); svg.setAttribute('height', height); svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const mk = (tag, attrs, parent = svg) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); parent.appendChild(el); return el; };

    // lines: parent -> child
    Object.keys(pos).forEach(id => {
      const p = npc(id);
      p.parents.forEach(pid => {
        if (!pos[pid]) return;
        const a = pos[pid], b = pos[id];
        const x1 = a.x + W / 2, y1 = a.y + H, x2 = b.x + W / 2, y2 = b.y, my = (y1 + y2) / 2;
        mk('path', { d: `M${x1},${y1} V${my} H${x2} V${y2}`, fill: 'none', stroke: '#8a7a5e', 'stroke-width': 1.6 });
      });
    });
    // spouse lines
    const drawn = new Set();
    Object.keys(pos).forEach(id => npc(id).spouses.forEach(sid => {
      const key = [id, sid].sort().join('|');
      if (!pos[sid] || drawn.has(key)) return; drawn.add(key);
      const a = pos[id], b = pos[sid];
      if (a.y === b.y) {
        const [l, r] = a.x < b.x ? [a, b] : [b, a];
        mk('line', { x1: l.x + W, y1: l.y + H / 2, x2: r.x, y2: r.y + H / 2, stroke: '#c58aa8', 'stroke-width': 2, 'stroke-dasharray': '5 4' });
      } else {
        mk('path', { d: `M${a.x + W / 2},${a.y + H / 2} L${b.x + W / 2},${b.y + H / 2}`, stroke: '#c58aa8', 'stroke-width': 1.5, 'stroke-dasharray': '5 4', fill: 'none', opacity: .6 });
      }
    }));
    // boxes
    Object.entries(pos).forEach(([id, p]) => {
      const n = npc(id), isFocus = id === focus.id, dead = n.status === 'Dead';
      const g = mk('g', { class: 'tree-node', transform: `translate(${p.x},${p.y})` });
      mk('rect', { width: W, height: H, rx: 10, fill: isFocus ? '#3d3220' : '#26201a', stroke: isFocus ? '#e0b354' : dead ? '#e2735f' : '#4a3f31', 'stroke-width': isFocus ? 2.5 : 1.5 }, g);
      let tx = W / 2;
      if (n.portrait) {
        const cid = 'clip-' + id;
        const cp = mk('clipPath', { id: cid }, g); mk('circle', { cx: 29, cy: H / 2, r: 21 }, cp);
        const im = mk('image', { x: 8, y: H / 2 - 21, width: 42, height: 42, 'clip-path': `url(#${cid})`, preserveAspectRatio: 'xMidYMid slice' }, g);
        im.setAttribute('href', n.portrait);
        tx = 56 + (W - 56) / 2;
      }
      const name = mk('text', { x: tx, y: 24, 'text-anchor': 'middle', fill: dead ? '#b3a58c' : '#efe6d4', 'font-size': 13, 'font-weight': 600, 'font-family': 'system-ui, sans-serif' }, g);
      const nm = (dead ? '✝ ' : '') + n.name;
      const nmax = n.portrait ? 14 : 21;
      name.textContent = nm.length > nmax ? nm.slice(0, nmax - 1) + '…' : nm; // textContent = safe, no HTML
      const sub = mk('text', { x: tx, y: 43, 'text-anchor': 'middle', fill: '#b3a58c', 'font-size': 11, 'font-family': 'system-ui, sans-serif' }, g);
      const st = [n.race, n.occupation].filter(Boolean).join(' · ');
      const smax = n.portrait ? 17 : 26;
      sub.textContent = st.length > smax ? st.slice(0, smax - 1) + '…' : st;
      const title = mk('title', {}, g); title.textContent = `${n.name}${loc(n.locationId) ? ' — ' + loc(n.locationId).name : ''}`;
      g.addEventListener('click', () => { ui.treeId = id; renderTree($('#app')); });
    });
    wrap.innerHTML = ''; wrap.appendChild(svg);
    if (rows.length === 1 && focusRow.length === 1) {
      const p = document.createElement('p'); p.className = 'muted small'; p.style.padding = '0 16px 12px'; p.style.textAlign = 'center';
      p.textContent = 'No family yet. Click "Edit family links" to add parents, children, a spouse or siblings.';
      wrap.appendChild(p);
    }
  }

  // ================= BACKUP / SETTINGS =================
  function renderSettings(app) {
    app.innerHTML = `
      <div class="panel stack" style="max-width:700px;margin-bottom:16px" id="cloudPanel"></div>
      <div class="panel stack" style="max-width:700px">
        <h2>💾 Backup your world</h2>
        <p>Your world is always saved <b>inside this web browser</b>${window.Cloud && window.Cloud.user ? ' <b>and</b> in the cloud' : ''}.
        A backup file is extra safety — download one now and then!</p>
        <div class="row">
          <button class="btn primary" id="exportBtn" style="flex:0">⬇️ Download backup</button>
          <label class="btn" style="flex:0;margin:0;color:var(--text)">⬆️ Load backup<input type="file" id="importFile" accept=".json,application/json" hidden></label>
        </div>
        <hr style="border-color:var(--line)">
        <h3>Danger zone</h3>
        <div class="row">
          <button class="btn danger" id="sampleBtn" style="flex:0">Reset to Frindeval (starting world)</button>
          <button class="btn danger" id="clearBtn" style="flex:0">Start with an empty world</button>
          <button class="btn danger" id="marketReset" style="flex:0">Reset market (war = 14 days ago)</button>
        </div>
        <p class="small muted">World: ${state.npcs.length} NPCs, ${state.locations.length} locations, ${state.factions.length} factions.</p>
      </div>`;
    $('#exportBtn').onclick = () => {
      const data = { ...state, market: window.Market._state(), exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `world-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Backup downloaded!');
    };
    $('#importFile').onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data.npcs) || !Array.isArray(data.locations)) throw new Error('bad file');
        if (!confirm(`Load this backup? It has ${data.npcs.length} NPCs and will REPLACE your current world.`)) return;
        if (data.market && Array.isArray(data.market.events)) localStorage.setItem('dnd-market-v1', JSON.stringify(data.market));
        delete data.market;
        state = normalize(data); save(); location.reload();
      } catch (err) { toast("⚠️ That file doesn't look like a World Keeper backup."); }
    };
    $('#sampleBtn').onclick = () => { if (confirm('Replace EVERYTHING with the starting Frindeval world? Your own changes will be lost.')) { state = sampleWorld(); save(); ui.npcId = ui.treeId = null; toast('Frindeval loaded.'); renderSettings(app); } };
    $('#clearBtn').onclick = () => { if (confirm('Delete ALL NPCs and locations? (Download a backup first!)')) { state = { version: 3, frindeval: WORLD_VERSION, npcs: [], locations: [], factions: [], roads: [], monsters: state.monsters || [], sim: { day: 0, log: [] }, maps: state.maps.map(m => ({ ...m, pins: {} })) }; save(); ui.npcId = ui.treeId = null; toast('Fresh, empty world.'); renderSettings(app); } };
    $('#marketReset').onclick = () => { if (confirm('Reset the market back to "war started 14 days ago"?')) { window.Market.reset(); toast('Market reset.'); } };
    renderCloudPanel();
  }

  // ================= NPC GENERATORS =================
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const R = {
    races: ['Human', 'Human', 'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling', 'Dragonborn'],
    first: {
      Human: ['Aldo', 'Bryn', 'Cora', 'Dain', 'Edda', 'Finn', 'Greta', 'Hal', 'Ilsa', 'Jory', 'Kara', 'Lenn', 'Mira', 'Nils', 'Orla', 'Pell', 'Rhea', 'Sten', 'Tamsin', 'Wren'],
      Elf: ['Aelar', 'Caelynn', 'Erevan', 'Ilyana', 'Lia', 'Naivara', 'Quarion', 'Sariel', 'Thamior', 'Valanthe'],
      Dwarf: ['Adrik', 'Dagna', 'Eberk', 'Gunnloda', 'Hlin', 'Kildrak', 'Mardred', 'Rurik', 'Vistra', 'Torbera'],
      Halfling: ['Andry', 'Bree', 'Cade', 'Eldon', 'Kithri', 'Lavinia', 'Merric', 'Nedda', 'Roscoe', 'Seraphina'],
      Gnome: ['Alston', 'Bimpnottin', 'Carlin', 'Ellyjobell', 'Frug', 'Nissa', 'Orryn', 'Roywyn', 'Wrenn', 'Zook'],
      'Half-Orc': ['Dench', 'Engong', 'Holg', 'Kansif', 'Myev', 'Ovak', 'Shautha', 'Thokk', 'Vola', 'Yevelda'],
      Tiefling: ['Akmenos', 'Bryseis', 'Damakos', 'Kallista', 'Lerissa', 'Mordai', 'Nemeia', 'Orianna', 'Skamos', 'Rieta'],
      Dragonborn: ['Arjhan', 'Biri', 'Donaar', 'Harann', 'Kava', 'Medrash', 'Sora', 'Thava', 'Torinn', 'Uadjit'],
    },
    last: ['Ashdown', 'Brightwater', 'Cobb', 'Dunmore', 'Fairweather', 'Greaves', 'Hollis', 'Marsh', 'Thorne', 'Wexley', 'Stonehill',
      'Goodbarrel', 'Tealeaf', 'Underbough', 'Ironfist', 'Galanodel', 'Amakiir', 'Kerrhylon', 'Quill', 'Rookwood'],
    age: { Human: [18, 70], 'Half-Elf': [20, 150], Elf: [100, 600], Dwarf: [40, 300], Halfling: [20, 120], Gnome: [40, 400], 'Half-Orc': [16, 60], Tiefling: [18, 90], Dragonborn: [15, 70] },
    jobs: ['Baker', 'Blacksmith', 'Innkeeper', 'Barmaid', 'Fishmonger', 'Herbalist', 'Town guard', 'Priest', 'Scribe', 'Fence', 'Stablehand',
      'Merchant', 'Farmer', 'Miller', 'Tailor', 'Carpenter', 'Bard', 'Gravedigger', 'Tax collector', 'Ferryman', 'Alchemist', 'Recruiting sergeant', 'Smuggler', 'Refugee'],
    looks: ['has a crooked nose and a booming laugh', 'is missing two fingers on the left hand', 'wears far too much perfume', 'has ink-stained fingers',
      'has a burn scar across one cheek', 'always wears a faded blue scarf', 'is unusually tall and stoops through doorways', 'has bright, nervous eyes',
      'is covered in flour', 'has a soldier\'s posture'],
    manner: ['Talks very fast when nervous.', 'Never makes eye contact.', 'Calls everyone "friend".', 'Hums old war songs.', 'Laughs at their own jokes.',
      'Whispers, as if someone is listening.', 'Is extremely polite — suspiciously so.', 'Complains about prices constantly.', 'Quotes scripture at odd moments.',
      'Bites their nails.'],
    wants: ['Wants to get their family out of town before the war arrives.', 'Wants to get rich selling to the army.', 'Wants revenge on a local noble.',
      'Wants to find a missing brother who joined the army.', 'Wants a quiet life, and nobody will give them one.', 'Wants to be famous.',
      'Wants to pay off a debt to dangerous people.'],
    secrets: ['Is secretly a spy for the enemy.', 'Deserted from the army and is hiding under a false name.', 'Hoards food in the cellar while neighbours go hungry.',
      'Owes 200 gp to the thieves\' guild.', 'Knows a hidden tunnel under the town walls.', 'Is in love with someone they should not be.',
      'Sells watered-down healing potions.', 'Witnessed a murder and is too scared to tell.', 'Is the true heir of a fallen noble house.'],
  };
  function randomPerson(race, opts = {}) {
    race = race || pick(R.races);
    const firsts = R.first[race] || R.first.Human;
    const [lo, hi] = opts.ageRange || R.age[race] || R.age.Human;
    const look = pick(R.looks);
    return {
      name: `${pick(firsts)} ${opts.last || pick(R.last)}`, race, gender: opts.gender || pick(['Male', 'Female']),
      age: String(lo + Math.floor(Math.random() * Math.max(1, hi - lo))), occupation: opts.job || pick(R.jobs),
      description: `${look[0].toUpperCase()}${look.slice(1)}. ${pick(R.manner)}`,
    };
  }
  function randomNpc(withFamily) {
    const p = randomPerson();
    const fields = { ...p, alignment: pick(ALIGNMENTS.slice(0, 9)), status: 'Alive', description: `${p.description} ${pick(R.wants)}`, notes: pick(R.secrets),
      locationId: state.locations.length ? pick(state.locations).id : '', known: false };
    const relatives = [];
    if (withFamily) {
      const last = p.name.split(' ').slice(1).join(' ');
      const age = parseInt(p.age, 10), [lo, hi] = R.age[p.race] || R.age.Human;
      relatives.push({ relation: 'spouse', ...randomPerson(p.race, { last, gender: p.gender === 'Male' ? 'Female' : 'Male', ageRange: [Math.max(lo, age - 8), Math.min(hi, age + 8)] }) });
      const kids = 1 + Math.floor(Math.random() * 3);
      const kidMax = Math.max(lo / 4, age - lo);
      for (let i = 0; i < kids; i++) relatives.push({ relation: 'child', ...randomPerson(p.race, { last, ageRange: [1, Math.max(2, kidMax)], job: 'Child' }) });
    }
    return { fields, relatives, ai: false };
  }
  // Turn a "relatives" list from a generator into real NPCs linked to the new NPC
  function createRelatives(main, rels) {
    let spouse = null;
    const made = rels.map(r => {
      const rel = { id: uid(), parents: [], spouses: [], siblings: [], bonds: [], factions: [], portrait: '', alignment: 'True Neutral', status: 'Alive', notes: '',
        known: false, locationId: main.locationId, name: String(r.name || 'Unnamed').slice(0, 80), race: String(r.race || '').slice(0, 40),
        gender: String(r.gender || '').slice(0, 30), age: String(r.age || '').slice(0, 20), occupation: String(r.occupation || '').slice(0, 60),
        description: String(r.description || '').slice(0, 4000) };
      state.npcs.push(rel);
      if (r.relation === 'spouse' && !spouse) spouse = rel;
      return [r.relation, rel];
    });
    made.forEach(([relation, rel]) => {
      if (relation === 'spouse') addRelation(main.id, 'spouse', rel.id);
      else if (relation === 'child') { addRelation(main.id, 'child', rel.id); if (spouse) addRelation(spouse.id, 'child', rel.id); }
      else if (relation === 'parent') addRelation(main.id, 'parent', rel.id);
      else addRelation(main.id, 'sibling', rel.id);
    });
  }

  function renderAiPanel() {
    const box = $('#npcDetail'); if (!box) return;
    const ready = window.Cloud && window.Cloud.configured && window.Cloud.user;
    box.innerHTML = `
      <h2>🤖 Ask the AI for an NPC</h2>
      ${ready ? '' : `<div class="field-view secret small">The AI helper needs the cloud (Phase 3). ${window.Cloud && window.Cloud.configured
        ? 'Log in first in the <a href="#cloud">☁️ Cloud</a> tab.' : 'Follow <b>SETUP.md</b> to switch it on. Until then, try 🎲 Random NPC — it works without internet.'}</div>`}
      <form id="aiForm" class="stack" autocomplete="off" style="margin-top:12px">
        <div><label>Describe who you want</label>
          <textarea name="idea" maxlength="600" placeholder="e.g. a nervous tavern keeper who is secretly hiding an enemy soldier in the cellar"></textarea></div>
        <label class="check"><input type="checkbox" name="withFamily" checked> 👪 Give them a family too</label>
        <div class="row" style="justify-content:flex-end">
          <button type="button" class="btn" id="aiCancel" style="flex:0">Cancel</button>
          <button type="submit" class="btn primary" id="aiGo" style="flex:0" ${ready ? '' : 'disabled'}>🤖 Create NPC</button>
        </div>
        <p class="small muted">Takes about 10–30 seconds. You can check and change everything before it's saved.</p>
      </form>`;
    $('#aiCancel').onclick = () => renderNpcDetail();
    $('#aiForm').onsubmit = async e => {
      e.preventDefault();
      const btn = $('#aiGo'); btn.disabled = true; btn.textContent = '🧙 Thinking…';
      const fd = new FormData(e.target);
      const fw = window.Market._state();
      try {
        const out = await window.Cloud.generateNpc({
          idea: String(fd.get('idea') || '').trim(), withFamily: e.target.withFamily.checked,
          locations: state.locations.map(l => l.name),
          worldNote: fw.events.some(ev => ev.level > 0) ? 'A war started recently. Prices are rising and refugees are arriving.' : 'The realm is at peace.',
        });
        const L = state.locations.find(l => l.name.toLowerCase() === String(out.location || '').toLowerCase());
        ui.draft = {
          ai: true,
          fields: { name: out.name, race: out.race, gender: out.gender, age: String(out.age || ''), occupation: out.occupation,
            alignment: ALIGNMENTS.includes(out.alignment) ? out.alignment : 'True Neutral', status: 'Alive',
            description: out.description, notes: out.secret, locationId: L ? L.id : '', known: false },
          relatives: Array.isArray(out.relatives) ? out.relatives.slice(0, 6) : [],
        };
        ui.editing = true; renderNpcDetail();
      } catch (err) {
        toast('⚠️ ' + err.message); btn.disabled = false; btn.textContent = '🤖 Create NPC';
      }
    };
  }

  // ================= CLOUD (login, sync, player link) =================
  function renderCloudPanel() {
    const box = $('#cloudPanel'); if (!box) return;
    const C = window.Cloud;
    if (!C || !C.configured) {
      box.innerHTML = `
        <h2>☁️ Cloud — not switched on yet</h2>
        <p>Right now your world only lives in this browser. Switch on the cloud to:</p>
        <ul><li>📱💻 use the same world on your phone and laptop</li><li>🔐 log in so only you can change it</li>
        <li>🎭 send your players a link to a <b>player view</b> (no secrets!)</li><li>🤖 let the AI write NPCs for you</li></ul>
        <p>Follow the steps in <b>SETUP.md</b> in your GitHub repository (about 20 minutes, free).</p>`;
      return;
    }
    if (!C.user) {
      box.innerHTML = `
        <h2>☁️ Log in</h2>
        <p class="small muted">Log in to save your world in the cloud and use it on all your devices.</p>
        <form id="loginForm" class="stack" autocomplete="on">
          <div><label>Email</label><input name="email" type="email" required autocomplete="email"></div>
          <div><label>Password (at least 8 characters)</label><input name="password" type="password" required minlength="8" autocomplete="current-password"></div>
          <div class="row" style="justify-content:flex-start">
            <button class="btn primary" type="submit" style="flex:0">Log in</button>
            <button class="btn" type="button" id="signupBtn" style="flex:0">Create account</button>
          </div>
        </form>`;
      const form = $('#loginForm');
      const creds = () => ({ email: form.email.value.trim(), password: form.password.value });
      form.onsubmit = async e => {
        e.preventDefault();
        try { const c = creds(); await C.signIn(c.email, c.password); toast('Welcome back!'); setTimeout(() => renderSettings($('#app')), 300); }
        catch (err) { toast('⚠️ ' + err.message); }
      };
      $('#signupBtn').onclick = async () => {
        if (!form.reportValidity()) return;
        try {
          const c = creds(); const r = await C.signUp(c.email, c.password);
          toast(r === 'check-email' ? '📧 Check your email and click the link, then log in here.' : 'Account created!');
          setTimeout(() => renderSettings($('#app')), 300);
        } catch (err) { toast('⚠️ ' + err.message); }
      };
      return;
    }
    const link = C.playerLink();
    box.innerHTML = `
      <h2>☁️ Cloud</h2>
      <p>Logged in as <b>${esc(C.user.email)}</b> · <span id="cloudState">${esc(syncText(C.status, C.statusMsg))}</span></p>
      <div class="row" style="justify-content:flex-start">
        <button class="btn" id="syncNow" style="flex:0">🔄 Sync now</button>
        <button class="btn" id="logout" style="flex:0">Log out</button>
      </div>
      <hr style="border-color:var(--line)">
      <h3>🎭 Player view</h3>
      <p class="small">Send this link to your players. They see NPCs marked <b>👁 Players have met</b>, places that aren't secret, public factions and the market.
      They <b>never</b> see secret notes, alignments, hidden NPCs or secret relationships. It updates when you save.</p>
      ${link ? `<div class="row"><input id="playerLink" readonly value="${esc(link)}" style="flex:3 1 260px">
        <button class="btn primary" id="copyLink" style="flex:0">📋 Copy</button>
        <a class="btn" href="${esc(link)}" target="_blank" rel="noopener" style="flex:0;text-decoration:none">Open</a></div>
        <p class="small muted">Link leaked to the wrong people? <button class="btn small danger" id="newLink">Make a new link</button> (the old one stops working)</p>`
        : '<p class="small muted">Your link appears after the first sync.</p>'}
      <p class="small muted">${state.npcs.filter(n => n.known).length} of ${state.npcs.length} NPCs are visible to players.</p>`;
    $('#syncNow').onclick = () => C.push();
    $('#logout').onclick = async () => { await C.signOut(); toast('Logged out. Your world stays on this device.'); renderSettings($('#app')); };
    const cp = $('#copyLink');
    if (cp) cp.onclick = async () => {
      try { await navigator.clipboard.writeText(link); toast('📋 Link copied!'); } catch (e) { $('#playerLink').select(); toast('Select the link and copy it.'); }
    };
    const nl = $('#newLink');
    if (nl) nl.onclick = async () => {
      if (!confirm('Make a new player link? The old link will stop working.')) return;
      try { await C.regenerateLink(); toast('New link made.'); renderSettings($('#app')); } catch (e) { toast('⚠️ ' + e.message); }
    };
  }

  function syncText(s, msg) {
    return ({ local: '', 'signed-out': '☁️ Not logged in', pending: '⏳ Saving…', syncing: '🔄 Syncing…',
      synced: '☁️ Saved to cloud', error: '⚠️ Not synced' }[s] || '') + (s === 'error' && msg ? ' — ' + msg : '');
  }
  function renderSync(s, msg) {
    const el = $('#syncStatus'); if (!el) return;
    el.textContent = syncText(s, '');
    el.title = msg || '';
    el.className = 'sync ' + s;
    el.hidden = s === 'local';
    const cs = $('#cloudState'); if (cs) cs.textContent = syncText(s, msg);
    // the player link only exists after the first upload — show it as soon as it's ready
    if (s === 'synced' && $('#cloudPanel') && !$('#playerLink') && window.Cloud && window.Cloud.user && window.Cloud.playerLink()) renderCloudPanel();
  }

  // The player-safe copy: ONLY what players are allowed to see. No secrets ever go in here.
  const SECRET_BONDS = ['Secretly hates', 'Is secretly hated by'];
  function buildPlayerData() {
    const known = state.npcs.filter(n => n.known), kid = new Set(known.map(n => n.id));
    const locations = state.locations.filter(l => !l.hidden)
      .map(({ id, name, type, region, priceMod, warExposure }) => ({ id, name, type, region, priceMod, warExposure }));
    const lid = new Set(locations.map(l => l.id));
    const factions = state.factions.filter(f => f.public).map(({ id, name, type, color }) => ({ id, name, type, color }));
    const fid = new Set(factions.map(f => f.id));
    const m = window.Market._state();
    return {
      version: 1,
      npcs: known.map(n => ({
        travelTo: n.travel && n.travel.road && lid.has(n.travel.road.to) ? n.travel.road.to : null,
        id: n.id, name: n.name, race: n.race, gender: n.gender, age: n.age, occupation: n.occupation, status: n.status,
        description: n.description, portrait: n.portrait, locationId: lid.has(n.locationId) ? n.locationId : null,
        parents: n.parents.filter(x => kid.has(x)), spouses: n.spouses.filter(x => kid.has(x)), siblings: n.siblings.filter(x => kid.has(x)),
        bonds: n.bonds.filter(b => kid.has(b.id) && !SECRET_BONDS.includes(b.type)).map(b => ({ id: b.id, type: b.type })),
        factions: n.factions.filter(f => fid.has(f.id)).map(f => ({ id: f.id, rank: f.rank })),
      })),
      locations, factions,
      maps: state.maps.filter(mp => !mp.hidden).map(mp => ({ id: mp.id, name: mp.name, src: mp.src,
        pins: Object.fromEntries(Object.entries(mp.pins).filter(([lid]) => lid && locations.some(l => l.id === lid))) })),
      market: { seed: m.seed, daysAdvanced: m.daysAdvanced, events: m.events, customItems: m.customItems, hiddenItems: m.hiddenItems || [], cityId: lid.has(m.cityId) ? m.cityId : null },
    };
  }
  window.World.buildPlayerData = buildPlayerData;
  window.World.showOnMapByName = name => { const L = state.locations.find(l => l.name === name); if (!L || !showOnMap(L.id)) toast('That place has no pin on any map.'); };

  // A newer world arrived from the cloud (e.g. you edited on your phone)
  function applyRemote(data) {
    if (!data || !Array.isArray(data.npcs)) return;
    if (data.market && Array.isArray(data.market.events)) {
      try { localStorage.setItem('dnd-market-v1', JSON.stringify(data.market)); } catch (e) { /* ignore */ }
      window.Market.reload();
    }
    const d = { ...data }; delete d.market;
    state = normalize(d); saveLocal();
    if (migratedToFrindeval) { migratedToFrindeval = false; save(); }
    if (!ui.editing) route();
  }

  route();
  window.Market.onChange = () => { if (window.Cloud) window.Cloud.changed(); };
  // every "🌙 End the day" in the market also moves the travellers
  window.Market.onDayEnd = () => {
    const ev = simulateDay();
    const arrived = ev.filter(e => e.text.includes(' arrived in ')).length;
    if (ev.length) toast(`🐎 ${ev.length - arrived} set off, ${arrived} arrived. See 🗺 Maps for the travel log.`);
  };
  if (window.Cloud) {
    window.Cloud.onStatus(renderSync);
    window.Cloud.init({ getPayload: () => ({ data: { ...state, market: window.Market._state() }, player: buildPlayerData() }), applyRemote })
      .catch(e => renderSync('error', e.message));
  }
})();
