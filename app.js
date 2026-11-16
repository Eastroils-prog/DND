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
    'Is secretly hated by': 'Secretly hates',
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
  function sampleWorld() {
    const L = (name, type, region, notes, priceMod = 1, warExposure = 1) => ({ id: uid(), name, type, region, notes, priceMod, warExposure });
    const oak = L('Oakvale', 'Village', 'The Green Marches', 'A quiet farming village near the border. Now full of refugees.', 0.9, 1.3);
    const inn = L('The Prancing Griffin', 'Tavern / Inn', 'Oakvale', 'Best (and only) inn in Oakvale.', 1, 1.3);
    const keep = L('Stonewatch Keep', 'Castle / Keep', 'The Green Marches', 'Border fortress. The war started here.', 1.3, 1.7);
    const port = L('Saltmere', 'City', 'The Southern Coast', 'Rich trading port far from the fighting.', 1.15, 0.6);
    const N = (o) => ({ id: uid(), race: 'Human', gender: '', age: '', occupation: '', alignment: 'True Neutral', status: 'Alive',
      description: '', notes: '', parents: [], spouses: [], siblings: [], bonds: [], factions: [], portrait: '', locationId: null, ...o });
    const durgan = N({ name: 'Old Durgan Ironfoot', race: 'Dwarf', gender: 'Male', age: '312', occupation: 'Retired blacksmith', status: 'Dead', locationId: oak.id, description: 'Founded the Ironfoot forge.' });
    const brom = N({ name: 'Brom Ironfoot', race: 'Dwarf', gender: 'Male', age: '160', occupation: 'Blacksmith', alignment: 'Lawful Good', locationId: oak.id, description: 'Gruff but kind. Working day and night making swords for the war.', notes: 'Secretly sells weapons to both sides.' });
    const hilda = N({ name: 'Hilda Ironfoot', race: 'Dwarf', gender: 'Female', age: '150', occupation: 'Brewer', alignment: 'Neutral Good', locationId: inn.id, description: 'Brews the strongest beer in the Marches.' });
    const torin = N({ name: 'Torin Ironfoot', race: 'Dwarf', gender: 'Male', age: '45', occupation: 'Soldier', alignment: 'Chaotic Good', locationId: keep.id, description: 'Joined the army two weeks ago.' });
    const mara = N({ name: 'Mara Ironfoot', race: 'Dwarf', gender: 'Female', age: '38', occupation: 'Apprentice smith', locationId: oak.id });
    const elsa = N({ name: 'Elsa Brightwater', race: 'Half-Elf', gender: 'Female', age: '61', occupation: 'Innkeeper', alignment: 'Neutral Good', locationId: inn.id, description: 'Knows every rumour in town.', notes: 'Is a spy for the queen.' });
    brom.parents = [durgan.id];
    brom.spouses = [hilda.id]; hilda.spouses = [brom.id];
    torin.parents = [brom.id, hilda.id]; mara.parents = [brom.id, hilda.id];
    const vex = N({ name: 'Lord Aldric Vex', gender: 'Male', age: '52', occupation: 'Grain merchant', alignment: 'Neutral Evil', locationId: port.id,
      description: 'Smiling, perfumed, always counting.', notes: 'Is hoarding grain to drive up the price of bread during the war.' });
    const smiths = { id: uid(), name: 'The Iron Brotherhood', type: 'Guild', color: '#c98a3d', hqId: oak.id, goals: 'Keep the forges burning and the prices fair.', notes: '' };
    const eyes = { id: uid(), name: "The Queen's Eyes", type: 'Secret society', color: '#7a6ad8', hqId: null, goals: 'Watch everyone. Report everything.', notes: 'Nobody knows who leads it.' };
    const guild = { id: uid(), name: 'Saltmere Trading Company', type: 'Merchant company', color: '#3d9a8b', hqId: port.id, goals: 'Profit from the war.', notes: '' };
    brom.factions = [{ id: smiths.id, rank: 'Guildmaster' }]; mara.factions = [{ id: smiths.id, rank: 'Apprentice' }];
    elsa.factions = [{ id: eyes.id, rank: 'Agent' }]; vex.factions = [{ id: guild.id, rank: 'Senior partner' }];
    const world = { version: 2, locations: [oak, inn, keep, port], factions: [smiths, eyes, guild], npcs: [durgan, brom, hilda, torin, mara, elsa, vex] };
    const link = (a, t, b) => { a.bonds.push({ id: b.id, type: t, note: '' }); b.bonds.push({ id: a.id, type: BONDS[t], note: '' }); };
    link(elsa, 'Best friend', hilda); link(mara, 'Mentor', brom); link(brom, 'Enemy', vex); link(elsa, 'Secretly hates', vex);
    return world;
  }
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
    s.factions.forEach(f => { if (!/^#[0-9a-fA-F]{6}$/.test(f.color)) f.color = '#c98a3d'; });
    return s;
  }
  function load() {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* ignore */ }
    return sampleWorld();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast('⚠️ Could not save (browser storage full or blocked)'); }
  }
  let state = load(); save();

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
  const addUnique = (arr, v) => { if (!arr.includes(v)) arr.push(v); };
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
  const ui = { npcId: null, editing: false, search: '', locFilter: '', treeId: null, editLocId: null, editFacId: null, facId: null };
  function route() {
    const tab = (location.hash || '#npcs').slice(1).split('/')[0];
    document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    if (tab !== 'market') window.Market.stop();
    const app = $('#app');
    ({ npcs: renderNpcs, locations: renderLocations, factions: renderFactions, tree: renderTree, market: () => window.Market.render(app), settings: renderSettings }[tab] || renderNpcs)(app);
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
          <div class="stack" style="margin-top:12px">
            <input id="npcSearch" placeholder="🔍 Search name, job, race…" value="${esc(ui.search)}">
            <select id="npcLoc"><option value="">📍 All locations</option><option value="__none" ${ui.locFilter === '__none' ? 'selected' : ''}>Unknown / wandering</option>
              ${[...state.locations].sort(byName).map(l => `<option value="${l.id}" ${ui.locFilter === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
          </div>
          <ul class="item-list" id="npcList"></ul>
        </aside>
        <section class="panel" id="npcDetail"></section>
      </div>`;
    $('#newNpc').onclick = () => { ui.npcId = null; ui.editing = true; renderNpcDetail(); };
    $('#npcSearch').oninput = e => { ui.search = e.target.value; renderNpcList(); };
    $('#npcLoc').onchange = e => { ui.locFilter = e.target.value; renderNpcList(); };
    renderNpcList(); renderNpcDetail();
  }

  function renderNpcList() {
    const q = ui.search.trim().toLowerCase();
    const list = state.npcs.filter(n =>
      (!q || [n.name, n.occupation, n.race].some(v => (v || '').toLowerCase().includes(q))) &&
      (!ui.locFilter || (ui.locFilter === '__none' ? !loc(n.locationId) : n.locationId === ui.locFilter))
    ).sort(byName);
    $('#npcList').innerHTML = list.length ? list.map(n => `
      <li data-id="${n.id}" class="li-flex ${n.id === ui.npcId ? 'sel' : ''}">${avatar(n)}<div>
        <div>${esc(n.name)} ${n.status !== 'Alive' ? `<span class="badge ${n.status === 'Dead' ? 'dead' : 'missing'}">${esc(n.status)}</span>` : ''}</div>
        <div class="sub">${esc([n.race, n.occupation].filter(Boolean).join(' · '))} ${loc(n.locationId) ? '· 📍 ' + esc(loc(n.locationId).name) : ''}</div>
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
        ${n.portrait ? '<button class="btn small danger" id="rmPortrait" style="flex:0">Remove picture</button>' : ''}
      </div>
      <div class="stack" style="margin-top:14px">
        <div class="field-view"><div class="k">📍 Location</div>${l ? `<a href="#" id="gotoLoc">${esc(l.name)}</a> <span class="muted small">${esc(l.type || '')}${l.region ? ' · ' + esc(l.region) : ''}</span>` : '<span class="muted">Unknown / wandering</span>'}</div>
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
      </div>`;
    $('#printPlayer').onclick = () => printNpcs([n], false);
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
    n = n || { name: '', race: 'Human', gender: '', age: '', occupation: '', alignment: 'True Neutral', status: 'Alive', locationId: ui.locFilter && ui.locFilter !== '__none' ? ui.locFilter : '', description: '', notes: '' };
    box.innerHTML = `
      <h2>${isNew ? '✨ New NPC' : '✏️ Edit ' + esc(n.name)}</h2>
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
        <div class="row" style="justify-content:flex-end">
          <button type="button" class="btn" id="cancelNpc" style="flex:0">Cancel</button>
          <button type="submit" class="btn primary" style="flex:0">💾 Save NPC</button>
        </div>
      </form>`;
    $('#cancelNpc').onclick = () => { ui.editing = false; renderNpcDetail(); };
    $('#npcForm').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries());
      Object.keys(f).forEach(k => f[k] = String(f[k]).trim());
      if (!f.name) return toast('Your NPC needs a name!');
      f.locationId = f.locationId || null;
      if (isNew) {
        const created = { id: uid(), parents: [], spouses: [], siblings: [], bonds: [], factions: [], portrait: '', ...f };
        state.npcs.push(created); ui.npcId = created.id;
        toast(`✨ ${f.name} joins your world!`);
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
    const unplaced = state.npcs.filter(n => !loc(n.locationId));
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
            <ul>${people.map(p => `<li><a href="#" data-goto="${p.id}">${esc(p.name)}</a> <span class="muted small">${esc(p.occupation || '')}</span></li>`).join('') || '<li class="muted small">nobody yet</li>'}</ul>
            <div class="small muted">💰 ${esc(labelOf(PRICE_LEVELS, L.priceMod))} prices · ⚔️ ${esc(labelOf(EXPOSURE, L.warExposure))}</div>
            <div class="row" style="margin-top:8px">
              <button class="btn small" data-prices="${L.id}">💰 Prices here</button>
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
      state.npcs.forEach(n => { if (n.locationId === L.id) n.locationId = null; });
      if (ui.editLocId === L.id) ui.editLocId = null;
      save(); toast(`${L.name} was removed.`); renderLocations(app);
    });
    app.querySelectorAll('[data-goto]').forEach(a => a.onclick = e => { e.preventDefault(); ui.npcId = a.dataset.goto; ui.editing = false; go('npcs'); });
    app.querySelectorAll('[data-prices]').forEach(b => b.onclick = () => { window.Market.setCity(b.dataset.prices); go('market'); });
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
            <div class="small muted">${esc(F.type)}${hq ? ' · 🏠 ' + esc(hq.name) : ''}</div>
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

  // ================= FAMILY TREE =================
  function renderTree(app) {
    if (!npc(ui.treeId)) ui.treeId = (npc(ui.npcId) || state.npcs.find(n => n.parents.length || n.spouses.length) || state.npcs[0] || {}).id || null;
    if (!state.npcs.length) { app.innerHTML = '<div class="panel empty">Add some NPCs first, then link them as family.</div>'; return; }
    app.innerHTML = `
      <div class="panel">
        <div class="row">
          <h2 style="margin:0;flex:0 1 auto">🌳 Family tree of</h2>
          <select id="treeSel" style="max-width:320px">${[...state.npcs].sort(byName).map(n => `<option value="${n.id}" ${n.id === ui.treeId ? 'selected' : ''}>${esc(n.name)}</option>`).join('')}</select>
          <button class="btn" id="treeEdit" style="flex:0">✏️ Edit family links</button>
        </div>
        <div class="legend"><span>Click a person to center the tree on them.</span>
          <span style="color:var(--gold)">■ selected</span><span style="color:#c58aa8">┅ spouse</span><span style="color:var(--red)">✝ dead</span></div>
        <div class="tree-wrap" id="treeWrap"></div>
      </div>`;
    $('#treeSel').onchange = e => { ui.treeId = e.target.value; renderTree(app); };
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
    const parents = take(focus.parents);
    const grand = take(parents.flatMap(p => npc(p).parents));
    // spouses of parents who aren't already parents (step-parents)
    const parentSpouses = take(parents.flatMap(p => npc(p).spouses));
    const kids = take([focus.id, ...spouses].flatMap(id => childrenOf(id).map(c => c.id)));
    const kidSpouses = take(kids.flatMap(k => npc(k).spouses));
    const grandkids = take(kids.concat(kidSpouses).flatMap(id => childrenOf(id).map(c => c.id)));
    const rows = [grand, [...parents, ...parentSpouses], focusRow, [...kids, ...kidSpouses], grandkids].filter(r => r.length);

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
      <div class="panel stack" style="max-width:700px">
        <h2>⚙️ Backup your world</h2>
        <p>Your world is saved <b>inside this web browser</b> on this device. If you clear your browser data or switch devices,
        it won't be there. So download a backup now and then!</p>
        <div class="row">
          <button class="btn primary" id="exportBtn" style="flex:0">⬇️ Download backup</button>
          <label class="btn" style="flex:0;margin:0;color:var(--text)">⬆️ Load backup<input type="file" id="importFile" accept=".json,application/json" hidden></label>
        </div>
        <hr style="border-color:var(--line)">
        <h3>Danger zone</h3>
        <div class="row">
          <button class="btn danger" id="sampleBtn" style="flex:0">Reset to example world</button>
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
    $('#sampleBtn').onclick = () => { if (confirm('Replace everything with the example world?')) { state = sampleWorld(); save(); ui.npcId = ui.treeId = null; toast('Example world loaded.'); renderSettings(app); } };
    $('#clearBtn').onclick = () => { if (confirm('Delete ALL NPCs and locations? (Download a backup first!)')) { state = { version: 2, npcs: [], locations: [], factions: [] }; save(); ui.npcId = ui.treeId = null; toast('Fresh, empty world.'); renderSettings(app); } };
    $('#marketReset').onclick = () => { if (confirm('Reset the market back to "war started 14 days ago"?')) { window.Market.reset(); toast('Market reset.'); } };
  }

  route();
})();
