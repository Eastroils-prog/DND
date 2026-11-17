/* =========================================================
   🔍 SEARCH (+ 🤖 ASK THE AI)
   - Instant search while typing, in your browser (free).
   - "Ask the AI": the best matching records are sent to the AI helper,
     which answers ONLY from those records and links them.
   The page decides what can be searched: the DM app gives everything,
   the player page only gives the NPCs players know.
   ========================================================= */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ð/g, 'd').replace(/[^a-z0-9+]+/g, ' ').trim();
  const STOP = new Set(('a an the of in on at to for and or is are was were be who what where which when why how does do did can could '
    + 'i me my we our you your there here this that these those with about from by any some all most least find show tell me please '
    + 'cheapest cheap expensive price prices cost costs sells sell buy near').split(' '));
  const terms = q => norm(q).split(' ').filter(w => w.length > 1 && !STOP.has(w));
  function lev(a, b) {
    if (a === b) return 0; const m = a.length, n = b.length; if (!m || !n) return m || n;
    let p = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
    return p[n];
  }
  const close = (a, b) => a.length > 3 && b.length > 3 && 1 - lev(a, b) / Math.max(a.length, b.length) >= 0.8;

  // docs: [{ id, type, icon, title, sub, text, weight }]
  function prepare(docs) {
    return docs.map(d => ({ ...d, _t: norm(d.title), _tw: norm(d.title).split(' '), _x: norm(d.title + ' ' + (d.sub || '') + ' ' + (d.text || '')) }));
  }
  function search(index, q, type) {
    const ts = terms(q), whole = norm(q);
    if (!ts.length && !whole) return [];
    const out = [];
    for (const d of index) {
      if (type && d.type !== type) continue;
      let s = 0, hit = 0;
      for (const t of ts) {
        let ts0 = 0;
        if (d._tw.includes(t)) ts0 = 8;
        else if (d._tw.some(w => w.startsWith(t))) ts0 = 5;
        else if (d._t.includes(t)) ts0 = 4;
        else if (d._tw.some(w => close(w, t))) ts0 = 3;
        else if (d._x.includes(t)) ts0 = 1.5;
        if (ts0) { s += ts0; hit++; }
      }
      if (whole.length > 2 && d._t.includes(whole)) s += 10;
      if (!s) continue;
      const frac = ts.length ? hit / ts.length : 1;
      out.push({ d, score: s * frac * frac * (d.weight || 1) });
    }
    return out.sort((a, b) => b.score - a.score).map(x => x.d);
  }

  // ---------- the search window ----------
  let cfg = null, index = [], state = { q: '', type: '', answer: null, busy: false };
  function open(prefill) {
    if (!cfg) return;
    index = prepare(cfg.getDocs());
    let m = document.getElementById('searchModal');
    if (!m) { m = document.createElement('div'); m.id = 'searchModal'; m.className = 'modal search-modal'; document.body.appendChild(m); }
    if (typeof prefill === 'string') state.q = prefill;
    m.hidden = false;
    render();
    const i = document.getElementById('sq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length);
  }
  function close_() { const m = document.getElementById('searchModal'); if (m) m.hidden = true; }
  function resultHtml(d) {
    return `<button class="sres" data-sid="${esc(d.id)}"><span class="sico">${esc(d.icon || '•')}</span><span class="stxt"><b>${esc(d.title)}</b>${d.sub ? `<span class="small muted"> ${esc(d.sub)}</span>` : ''}</span></button>`;
  }
  function render() {
    const m = document.getElementById('searchModal'); if (!m) return;
    const results = search(index, state.q, state.type).slice(0, 60);
    const groups = {};
    results.forEach(d => { (groups[d.type] = groups[d.type] || []).push(d); });
    const T = cfg.types || {};
    m.innerHTML = `<div class="modal-card panel search-card" role="dialog" aria-modal="true" aria-label="Search">
      <form class="search-bar" id="sform" autocomplete="off">
        <input id="sq" type="search" placeholder="${esc(cfg.placeholder || 'Search…')}" value="${esc(state.q)}" aria-label="Search">
        ${cfg.ask ? '<button class="btn primary" type="button" id="sask" title="Ask the AI">🤖 Ask</button>' : ''}
        <button class="btn-x" type="button" id="sclose" aria-label="Close">✕</button>
      </form>
      ${Object.keys(T).length > 1 ? `<div class="cat-chips sfilters"><button class="btn small ${!state.type ? 'on' : ''}" data-st="">All</button>${Object.entries(T).map(([k, v]) => `<button class="btn small ${state.type === k ? 'on' : ''}" data-st="${k}">${esc(v)}</button>`).join('')}</div>` : ''}
      <div id="sanswer">${answerHtml()}</div>
      <div class="sresults">${!state.q.trim() ? `<p class="small muted">${esc(cfg.hint || 'Type to search.')}</p>`
        : results.length ? Object.entries(groups).map(([t, ds]) => `<div class="sgroup"><div class="small muted sgh">${esc(T[t] || t)} (${ds.length})</div>${ds.slice(0, 12).map(resultHtml).join('')}</div>`).join('')
        : `<p class="small muted">Nothing found for "${esc(state.q)}".${cfg.ask ? ' Try 🤖 Ask — the AI understands whole questions.' : ''}</p>`}</div>
    </div>`;
    const i = document.getElementById('sq');
    i.oninput = () => { state.q = i.value; state.answer = null; const pos = i.selectionStart; render(); const j = document.getElementById('sq'); j.focus(); j.setSelectionRange(pos, pos); };
    document.getElementById('sform').onsubmit = e => { e.preventDefault(); const first = m.querySelector('.sres'); if (/\?\s*$/.test(state.q) && cfg.ask) ask(); else if (first) first.click(); };
    document.getElementById('sclose').onclick = close_;
    m.onclick = e => { if (e.target === m) close_(); };
    m.onkeydown = e => { if (e.key === 'Escape') close_(); };
    m.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { state.type = b.dataset.st; render(); });
    m.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => { const d = index.find(x => x.id === b.dataset.sid); if (d) { close_(); cfg.open(d); } });
    const a = document.getElementById('sask'); if (a) a.onclick = ask;
  }
  function answerHtml() {
    if (state.busy) return '<div class="field-view sanswer">🧙 Thinking…</div>';
    const r = state.answer; if (!r) return '';
    if (r.error) return `<div class="field-view sanswer">⚠️ ${esc(r.error)}</div>`;
    const refs = (r.refs || []).map(id => index.find(d => d.id === id)).filter(Boolean);
    return `<div class="field-view sanswer"><div class="small muted">🤖 Answer — from your records</div><p class="prewrap" style="margin:6px 0">${esc(r.answer)}</p>
      ${refs.length ? `<div class="small muted">Sources:</div>${refs.map(resultHtml).join('')}` : ''}</div>`;
  }
  async function ask() {
    if (!state.q.trim() || state.busy) return;
    // the best matching records (all words, then any word) go to the AI as its only information
    let top = search(index, state.q, state.type);
    if (top.length < 8) {
      const extra = []; terms(state.q).forEach(t => search(index, t, state.type).slice(0, 8).forEach(d => { if (!top.includes(d) && !extra.includes(d)) extra.push(d); }));
      top = top.concat(extra);
    }
    const docs = top.slice(0, 30).map(d => ({ id: d.id, type: cfg.types && cfg.types[d.type] || d.type, text: `${d.title}${d.sub ? ' — ' + d.sub : ''}\n${d.text || ''}`.slice(0, 700) }));
    state.busy = true; state.answer = null; render();
    try { state.answer = await cfg.ask(state.q, docs); }
    catch (e) { state.answer = { error: e.message }; }
    state.busy = false; render();
  }
  function init(c) {
    cfg = c;
    const bar = document.querySelector('.topbar');
    if (bar && !document.getElementById('searchBtn')) {
      const b = document.createElement('button'); b.id = 'searchBtn'; b.className = 'btn small search-btn'; b.title = 'Search (Ctrl + K)';
      b.innerHTML = '🔍 <span class="tl">Search</span>'; b.onclick = () => open();
      const brand = bar.querySelector('.brand'); brand.after(b);
    }
    document.addEventListener('keydown', e => {
      const typing = /input|textarea|select/i.test((e.target && e.target.tagName) || '');
      const m = document.getElementById('searchModal');
      if (e.key === 'Escape' && m && !m.hidden) { close_(); return; }
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); open(); }
    });
  }
  window.Search = { init, open, search, prepare };
})();
