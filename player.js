/* =========================================================
   PLAYER PAGE (the "dining room")
   Players must log in. They can only:
     1. see the NPCs the DM marked "Players have met", and
     2. add NPCs they meet (similar ones are linked automatically),
     3. look at the maps (pictures only — no pins, no place names).
   They never receive secrets: the server only hands out the player-safe copy.
   ========================================================= */
(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeImg = s => (typeof s === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s)) ? s : '';
  const safeMapSrc = s => (typeof s === 'string' && /^maps\/[\w.-]+\.(jpg|jpeg|png|webp)$/.test(s)) ? s : safeImg(s);
  const safeColor = c => /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#c98a3d';
  const byName = (a, b) => String(a.name).localeCompare(String(b.name));
  const app = $('#app'), C = window.Cloud;
  let toastTimer;
  const toast = (msg, html) => { const t = $('#toast'); if (html) t.innerHTML = msg; else t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 6000); };

  let world = { npcs: [], factions: [], maps: [], owner: null }, notes = [], me = { name: '', isAdmin: false };
  const ui = { search: '', mapId: null, zoom: 100, adding: false };

  // ---------- login ----------
  function renderLogin(msg) {
    document.body.classList.add('locked');
    app.innerHTML = `<div class="panel login-card">
      <h2>🔐 Log in</h2>
      <p class="small muted">Use the username and password your Dungeon Master gave you.</p>
      ${msg ? `<p class="small">⚠️ ${esc(msg)}</p>` : ''}
      <form id="loginForm" class="stack" autocomplete="on">
        <div><label>Username</label><input name="user" required autocomplete="username" placeholder="e.g. gustavs"></div>
        <div><label>Password</label><input name="pass" type="password" required autocomplete="current-password"></div>
        <button class="btn primary" type="submit">Log in</button>
      </form></div>`;
    const f = $('#loginForm');
    f.onsubmit = async e => {
      e.preventDefault();
      const b = f.querySelector('button'); b.disabled = true; b.textContent = 'Logging in…';
      try { await C.signIn(f.elements.namedItem('user').value, f.elements.namedItem('pass').value); }
      catch (err) { renderLogin(/invalid/i.test(err.message) ? 'Wrong username or password.' : err.message); }
    };
  }

  async function start() {
    if (!C || !C.configured) { app.innerHTML = '<div class="panel empty">🔒 This page is not connected to a world yet. Ask your Dungeon Master.</div>'; return; }
    C.onStatus(async s => {
      if (s === 'loading') return;
      if (!C.user) { $('#logoutBtn').hidden = true; $('#who').textContent = ''; return renderLogin(); }
      if (s === 'player' || s === 'admin-view') await enter();
    });
    await C.init({ noSync: true, getPayload: () => ({}), applyRemote: () => {} });
  }
  let entered = false;
  async function enter() {
    if (entered) return; entered = true;
    me.isAdmin = C.role !== 'player';
    me.name = (C.user.user_metadata && C.user.user_metadata.name) || C.user.email.split('@')[0];
    $('#who').textContent = me.isAdmin ? '👑 DM preview' : `🧑 ${me.name}`;
    const lo = $('#logoutBtn'); lo.hidden = false; lo.onclick = async () => { await C.signOut(); location.reload(); };
    document.body.classList.remove('locked');
    await load();
    setInterval(load, 60000); // check for news every minute
    window.addEventListener('hashchange', route);
  }

  async function load() {
    try {
      const data = me.isAdmin ? await C.myOwnPlayerData() : await C.myPlayerWorld();
      if (!data) { app.innerHTML = '<div class="panel empty">Your Dungeon Master has not shared the world yet.</div>'; return; }
      world = {
        owner: data.owner, updated_at: data.updated_at,
        npcs: (Array.isArray(data.npcs) ? data.npcs : []).map(n => ({ ...n, portrait: safeImg(n.portrait),
          parents: n.parents || [], spouses: n.spouses || [], siblings: n.siblings || [], bonds: n.bonds || [], factions: n.factions || [] })),
        factions: (Array.isArray(data.factions) ? data.factions : []).map(f => ({ ...f, color: safeColor(f.color) })),
        maps: (Array.isArray(data.maps) ? data.maps : []).map(m => ({ id: String(m.id), name: String(m.name || 'Map'), src: safeMapSrc(m.src) })).filter(m => m.src),
      };
      notes = await C.listPlayerNpcs(world.owner);
      if (!ui.adding) route();
    } catch (e) { toast('⚠️ Could not load: ' + e.message); }
  }

  const npc = id => world.npcs.find(n => n.id === id);
  const fac = id => world.factions.find(f => f.id === id);
  const avatar = (n, size) => n.portrait
    ? `<img class="avatar" src="${esc(n.portrait)}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="avatar ph" style="width:${size}px;height:${size}px;font-size:${size * 0.45}px">${esc((n.name || '?').trim()[0] || '?')}</span>`;

  function route() {
    const tab = (location.hash || '#people').slice(1);
    document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    if (tab === 'maps') return renderMaps();
    renderPeople();
  }

  // ---------- known NPCs + player notes ----------
  // A player note is linked to a known NPC (linked_npc_id = NPC id), or to another player's note ("p:<id>"), or stands alone.
  const rootOf = p => { let cur = p, seen = 0; while (cur && cur.linked_npc_id && cur.linked_npc_id.startsWith('p:') && seen++ < 10) { const nx = notes.find(x => x.id === cur.linked_npc_id.slice(2)); if (!nx) break; cur = nx; } return cur; };
  function noteHtml(p) {
    const mine = p.author === C.user.id;
    return `<div class="pnote"><b>📝 ${esc(p.author_name || 'A player')}</b>${p.name ? ` <span class="muted small">called them "${esc(p.name)}"${p.location_name ? `, met in ${esc(p.location_name)}` : ''}</span>` : ''}
      ${p.description ? `<div class="small prewrap">${esc(p.description)}</div>` : ''}
      ${mine && p.linked_npc_id ? `<button class="btn small" data-unlink="${esc(p.id)}">✂️ Not the same person</button>` : ''}
      ${mine ? `<button class="btn small danger" data-del="${esc(p.id)}">🗑</button>` : ''}</div>`;
  }
  function renderPeople() {
    const q = ui.search.toLowerCase();
    const match = (...xs) => !q || xs.some(x => String(x || '').toLowerCase().includes(q));
    const linkedTo = id => notes.filter(p => p.linked_npc_id === id || (p.linked_npc_id && p.linked_npc_id.startsWith('p:') && rootOf(p).linked_npc_id === id));
    const known = world.npcs.filter(n => match(n.name, n.occupation, n.race) || linkedTo(n.id).some(p => match(p.name, p.description))).sort(byName);
    // player-made people that are not linked to a known NPC: group them by their first note
    const roots = notes.filter(p => !p.linked_npc_id || (p.linked_npc_id.startsWith('p:') && !npc(rootOf(p).linked_npc_id) && rootOf(p) === p))
      .filter(p => !p.linked_npc_id || !p.linked_npc_id.startsWith('p:'));
    const groupOf = r => notes.filter(p => p !== r && p.linked_npc_id === 'p:' + r.id);
    const own = roots.filter(r => match(r.name, r.occupation, r.description) || groupOf(r).some(p => match(p.name, p.description)));
    app.innerHTML = `
      <div class="panel" style="margin-bottom:14px">
        <div class="row">
          <input id="q" placeholder="🔍 Search people…" value="${esc(ui.search)}" style="flex:3 1 200px">
          ${me.isAdmin ? '<span class="small muted" style="flex:2 1 200px">👑 You are the DM: this is exactly what players see.</span>' : '<button class="btn primary" id="addBtn" style="flex:0">+ Add an NPC you met</button>'}
        </div>
        <div id="addBox"></div>
      </div>
      <div class="loc-grid" style="margin-top:0">
        ${known.map(n => card(n, linkedTo(n.id))).join('')}
        ${own.map(r => ownCard(r, groupOf(r))).join('')}
        ${!known.length && !own.length ? '<div class="empty">Nobody here yet. Add the people you meet!</div>' : ''}
      </div>`;
    $('#q').oninput = e => { ui.search = e.target.value; const pos = e.target.selectionStart; renderPeople(); const i = $('#q'); i.focus(); i.setSelectionRange(pos, pos); };
    const ab = $('#addBtn'); if (ab) ab.onclick = () => { ui.adding = true; renderAddForm(); };
    if (ui.adding) renderAddForm();
    wireNotes(app);
  }
  function card(n, linked) {
    const facs = n.factions.filter(f => fac(f.id)).map(f => { const F = fac(f.id); return `<span class="chip" style="border-color:${F.color}"><span class="dot" style="background:${F.color}"></span>${esc(F.name)}&nbsp;<span class="muted small">${esc(f.rank || '')}</span>&nbsp;</span>`; }).join('');
    const link = id => npc(id) ? esc(npc(id).name) : '';
    const fam = [['Parents', n.parents], ['Partner', n.spouses], ['Siblings', n.siblings]]
      .filter(([, ids]) => ids.some(npc)).map(([k, ids]) => `<div class="small"><b>${k}:</b> ${ids.map(link).filter(Boolean).join(', ')}</div>`).join('');
    const bonds = n.bonds.filter(b => npc(b.id)).map(b => `<div class="small"><b>${esc(b.type)}:</b> ${link(b.id)}</div>`).join('');
    return `<div class="panel loc-card" id="n-${esc(n.id)}">
      <div class="li-flex">${avatar(n, 64)}<div>
        <h3 style="margin:0">${esc(n.name)}</h3>
        <div class="small muted">${esc([n.race, n.gender, n.age && 'age ' + n.age, n.occupation].filter(Boolean).join(' · '))}</div>
        ${n.status && n.status !== 'Alive' ? `<span class="badge ${n.status === 'Dead' ? 'dead' : 'missing'}">${esc(n.status)}</span>` : ''}
      </div></div>
      ${n.description ? `<p class="small prewrap">${esc(n.description)}</p>` : ''}
      ${facs ? `<div style="margin:6px 0">${facs}</div>` : ''}
      ${fam}${bonds}
      ${linked.length ? `<div class="pnotes">${linked.map(noteHtml).join('')}</div>` : ''}
    </div>`;
  }
  function ownCard(r, more) {
    return `<div class="panel loc-card player-made" id="p-${esc(r.id)}">
      <div class="li-flex">${avatar({ name: r.name }, 64)}<div>
        <h3 style="margin:0">${esc(r.name)}</h3>
        <div class="small muted">${esc([r.race, r.occupation].filter(Boolean).join(' · '))}</div>
        <span class="badge">✍️ added by players</span>
      </div></div>
      <div class="pnotes">${[r, ...more].map(noteHtml).join('')}</div>
    </div>`;
  }
  function wireNotes(root) {
    root.querySelectorAll('[data-unlink]').forEach(b => b.onclick = async () => {
      await C.updatePlayerNpc(b.dataset.unlink, { linked_npc_id: null, link_reason: '' }); toast('✂️ Unlinked — they are now their own person.'); await load();
    });
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm('Delete your note?')) return; await C.deletePlayerNpc(b.dataset.del); await load();
    });
  }

  function renderAddForm() {
    const box = $('#addBox'); if (!box) return;
    box.innerHTML = `<form id="addForm" class="stack" autocomplete="off" style="margin-top:12px">
      <div class="grid2">
        <div><label>Name *</label><input name="name" required maxlength="80" placeholder="What did they call themselves?"></div>
        <div><label>Race</label><input name="race" maxlength="40" placeholder="e.g. Dwarf"></div>
        <div><label>Job</label><input name="occupation" maxlength="60" placeholder="e.g. Blacksmith"></div>
        <div><label>Where did you meet them?</label><input name="place" maxlength="80" placeholder="e.g. the big port city"></div>
      </div>
      <div><label>What do you know about them?</label><textarea name="description" maxlength="2000"></textarea></div>
      <div class="row" style="justify-content:flex-end">
        <button type="button" class="btn" id="addCancel" style="flex:0">Cancel</button>
        <button class="btn primary" type="submit" style="flex:0">💾 Save</button>
      </div></form>`;
    const f = $('#addForm'), v = k => String(f.elements.namedItem(k).value || '').trim();
    f.elements.namedItem('name').focus();
    $('#addCancel').onclick = () => { ui.adding = false; renderPeople(); };
    f.onsubmit = async e => {
      e.preventDefault();
      const rec = { owner: world.owner, author_name: me.name.slice(0, 60), name: v('name'), race: v('race'), occupation: v('occupation'), location_name: v('place'), description: v('description') };
      if (!rec.name) return;
      // too similar to someone already known? -> link them
      const cand = { name: rec.name, occupation: rec.occupation, place: rec.location_name };
      const bestKnown = window.Similar.best(cand, world.npcs, n => ({ name: n.name, occupation: n.occupation, place: '' }));
      const roots = notes.filter(p => !p.linked_npc_id);
      const bestNote = window.Similar.best(cand, roots, p => ({ name: p.name, occupation: p.occupation, place: p.location_name }));
      let linkMsg = '';
      if (bestKnown && bestKnown.score >= window.Similar.AUTO_LINK && (!bestNote || bestKnown.score >= bestNote.score)) {
        rec.linked_npc_id = bestKnown.item.id; rec.link_reason = `looks like ${bestKnown.item.name} (${Math.round(bestKnown.score * 100)}% alike)`;
        linkMsg = `🔗 Linked to <b>${esc(bestKnown.item.name)}</b> — looks like the same person.`;
      } else if (bestNote && bestNote.score >= window.Similar.AUTO_LINK) {
        rec.linked_npc_id = 'p:' + bestNote.item.id; rec.link_reason = `looks like "${bestNote.item.name}" added by ${bestNote.item.author_name}`;
        linkMsg = `🔗 Linked to <b>${esc(bestNote.item.name)}</b> (added by ${esc(bestNote.item.author_name || 'another player')}) — looks like the same person.`;
      }
      try {
        const saved = await C.addPlayerNpc(rec);
        ui.adding = false; await load();
        if (linkMsg) {
          toast(`${linkMsg} <button class="btn small" id="undoLink">✂️ No, someone else</button>`, true);
          const u = $('#undoLink'); if (u) u.onclick = async () => { await C.updatePlayerNpc(saved.id, { linked_npc_id: null, link_reason: '' }); $('#toast').classList.remove('show'); await load(); };
        } else toast(`✍️ ${rec.name} added. Everyone in your group can see them now.`);
        const el = document.getElementById(rec.linked_npc_id && !rec.linked_npc_id.startsWith('p:') ? 'n-' + rec.linked_npc_id : 'p-' + (rec.linked_npc_id ? rec.linked_npc_id.slice(2) : saved.id));
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('sel'); setTimeout(() => el.classList.remove('sel'), 2500); }
      } catch (err) { toast('⚠️ Could not save: ' + err.message); }
    };
  }

  // ---------- maps: pictures only ----------
  function renderMaps() {
    if (!world.maps.find(m => m.id === ui.mapId)) ui.mapId = world.maps.length ? world.maps[0].id : null;
    const m = world.maps.find(x => x.id === ui.mapId);
    if (!m) { app.innerHTML = '<div class="panel empty">No maps shared yet.</div>'; return; }
    app.innerHTML = `<div class="panel">
      <div class="row" style="justify-content:space-between">
        <div class="cat-chips" style="margin:0">${world.maps.map(x => `<button class="btn small ${x.id === m.id ? 'on' : ''}" data-map="${esc(x.id)}">${esc(x.name)}</button>`).join('')}</div>
        <span class="row" style="flex:0 1 auto;gap:4px">${[100, 150, 200, 300].map(z => `<button class="btn small ${z === ui.zoom ? 'on' : ''}" data-zoom="${z}">${z}%</button>`).join('')}</span>
      </div>
      <div class="map-scroll" style="margin-top:10px"><div class="map-inner" style="width:${ui.zoom}%"><img src="${esc(m.src)}" alt="Map" draggable="false"></div></div>
    </div>`;
    app.querySelectorAll('[data-map]').forEach(b => b.onclick = () => { ui.mapId = b.dataset.map; renderMaps(); });
    app.querySelectorAll('[data-zoom]').forEach(b => b.onclick = () => { ui.zoom = +b.dataset.zoom; renderMaps(); });
  }

  start();
})();
