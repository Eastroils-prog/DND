/* =========================================================
   CHARACTER FAMILY TREE (players' own characters)
   Draws grandparents → parents → the character with siblings and partner → children.
   Used on the player page and in the DM's Party tab.
   ========================================================= */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LEVEL = { grandparent: 0, parent: 1, sibling: 2, spouse: 2, child: 3 };
  const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  function svg(ch) {
    const fam = (ch.family || []).filter(f => f && f.name && LEVEL[f.relation] !== undefined);
    const rows = [[], [], [], []];
    fam.filter(f => f.relation === 'grandparent').forEach(f => rows[0].push(f));
    fam.filter(f => f.relation === 'parent').forEach(f => rows[1].push(f));
    const sibs = fam.filter(f => f.relation === 'sibling'), sp = fam.filter(f => f.relation === 'spouse');
    rows[2] = [...sibs.slice(0, Math.ceil(sibs.length / 2)), { self: true, name: ch.name || 'My character', relation: [ch.race, ch.cls].filter(Boolean).join(' ') }, ...sp, ...sibs.slice(Math.ceil(sibs.length / 2))];
    fam.filter(f => f.relation === 'child').forEach(f => rows[3].push(f));
    const used = rows.filter(r => r.length);
    const W = 150, H = 54, GX = 16, GY = 50, PAD = 16;
    const cols = Math.max(...used.map(r => r.length));
    const width = Math.max(320, cols * (W + GX) - GX + PAD * 2), height = used.length * (H + GY) - GY + PAD * 2;
    const pos = new Map();
    used.forEach((row, ri) => { const rw = row.length * (W + GX) - GX, x0 = (width - rw) / 2; row.forEach((p, ci) => pos.set(p, { x: x0 + ci * (W + GX), y: PAD + ri * (H + GY), ri })); });
    const self = rows[2].find(p => p.self), sp0 = pos.get(self);
    let lines = '';
    const link = (a, b) => { const A = pos.get(a), B = pos.get(b); if (!A || !B) return; const x1 = A.x + W / 2, y1 = A.y + H, x2 = B.x + W / 2, y2 = B.y, my = (y1 + y2) / 2; lines += `<path d="M${x1},${y1} V${my} H${x2} V${y2}" fill="none" stroke="#56627a" stroke-width="1.6"/>`; };
    // grandparents → parents, parents → character and siblings, character and partner → children
    if (rows[1].length) rows[0].forEach(g => link(g, rows[1][0]));
    else rows[0].forEach(g => link(g, self));
    rows[1].forEach(par => [self, ...sibs].forEach(c => link(par, c)));
    rows[3].forEach(c => link(self, c));
    sp.forEach(s => { const A = pos.get(s); if (A && sp0) lines += `<line x1="${Math.min(A.x, sp0.x) + W}" y1="${A.y + H / 2}" x2="${Math.max(A.x, sp0.x)}" y2="${A.y + H / 2}" stroke="#c58aa8" stroke-width="2" stroke-dasharray="5 4"/>`; });
    let boxes = '';
    pos.forEach((p, person) => {
      const dead = person.alive === false, me = !!person.self;
      boxes += `<g transform="translate(${p.x},${p.y})"><rect width="${W}" height="${H}" rx="10" fill="${me ? '#3a2f1a' : '#1f2533'}" stroke="${me ? '#f0b54a' : dead ? '#ef7a64' : '#3a4459'}" stroke-width="${me ? 2.5 : 1.5}"/>
        <text x="${W / 2}" y="22" text-anchor="middle" fill="${dead ? '#9ea6b8' : '#ece7dc'}" font-size="13" font-weight="600" font-family="system-ui, sans-serif">${esc(cut((dead ? '✝ ' : '') + person.name, 20))}</text>
        <text x="${W / 2}" y="40" text-anchor="middle" fill="#9ea6b8" font-size="11" font-family="system-ui, sans-serif">${esc(cut(me ? person.relation : person.relation + (person.race ? ' · ' + person.race : ''), 24))}</text></g>`;
    });
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Family tree">${lines}${boxes}</svg>`;
  }
  window.CharTree = { svg };
})();
