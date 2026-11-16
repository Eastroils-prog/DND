/* =========================================================
   PLAYER VIEW (the "dining room")
   Read-only page for players. It only ever receives the player-safe
   copy of the world (no secret notes, no hidden NPCs).
   ========================================================= */
(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeImg = s => (typeof s === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s)) ? s : '';
  const safeColor = c => /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#c98a3d';
  const byName = (a, b) => String(a.name).localeCompare(String(b.name));
  const app = $('#app');

  let world = { npcs: [], locations: [], factions: [] }, ui = { search: '', loc: '', npcId: null };
  window.World = { locations: () => world.locations, esc };
  window.toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); };

  const cfg = window.WORLD_KEEPER_CONFIG || {};
  const code = new URLSearchParams(location.search).get('w') || '';
  const sb = (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  async function load(first) {
    if (!sb) return fail('This page is not connected to a world yet. Ask your Dungeon Master for the right link.');
    if (code.length < 12) return fail('This link is missing its secret code. Ask your Dungeon Master for the full link.');
    const { data, error } = await sb.rpc('get_player_world', { code });
    if (error) return first ? fail('Could not load the world: ' + error.message) : null;
    if (!data) return fail('This link does not work (anymore). Ask your Dungeon Master for a new one.');
    const changed = !world.updated_at || world.updated_at !== data.updated_at;
    world = {
      npcs: Array.isArray(data.npcs) ? data.npcs : [], locations: Array.isArray(data.locations) ? data.locations : [],
      factions: Array.isArray(data.factions) ? data.factions : [], updated_at: data.updated_at,
    };
    world.npcs.forEach(n => { n.portrait = safeImg(n.portrait); ['parents', 'spouses', 'siblings', 'bonds', 'factions'].forEach(k => { if (!Array.isArray(n[k])) n[k] = []; }); });
    world.factions.forEach(f => { f.color = safeColor(f.color); });
    if (changed) window.Market.useState(data.market || {}, { readOnly: true });
    $('#updated').textContent = data.updated_at ? 'Updated ' + new Date(data.updated_at).toLocaleString() : '';
    if (changed) route();
  }
  function fail(msg) { app.innerHTML = `<div class="panel empty"><div style="font-size:3rem">🔒</div><p>${esc(msg)}</p></div>`; }

  const npc = id => world.npcs.find(n => n.id === id);
  const loc = id => world.locations.find(l => l.id === id);
  const fac = id => world.factions.find(f => f.id === id);
  const avatar = (n, size) => n.portrait
    ? `<img class="avatar" src="${esc(n.portrait)}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="avatar ph" style="width:${size}px;height:${size}px;font-size:${size * 0.45}px">${esc((n.name || '?').trim()[0] || '?')}</span>`;

  function route() {
    const tab = (location.hash || '#people').slice(1);
    document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    if (tab !== 'market') window.Market.stop();
    if (tab === 'market') return window.Market.render(app);
    if (tab === 'places') return renderPlaces();
    renderPeople();
  }
  window.addEventListener('hashchange', route);

  function renderPeople() {
    const q = ui.search.toLowerCase();
    const list = world.npcs.filter(n => (!q || [n.name, n.occupation, n.race].some(v => String(v || '').toLowerCase().includes(q)))
      && (!ui.loc || n.locationId === ui.loc)).sort(byName);
    app.innerHTML = `
      <div class="panel" style="margin-bottom:14px">
        <div class="row">
          <input id="q" placeholder="🔍 Search people…" value="${esc(ui.search)}">
          <select id="locF"><option value="">📍 Everywhere</option>${[...world.locations].sort(byName).map(l => `<option value="${esc(l.id)}" ${ui.loc === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="loc-grid" style="margin-top:0">${list.map(card).join('') || '<div class="empty">Nobody here yet.</div>'}</div>`;
    $('#q').oninput = e => { ui.search = e.target.value; const pos = e.target.selectionStart; renderPeople(); const i = $('#q'); i.focus(); i.setSelectionRange(pos, pos); };
    $('#locF').onchange = e => { ui.loc = e.target.value; renderPeople(); };
    app.querySelectorAll('[data-goto]').forEach(a => a.onclick = e => {
      e.preventDefault(); ui.search = ''; ui.loc = '';
      renderPeople(); const el = document.getElementById('p-' + a.dataset.goto);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('sel'); setTimeout(() => el.classList.remove('sel'), 1500); }
    });
  }

  function card(n) {
    const l = loc(n.locationId);
    const link = id => npc(id) ? `<a href="#" data-goto="${esc(id)}">${esc(npc(id).name)}</a>` : '';
    const sibs = new Set(n.siblings);
    world.npcs.forEach(o => { if (o.id !== n.id && o.parents.some(p => n.parents.includes(p))) sibs.add(o.id); });
    const kids = world.npcs.filter(o => o.parents.includes(n.id)).map(o => o.id);
    const fam = [['Parents', n.parents], ['Partner', n.spouses], ['Siblings', [...sibs]], ['Children', kids]]
      .filter(([, ids]) => ids.length).map(([k, ids]) => `<div class="small"><b>${k}:</b> ${ids.map(link).join(', ')}</div>`).join('');
    const bonds = n.bonds.filter(b => npc(b.id)).map(b => `<div class="small"><b>${esc(b.type)}:</b> ${link(b.id)}</div>`).join('');
    const facs = n.factions.filter(f => fac(f.id)).map(f => { const F = fac(f.id); return `<span class="chip" style="border-color:${F.color}"><span class="dot" style="background:${F.color}"></span>${esc(F.name)}&nbsp;<span class="muted small">${esc(f.rank || '')}</span>&nbsp;</span>`; }).join('');
    return `<div class="panel loc-card" id="p-${esc(n.id)}">
      <div class="li-flex">${avatar(n, 64)}<div>
        <h3 style="margin:0">${esc(n.name)}</h3>
        <div class="small muted">${esc([n.race, n.gender, n.age && 'age ' + n.age, n.occupation].filter(Boolean).join(' · '))}</div>
        ${n.status && n.status !== 'Alive' ? `<span class="badge ${n.status === 'Dead' ? 'dead' : 'missing'}">${esc(n.status)}</span>` : ''}
      </div></div>
      ${l ? `<div class="small" style="margin-top:6px">📍 ${esc(l.name)}</div>` : ''}
      ${n.description ? `<p class="small prewrap">${esc(n.description)}</p>` : ''}
      ${facs ? `<div style="margin:6px 0">${facs}</div>` : ''}
      ${fam}${bonds}
    </div>`;
  }

  function renderPlaces() {
    app.innerHTML = `<div class="loc-grid" style="margin-top:0">${[...world.locations].sort(byName).map(L => {
      const people = world.npcs.filter(n => n.locationId === L.id).sort(byName);
      return `<div class="panel loc-card"><h3>${esc(L.name)}</h3>
        <div class="small muted">${esc(L.type || '')}${L.region ? ' · ' + esc(L.region) : ''}</div>
        <ul class="members">${people.map(p => `<li>${avatar(p, 24)} ${esc(p.name)} <span class="muted small">${esc(p.occupation || '')}</span></li>`).join('') || '<li class="muted small">You haven\'t met anyone here yet.</li>'}</ul>
        <button class="btn small" data-prices="${esc(L.id)}">💰 Prices here</button></div>`;
    }).join('') || '<div class="empty">No places known yet.</div>'}</div>`;
    app.querySelectorAll('[data-prices]').forEach(b => b.onclick = () => { window.Market.setCity(b.dataset.prices); location.hash = 'market'; });
  }

  load(true);
  setInterval(() => load(false), 60000); // check for news from the DM every minute
})();
