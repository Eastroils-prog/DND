/* =========================================================
   LIVING MARKET
   - 2 years (730 days) of daily price history per item
   - Seasons, inflation, a bad harvest last year, random noise
   - A war that started 14 days ago (DM can change war status)
   - Prices "tick" live every few seconds
   History is generated from a fixed seed, so it looks the same
   every time you open the app (until you advance days).
   ========================================================= */
(function () {
  const MKEY = 'dnd-market-v1';
  const HISTORY_DAYS = 730;
  const WAR_DAYS_AGO = 14;

  // base = normal price in copper pieces (cp). 100 cp = 1 gp, 10 cp = 1 sp
  // war = how much the price multiplies during FULL war (1 = no change, 3 = triples)
  // lag = how many days the war effect takes to sink in
  // vol = daily wobble; season = how much seasons matter; harvest = hit by last year's bad harvest
  const ITEMS = [
    // Food & drink
    { id: 'beer', name: 'Beer', unit: 'per mug', cat: 'Food & Drink', base: 4, war: 1.35, lag: 6, vol: 0.020, season: 0.06, phase: 1.5 },
    { id: 'ale-gallon', name: 'Ale', unit: 'per gallon', cat: 'Food & Drink', base: 20, war: 1.4, lag: 6, vol: 0.018, season: 0.06, phase: 1.5 },
    { id: 'wine', name: 'Wine, common', unit: 'per pitcher', cat: 'Food & Drink', base: 20, war: 1.45, lag: 8, vol: 0.015, season: 0.05, phase: 2.5 },
    { id: 'wine-fine', name: 'Wine, fine', unit: 'per bottle', cat: 'Food & Drink', base: 1000, war: 1.2, lag: 10, vol: 0.012 },
    { id: 'bread', name: 'Bread', unit: 'per loaf', cat: 'Food & Drink', base: 2, war: 1.8, lag: 5, vol: 0.022, season: 0.14, phase: 0.3, harvest: true },
    { id: 'grain', name: 'Wheat / grain', unit: 'per lb', cat: 'Food & Drink', base: 1, war: 1.9, lag: 4, vol: 0.025, season: 0.18, phase: 0.3, harvest: true },
    { id: 'cheese', name: 'Cheese', unit: 'per hunk', cat: 'Food & Drink', base: 10, war: 1.5, lag: 7, vol: 0.014 },
    { id: 'meat', name: 'Meat', unit: 'per chunk', cat: 'Food & Drink', base: 30, war: 1.9, lag: 5, vol: 0.02, season: 0.08, phase: 3.5 },
    { id: 'meal-modest', name: 'Inn meal, modest', unit: 'per day', cat: 'Food & Drink', base: 30, war: 1.6, lag: 6, vol: 0.012 },
    { id: 'rations', name: 'Rations', unit: 'per day', cat: 'Food & Drink', base: 50, war: 2.4, lag: 3, vol: 0.02 },
    // Potions & healing
    { id: 'potion-healing', name: 'Potion of Healing', unit: 'per vial', cat: 'Potions & Healing', base: 5000, war: 3.0, lag: 3, vol: 0.03 },
    { id: 'potion-greater', name: 'Potion of Greater Healing', unit: 'per vial', cat: 'Potions & Healing', base: 15000, war: 2.6, lag: 4, vol: 0.032 },
    { id: 'antitoxin', name: 'Antitoxin', unit: 'per vial', cat: 'Potions & Healing', base: 5000, war: 1.7, lag: 6, vol: 0.02 },
    { id: 'healers-kit', name: "Healer's kit", unit: '10 uses', cat: 'Potions & Healing', base: 500, war: 2.3, lag: 4, vol: 0.02 },
    { id: 'herbalism', name: 'Healing herbs', unit: 'per bundle', cat: 'Potions & Healing', base: 50, war: 2.0, lag: 5, vol: 0.025, season: 0.2, phase: 4.5 },
    // Weapons & armor
    { id: 'longsword', name: 'Longsword', unit: 'each', cat: 'Weapons & Armor', base: 1500, war: 2.0, lag: 6, vol: 0.015 },
    { id: 'spear', name: 'Spear', unit: 'each', cat: 'Weapons & Armor', base: 100, war: 2.2, lag: 5, vol: 0.016 },
    { id: 'arrows', name: 'Arrows', unit: 'bundle of 20', cat: 'Weapons & Armor', base: 100, war: 2.5, lag: 4, vol: 0.02 },
    { id: 'shield', name: 'Shield', unit: 'each', cat: 'Weapons & Armor', base: 1000, war: 2.0, lag: 6, vol: 0.015 },
    { id: 'chainmail', name: 'Chain mail', unit: 'each', cat: 'Weapons & Armor', base: 7500, war: 1.9, lag: 8, vol: 0.012 },
    { id: 'iron', name: 'Iron', unit: 'per lb', cat: 'Weapons & Armor', base: 10, war: 2.1, lag: 5, vol: 0.02 },
    // Inn stays (lifestyle levels). Refugees flood cheap rooms; rich travelers stay away.
    { id: 'inn-squalid', name: 'Inn stay — Squalid', unit: 'per night', cat: 'Inn Stays', base: 7, war: 1.9, lag: 4, vol: 0.02 },
    { id: 'inn-poor', name: 'Inn stay — Poor', unit: 'per night', cat: 'Inn Stays', base: 10, war: 1.75, lag: 4, vol: 0.018 },
    { id: 'inn-modest', name: 'Inn stay — Modest', unit: 'per night', cat: 'Inn Stays', base: 50, war: 1.5, lag: 5, vol: 0.015, season: 0.08, phase: 1.6 },
    { id: 'inn-comfortable', name: 'Inn stay — Comfortable', unit: 'per night', cat: 'Inn Stays', base: 80, war: 1.3, lag: 6, vol: 0.013, season: 0.1, phase: 1.6 },
    { id: 'inn-wealthy', name: 'Inn stay — Wealthy', unit: 'per night', cat: 'Inn Stays', base: 200, war: 1.1, lag: 7, vol: 0.012, season: 0.12, phase: 1.6 },
    { id: 'inn-aristocratic', name: 'Inn stay — Aristocratic', unit: 'per night', cat: 'Inn Stays', base: 400, war: 0.85, lag: 8, vol: 0.012, season: 0.12, phase: 1.6 },
    { id: 'stabling', name: 'Stabling', unit: 'per horse per night', cat: 'Inn Stays', base: 5, war: 1.6, lag: 5, vol: 0.015 },
    // Goods & mounts
    { id: 'horse', name: 'Riding horse', unit: 'each', cat: 'Goods & Mounts', base: 7500, war: 2.3, lag: 5, vol: 0.018 },
    { id: 'torch', name: 'Torch', unit: 'each', cat: 'Goods & Mounts', base: 1, war: 1.3, lag: 6, vol: 0.015 },
    { id: 'rope', name: 'Rope, hempen', unit: '50 ft', cat: 'Goods & Mounts', base: 100, war: 1.5, lag: 6, vol: 0.014 },
    { id: 'lamp-oil', name: 'Lamp oil', unit: 'per flask', cat: 'Goods & Mounts', base: 10, war: 1.6, lag: 5, vol: 0.018, season: 0.1, phase: 3.1 },
    { id: 'cloth', name: 'Cloth, common', unit: 'per yard', cat: 'Goods & Mounts', base: 10, war: 1.3, lag: 9, vol: 0.012 },
  ];
  const allItems = () => ITEMS.concat(ms.customItems || []);           // every item (history is made for all of them)
  const isHidden = id => (ms.hiddenItems || []).includes(id);
  const visibleItems = () => allItems().filter(i => !isHidden(i.id));   // what the market shows (deleted items left out)
  const cats = () => ['All', ...new Set(visibleItems().map(i => i.cat))];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // choices for the "add your own item" form
  const WAR_CHOICES = [[0.7, 'Gets much cheaper'], [0.85, 'Gets a bit cheaper'], [1, 'No change'], [1.3, 'A bit more expensive'],
    [1.7, 'More expensive'], [2.5, 'Much more expensive'], [3.5, 'Way more expensive (war goods)']];
  const VOL_CHOICES = [[0.008, 'Very stable'], [0.016, 'Normal'], [0.03, 'Jumpy'], [0.05, 'Wild swings']];

  const WAR_LEVELS = [
    { v: 0, label: '🕊️ Peace' },
    { v: 0.3, label: '🤝 Ceasefire (shaky)' },
    { v: 0.5, label: '⚔️ Border skirmishes' },
    { v: 1, label: '🔥 Full war' },
    { v: 1.5, label: '🏰 Siege / invasion nearby' },
  ];

  // ---------- small helpers ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const bump = (d, c, w) => Math.exp(-(((d - c) / w) ** 2));

  function formatCoins(cp) {
    if (cp >= 100) return (cp / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' gp';
    if (cp >= 10) return (cp / 10).toFixed(1) + ' sp';
    return cp.toFixed(1) + ' cp';
  }
  function pct(a, b) { return b ? ((a - b) / b) * 100 : 0; }
  function pctHtml(p) {
    const cls = p > 0.05 ? 'up' : p < -0.05 ? 'down' : 'flat';
    const arrow = p > 0.05 ? '▲' : p < -0.05 ? '▼' : '•';
    return `<span class="${cls}">${arrow} ${Math.abs(p).toFixed(1)}%</span>`;
  }

  // ---------- saved market settings ----------
  function defaultMState() {
    return {
      seed: 1337,
      daysAdvanced: 0,
      events: [{ day: HISTORY_DAYS - 1 - WAR_DAYS_AGO, level: 1 }],
      customItems: [],
      hiddenItems: [],   // built-in items you deleted (they can be restored)
      cityId: null,
    };
  }
  let ms;
  function loadM() {
    try {
      const s = JSON.parse(localStorage.getItem(MKEY));
      if (s && Array.isArray(s.events)) return sanitize(s);
    } catch (e) { /* ignore */ }
    return defaultMState();
  }
  let readOnly = false; // player view: nobody can change the market
  function saveM() {
    if (readOnly) return;
    try { localStorage.setItem(MKEY, JSON.stringify(ms)); } catch (e) { /* ignore */ }
    if (window.Market && window.Market.onChange) window.Market.onChange();
  }
  function sanitize(s) {
    if (!s || !Array.isArray(s.events)) return defaultMState();
    return {
      seed: Number(s.seed) || 1337, daysAdvanced: Math.max(0, Math.min(5000, Number(s.daysAdvanced) || 0)),
      events: s.events.filter(e => e && Number.isFinite(e.day) && Number.isFinite(e.level)),
      customItems: (Array.isArray(s.customItems) ? s.customItems : []).filter(i => i && i.id && i.base > 0 && i.war > 0),
      hiddenItems: (Array.isArray(s.hiddenItems) ? s.hiddenItems : []).filter(id => ITEMS.some(i => i.id === id)),
      cityId: s.cityId || null,
      magicSalt: s.magicSalt && typeof s.magicSalt === 'object' ? s.magicSalt : {},
    };
  }
  ms = loadM();

  const totalDays = () => HISTORY_DAYS + ms.daysAdvanced;
  const today = () => totalDays() - 1;
  const firstWarDay = () => { const e = ms.events.find(e => e.level > 0); return e ? e.day : null; };

  function levelAt(day) {
    let lv = 0;
    for (const e of ms.events) if (e.day <= day) lv = e.level;
    // rumours of war push prices up a little in the month before it starts
    const fw = firstWarDay();
    if (fw !== null && day < fw && day >= fw - 30) lv = Math.max(lv, 0.15 * (day - (fw - 30)) / 30);
    return lv;
  }

  // ---------- price history generator ----------
  let cache = null;
  function buildHistory() {
    const n = totalDays();
    const levels = Array.from({ length: n }, (_, d) => levelAt(d));
    const out = {};
    const city = currentCity();
    const priceMod = city ? (Number(city.priceMod) || 1) : 1, expo = city ? (Number(city.warExposure) || 1) : 1;
    for (const it of allItems()) {
      const r = mulberry32(hashStr(it.id) ^ ms.seed);
      const logBase = Math.log(it.base);
      let x = logBase, e = 0;
      const arr = new Array(n);
      for (let d = 0; d < n; d++) {
        const season = it.season ? it.season * Math.sin(2 * Math.PI * d / 365 + (it.phase || 0)) : 0;
        const inflation = 0.03 * d / 365;               // 3% a year
        const harvest = it.harvest ? 0.28 * bump(d, 330, 35) : 0; // bad harvest ~13 months ago
        const lv = levels[d];
        e += (Math.log(it.war) * lv - e) / (it.lag || 5);
        const target = logBase + season + inflation + harvest + e;
        const volMult = 1 + 1.5 * Math.min(1, lv);
        x += 0.08 * (target - x) + it.vol * volMult * gauss(r);
        // local prices: the city's price level, and how hard the war hits that place
        arr[d] = Math.exp(x + e * (expo - 1)) * priceMod;
      }
      out[it.id] = arr;
    }
    cache = out;
  }

  function currentCity() {
    const locs = window.World ? window.World.locations() : [];
    return locs.find(l => l.id === ms.cityId) || null;
  }

  // ---------- live ticking ----------
  const live = {};          // item id -> log offset from today's close
  let liveOn = true, timer = null, liveRand = mulberry32(Date.now() & 0xffffffff);
  function livePrice(id) { return cache[id][today()] * Math.exp(live[id] || 0); }
  function tick() {
    const lv = levelAt(today());
    for (const it of allItems()) {
      const o = live[it.id] || 0;
      // tiny wobble; during war prices drift upward a little through the day
      const drift = (it.war > 1 ? 0.0006 : -0.0003) * lv;
      live[it.id] = o * 0.97 + drift + it.vol * 0.12 * (1 + lv) * gauss(liveRand);
    }
  }

  // ---------- chart drawing (plain canvas, no libraries) ----------
  function setupCanvas(cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function drawSpark(cv, data, warIdx) {
    const { ctx, w, h } = setupCanvas(cv);
    if (!w || !h) return;
    const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
    const X = i => (i / (data.length - 1)) * w, Y = v => h - 3 - ((v - min) / span) * (h - 6);
    if (warIdx >= 0 && warIdx < data.length) {
      ctx.fillStyle = 'rgba(226,115,95,0.12)'; ctx.fillRect(X(warIdx), 0, w - X(warIdx), h);
    }
    ctx.beginPath(); data.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
    ctx.strokeStyle = data[data.length - 1] >= data[0] ? css('--red') : css('--green');
    ctx.lineWidth = 1.5; ctx.stroke();
  }

  function drawChart(cv, data, startDay, hover, sel) {
    const { ctx, w, h } = setupCanvas(cv);
    if (!w || !h) return null;
    const pad = { l: 70, r: 14, t: 14, b: 28 };
    const min = Math.min(...data), max = Math.max(...data);
    const span = (max - min) || max * 0.1 || 1;
    const lo = min - span * 0.08, hi = max + span * 0.08;
    const X = i => pad.l + (i / Math.max(1, data.length - 1)) * (w - pad.l - pad.r);
    const Y = v => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);

    // grid + y labels
    ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = css('--muted'); ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) {
      const v = lo + (hi - lo) * k / 4, y = Y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.fillText(formatCoins(v), pad.l - 8, y);
    }
    // x labels (days/months ago)
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const n = data.length, t = today();
    const ticks = 6;
    for (let k = 0; k <= ticks; k++) {
      const i = Math.round((n - 1) * k / ticks), ago = t - (startDay + i);
      // zoomed in (under ~5 months shown) -> label in days, so labels don't repeat
      const lbl = ago === 0 ? 'Today' : (ago >= 60 && n > 150) ? `${Math.round(ago / 30.4)} mo ago` : `${ago} d ago`;
      ctx.textAlign = k === 0 ? 'left' : k === ticks ? 'right' : 'center';
      ctx.fillText(lbl, k === 0 ? X(i) - 4 : X(i), h - pad.b + 8);
    }
    // the stretch you are dragging across (to zoom in)
    if (sel && sel.a !== sel.b) {
      const x1 = X(Math.min(sel.a, sel.b)), x2 = X(Math.max(sel.a, sel.b));
      ctx.fillStyle = 'rgba(224,179,84,0.18)'; ctx.fillRect(x1, pad.t, x2 - x1, h - pad.t - pad.b);
    }
    // war shading + markers
    for (const ev of ms.events) {
      const i = ev.day - startDay;
      if (i < 0 || i >= n) continue;
      const x = X(i);
      ctx.strokeStyle = ev.level > 0 ? css('--red') : css('--green'); ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle; ctx.textAlign = 'left';
      const lv = WAR_LEVELS.find(l => l.v === ev.level);
      ctx.fillText(lv ? lv.label : 'War status change', Math.min(x + 4, w - 140), pad.t + 2);
    }
    // area + line
    const up = data[n - 1] >= data[0];
    const col = up ? css('--red') : css('--green');
    const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
    grad.addColorStop(0, up ? 'rgba(226,115,95,0.30)' : 'rgba(124,196,138,0.30)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); data.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
    ctx.lineTo(X(n - 1), h - pad.b); ctx.lineTo(X(0), h - pad.b); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); data.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();

    // hover tooltip
    if (hover != null && hover >= 0 && hover < n) {
      const x = X(hover), y = Y(data[hover]), ago = t - (startDay + hover);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      const txt1 = formatCoins(data[hover]), txt2 = ago === 0 ? 'Today (live)' : `${ago} day${ago === 1 ? '' : 's'} ago`;
      ctx.font = 'bold 13px system-ui, sans-serif';
      const bw = Math.max(ctx.measureText(txt1).width, ctx.measureText(txt2).width) + 18;
      const bx = Math.min(Math.max(x + 10, pad.l), w - bw - 4), by = Math.max(pad.t, y - 50);
      ctx.fillStyle = 'rgba(18,15,11,0.92)'; ctx.strokeStyle = css('--gold-dim');
      ctx.fillRect(bx, by, bw, 40); ctx.strokeRect(bx, by, bw, 40);
      ctx.fillStyle = css('--text'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(txt1, bx + 9, by + 5); ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = css('--muted');
      ctx.fillText(txt2, bx + 9, by + 22);
    }
    return { X, pad, n, w };
  }

  function cityDesc(c) {
    const pm = Number(c.priceMod) || 1, ex = Number(c.warExposure) || 1;
    const p = pm >= 1.5 ? 'very expensive' : pm >= 1.25 ? 'expensive' : pm > 1 ? 'a bit pricey' : pm < 0.8 ? 'very cheap' : pm < 1 ? 'cheap' : 'normal prices';
    const w = ex >= 1.6 ? 'on the front line' : ex > 1 ? 'near the war' : ex <= 0.3 ? 'untouched by the war' : ex < 1 ? 'far from the war' : 'normal war effect';
    return `${p}, ${w}`;
  }

  // ---------- news headlines ----------
  function headlines() {
    const lv = levelAt(today()), fw = firstWarDay();
    const days = fw !== null ? today() - fw : null;
    const pot = pct(livePrice('potion-healing'), cache['potion-healing'][Math.max(0, (fw ?? today()) - 1)]);
    const list = [];
    if (lv >= 1) {
      list.push(`Day ${days} of the war: the army has bought up every healing potion in the city — prices up ${pot.toFixed(0)}%.`);
      list.push('Refugees crowd the cheap inns. Squalid and poor rooms are filling up fast.');
      list.push('Blacksmiths work through the night. Iron, arrows and spears are in short supply.');
      list.push('Nobles flee to their country estates — the fanciest inns sit half-empty.');
      list.push('Grain wagons are being taken by soldiers. Bakers raise the price of bread.');
    } else if (lv >= 0.5) {
      list.push('Border skirmishes continue. Merchants grow nervous and raise prices.');
      list.push('Guards stock up on arrows and healing supplies.');
    } else if (lv > 0) {
      list.push('An uneasy ceasefire holds. Prices slowly drift back down.');
    } else {
      list.push('Peace in the realm. Trade roads are open and prices are calm.');
    }
    const c = currentCity();
    if (c && lv > 0 && Number(c.warExposure) >= 1.6) list.unshift(`Soldiers fill the streets of ${esc(c.name)}. Everything here costs far more than elsewhere.`);
    if (c && lv > 0 && Number(c.warExposure) <= 0.6) list.unshift(`In ${esc(c.name)} the war feels far away. Prices have hardly moved.`);
    if (lv >= 1.5) list.unshift('⚠️ Enemy banners seen from the walls! Panic buying everywhere.');
    list.push('Last year\'s bad harvest is still remembered — bakers keep a close eye on the grain price.');
    return list;
  }

  // ---------- page rendering ----------
  let mview = 'goods', mq = { search: '', rarity: '', source: '' };
  let root = null, selected = 'potion-healing', cat = 'All', hoverIdx = null, layout = null, drag = null;
  // The time window of the big chart, counted in "days ago": from 730 days ago up to 0 (= today)
  let view = { from: 730, to: 0 };
  const UNITS = [[1, 'days'], [7, 'weeks'], [30.4, 'months'], [365, 'years']];

  function clampView() {
    const t = today();
    view.from = Math.max(1, Math.min(Math.round(view.from), t));
    view.to = Math.max(0, Math.min(Math.round(view.to), view.from - 1));
  }
  function seriesFor(id) {
    clampView();
    const all = cache[id].slice(), t = today(); all[t] = livePrice(id);
    const start = t - view.from, end = t - view.to;
    return { data: all.slice(start, end + 1), start };
  }
  // 45 -> "45 days", 90 -> "3 months", 0 -> "today"
  function agoText(d) {
    if (d === 0) return 'today';
    const nearYears = d >= 360 && Math.abs(d / 365 - Math.round(d / 365)) < 0.01;
    const [u, name] = nearYears ? UNITS[3] : d >= 60 ? UNITS[2] : d % 7 === 0 && d >= 14 ? UNITS[1] : UNITS[0];
    const v = Math.round((d / u) * 10) / 10;
    return `${v} ${v === 1 ? name.slice(0, -1) : name} ago`;
  }
  function bestUnit(d) {
    if (d === 0) return [0, 1];
    if (d >= 360 && Math.abs(d / 365 - Math.round(d / 365)) < 0.01) return [Math.round(d / 365), 365];
    if (d >= 60 && Math.abs(d / 30.4 - Math.round(d / 30.4)) < 0.05) return [Math.round(d / 30.4), 30.4];
    if (d % 7 === 0 && d >= 14) return [d / 7, 7];
    return [d, 1];
  }

  function render(container) {
    root = container;
    buildHistory();
    const lv = levelAt(today());
    const fw = firstWarDay();
    const levelLabel = (WAR_LEVELS.find(l => l.v === (ms.events[ms.events.length - 1] || {}).level) || WAR_LEVELS[0]).label;
    const atWar = lv > 0;
    const city = currentCity();
    root.innerHTML = `
      <div class="war-banner ${atWar ? '' : 'peace'}">
        <div>
          <div class="title">${atWar && fw !== null ? `⚔️ The war began ${today() - fw} days ago` : '🕊️ The realm is at peace'}</div>
          ${city ? `<div class="small" style="color:#ffd3c4">📍 Prices in <b>${esc(city.name)}</b> — ${esc(cityDesc(city))}</div>` : ''}
          <div class="small muted">Status: ${levelLabel} · Market day ${today() - (HISTORY_DAYS - 1) >= 0 ? '+' + (today() - (HISTORY_DAYS - 1)) : ''} · <span class="live-dot ${liveOn ? '' : 'off'}"></span>${liveOn ? 'LIVE prices' : 'Paused'}</div>
        </div>
        <div class="row" style="flex:0 1 auto">
          <select id="citySel" title="Prices are different in every place" style="width:auto;max-width:220px">
            <option value="">📍 Standard prices (rulebook)</option>
            ${(window.World ? window.World.locations() : []).slice().sort((a, b) => a.name.localeCompare(b.name))
              .map(l => `<option value="${esc(l.id)}" ${l.id === ms.cityId ? 'selected' : ''}>📍 ${esc(l.name)}</option>`).join('')}
          </select>
          ${readOnly ? '' : `<select id="warLevel" title="Change the war status from today onward" style="width:auto">
            ${WAR_LEVELS.map(l => `<option value="${l.v}">${l.label}</option>`).join('')}
          </select>
          <button class="btn small" id="setWar">Set war status</button>
          <button class="btn small primary" id="endDay" title="Close the market and move the world one day forward">🌙 End the day</button>`}
          <button class="btn small" id="liveBtn">${liveOn ? '⏸ Pause live' : '▶ Go live'}</button>
        </div>
      </div>

      <div class="cat-chips view-tabs">
        <button class="btn ${mview === 'goods' ? 'on' : ''}" data-view="goods">📈 Trade goods</button>
        <button class="btn ${mview === 'magic' ? 'on' : ''}" data-view="magic">🔮 Magic items</button>
      </div>
      <div id="magicView" ${mview === 'magic' ? '' : 'hidden'}></div>
      <div id="goodsView" ${mview === 'magic' ? 'hidden' : ''}>
      <div class="panel chart-panel" id="chartPanel"></div>

      <div class="split market-split">
        <div>
          <div class="cat-chips" id="catChips">
            ${cats().map(c => `<button class="btn small ${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
          </div>
          <div class="market-grid" id="mgrid"></div>
        </div>
        <aside class="panel">
          <h3>📜 Town crier</h3>
          <ul class="news">${headlines().map(h => `<li>${h}</li>`).join('')}</ul>
          <p class="small muted" style="margin-top:12px">Prices are in gold (gp), silver (sp) and copper (cp).
          ▲ red = more expensive, ▼ green = cheaper. Hover the big chart to see the price on any day.</p>
          ${readOnly ? '' : `<hr style="border-color:var(--line);margin:16px 0">
          <h3>✨ Add your own item</h3>
          <form id="itemForm" class="stack" autocomplete="off">
            <div><label>Name *</label><input name="name" required maxlength="50" placeholder="e.g. Dragon scale"></div>
            <div class="row">
              <div style="flex:2 1 90px"><label>Normal price *</label><input name="price" type="number" min="0.1" max="1000000" step="any" required placeholder="10"></div>
              <div style="flex:1 1 70px"><label>Coin</label><select name="coin"><option value="100">gp</option><option value="10">sp</option><option value="1">cp</option></select></div>
            </div>
            <div><label>Sold…</label><input name="unit" maxlength="30" placeholder="e.g. each, per pound, per night"></div>
            <div><label>Category</label><input name="cat" maxlength="30" list="catList" placeholder="e.g. Magic Items">
              <datalist id="catList">${cats().filter(c => c !== 'All').map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
            <div><label>What does the war do to it?</label><select name="war">${WAR_CHOICES.map(([v, l]) => `<option value="${v}" ${v === 1.3 ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div><label>How jumpy is the price?</label><select name="vol">${VOL_CHOICES.map(([v, l]) => `<option value="${v}" ${v === 0.016 ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <button class="btn primary" type="submit">+ Add to market</button>
          </form>
          ${(ms.hiddenItems || []).length ? `<hr style="border-color:var(--line);margin:16px 0">
          <h3>🗑 Deleted items (${ms.hiddenItems.length})</h3>
          <ul class="members">${ms.hiddenItems.map(id => ITEMS.find(i => i.id === id)).filter(Boolean).map(i =>
            `<li>${esc(i.name)} <span class="muted small">${esc(i.unit)}</span> <button class="btn small" data-restore="${i.id}" style="margin-left:auto">↩ Restore</button></li>`).join('')}</ul>
          <button class="btn small" id="restoreAll">↩ Restore all</button>` : ''}`}
        </aside>
      </div>
      </div>`;
    root.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { mview = b.dataset.view; render(root); });
    if (mview === 'magic') renderMagic();
    root.querySelector('#citySel').onchange = e => {
      ms.cityId = e.target.value || null; saveM(); for (const k in live) live[k] = 0; render(root);
    };
    root.querySelector('#liveBtn').onclick = () => { liveOn = !liveOn; startLive(); render(root); };
    root.querySelectorAll('#catChips [data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; render(root); });
    if (readOnly) { renderChartPanel(); renderGrid(); startLive(); return; }

    const sel = root.querySelector('#warLevel');
    const curLevel = (ms.events[ms.events.length - 1] || { level: 0 }).level;
    sel.value = String(curLevel);

    root.querySelector('#setWar').onclick = () => {
      const v = parseFloat(sel.value);
      ms.events = ms.events.filter(e => e.day < today());
      const prev = ms.events.length ? ms.events[ms.events.length - 1].level : 0;
      if (prev !== v) ms.events.push({ day: today(), level: v });
      saveM(); render(root);
      window.toast && window.toast('War status updated — prices will react over the coming days.');
    };
    root.querySelectorAll('[data-restore]').forEach(b => b.onclick = () => {
      ms.hiddenItems = ms.hiddenItems.filter(id => id !== b.dataset.restore); selected = b.dataset.restore; saveM(); render(root);
    });
    const ra = root.querySelector('#restoreAll');
    if (ra) ra.onclick = () => { ms.hiddenItems = []; saveM(); render(root); window.toast && window.toast('↩ All items are back.'); };
    root.querySelector('#itemForm').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries());
      const name = String(f.name).trim(), base = parseFloat(f.price) * parseInt(f.coin, 10);
      if (!name) return window.toast && window.toast('Your item needs a name!');
      if (!(base > 0) || base > 1e8) return window.toast && window.toast('Please type a sensible price.');
      const war = parseFloat(f.war), vol = parseFloat(f.vol);
      const it = { id: 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), custom: true, name,
        unit: String(f.unit).trim() || 'each', cat: String(f.cat).trim() || 'My Items', base,
        war: war > 0 ? war : 1, vol: vol > 0 ? vol : 0.016, lag: 5 };
      ms.customItems.push(it); selected = it.id; cat = 'All'; saveM(); render(root);
      window.toast && window.toast(`✨ ${name} is now sold at the market!`);
    };
    root.querySelector('#endDay').onclick = () => {
      endDay(); render(root);
      if (!window.Market.onDayEnd) window.toast && window.toast('🌙 A new day dawns. The market has moved.');
    };
    renderChartPanel(); renderGrid(); startLive();
  }

  function renderChartPanel() {
    const panel = root.querySelector('#chartPanel'); if (!panel) return;
    const vis = visibleItems();
    if (!vis.length) {
      panel.innerHTML = '<div class="empty">🧺 The market is empty. Add your own item, or restore deleted ones.</div>';
      return;
    }
    if (!cache[selected] || isHidden(selected) || !vis.some(i => i.id === selected)) selected = vis[0].id;
    const it = vis.find(i => i.id === selected);
    const all = cache[it.id], t = today(), now = livePrice(it.id), fw = firstWarDay();
    const prewar = fw !== null ? all[Math.max(0, fw - 1)] : all[Math.max(0, t - 14)];
    clampView();
    const shown = seriesFor(it.id).data;
    const [fN, fU] = bestUnit(view.from), [tN, tU] = bestUnit(view.to);
    const unitOpts = cur => UNITS.map(([u, l]) => `<option value="${u}" ${u === cur ? 'selected' : ''}>${l}</option>`).join('');
    const presets = [[7, '1W'], [14, '2W'], [30, '1M'], [91, '3M'], [182, '6M'], [365, '1Y'], [730, '2Y'], [t, 'All']];
    panel.innerHTML = `
      <div class="chart-head">
        <div>
          <h2 style="margin:0">${esc(it.name)} <span class="muted small">(${esc(it.unit)})</span></h2>
          <div class="big-price" id="bigPrice">${formatCoins(now)}</div>
          <div class="small">${pctHtml(pct(now, all[t - 1]))} today · ${pctHtml(pct(now, prewar))} since the war began</div>
        </div>
        <div class="row" style="flex:0 1 auto">
          ${(() => { const hit = view.to === 0 ? presets.findIndex(([d]) => Math.min(d, t) === view.from) : -1;
            return presets.map(([d, l], k) => `<button class="btn small ${k === hit ? 'on' : ''}" data-range="${d}">${l}</button>`).join(''); })()}
        </div>
      </div>
      <form class="row timepick" id="timePick" autocomplete="off">
        <span>🕰 Show from</span>
        <input type="number" name="fromN" min="0" step="any" value="${fN}" aria-label="from how long ago">
        <select name="fromU" aria-label="unit">${unitOpts(fU)}</select>
        <span>ago &nbsp;to</span>
        <input type="number" name="toN" min="0" step="any" value="${tN}" aria-label="until how long ago">
        <select name="toU" aria-label="unit">${unitOpts(tU)}</select>
        <span>ago</span>
        <button class="btn small primary" type="submit">Show</button>
      </form>
      <div class="small muted" id="viewLabel">Showing <b>${esc(agoText(view.from))}</b> → <b>${esc(agoText(view.to))}</b>
        · <span class="hide-touch">tip: drag across the chart to zoom in</span>
        ${view.to !== 0 || !presets.some(([d]) => Math.min(d, t) === view.from) ? ' · <button class="btn small" id="resetZoom" type="button">↺ Back to 2 years</button>' : ''}</div>
      <canvas class="chart-canvas" id="bigChart"></canvas>
      <div class="stats">
        <div class="stat"><div class="k">Normal price (rulebook)</div><div class="v">${formatCoins(it.base)}</div></div>
        <div class="stat"><div class="k">Before the war</div><div class="v">${formatCoins(prewar)}</div></div>
        <div class="stat"><div class="k">Lowest in this period</div><div class="v">${formatCoins(Math.min(...shown))}</div></div>
        <div class="stat"><div class="k">Highest in this period</div><div class="v">${formatCoins(Math.max(...shown))}</div></div>
        <div class="stat"><div class="k">A year ago</div><div class="v">${formatCoins(all[Math.max(0, t - 365)])}</div></div>
      </div>`;
    panel.querySelectorAll('[data-range]').forEach(b => b.onclick = () => { view = { from: +b.dataset.range, to: 0 }; hoverIdx = null; renderChartPanel(); });
    const rz = panel.querySelector('#resetZoom'); if (rz) rz.onclick = () => { view = { from: 730, to: 0 }; renderChartPanel(); };
    panel.querySelector('#timePick').onsubmit = e => {
      e.preventDefault();
      const f = e.target;
      const from = Math.round(parseFloat(f.fromN.value) * parseFloat(f.fromU.value));
      const to = Math.round(parseFloat(f.toN.value || 0) * parseFloat(f.toU.value));
      if (!(from >= 0) || !(to >= 0)) return window.toast && window.toast('Please type numbers.');
      if (from <= to) return window.toast && window.toast('"From" must be further back in time than "to".');
      if (from > t) window.toast && window.toast(`History only goes back ${agoText(t)}, so I showed all of it.`);
      view = { from, to }; hoverIdx = null; renderChartPanel();
    };
    const cv = panel.querySelector('#bigChart');
    const idxAt = ev => {
      const rect = cv.getBoundingClientRect(), x = ev.clientX - rect.left;
      const frac = (x - layout.pad.l) / (layout.w - layout.pad.l - layout.pad.r);
      return Math.round(Math.max(0, Math.min(1, frac)) * (layout.n - 1));
    };
    cv.onmousedown = ev => { if (!layout) return; ev.preventDefault(); drag = { a: idxAt(ev), b: idxAt(ev) }; };
    cv.onmousemove = ev => {
      if (!layout) return;
      hoverIdx = idxAt(ev); if (drag) drag.b = hoverIdx;
      drawBig();
    };
    cv.onmouseleave = () => { hoverIdx = null; drag = null; drawBig(); };
    cv.onmouseup = () => {
      if (!drag) return;
      const a = Math.min(drag.a, drag.b), b = Math.max(drag.a, drag.b); drag = null;
      if (b - a < 2) { drawBig(); return; }            // just a click, not a drag
      const start = t - view.from;
      view = { from: t - (start + a), to: t - (start + b) }; hoverIdx = null;
      renderChartPanel();
    };
    drawBig();
  }
  function drawBig() {
    const cv = root && root.querySelector('#bigChart'); if (!cv) return;
    const { data, start } = seriesFor(selected);
    layout = drawChart(cv, data, start, hoverIdx, drag);
  }

  function renderGrid() {
    const grid = root.querySelector('#mgrid'); if (!grid) return;
    const t = today(), fw = firstWarDay();
    if (!cats().includes(cat)) cat = 'All';
    const items = visibleItems().filter(i => cat === 'All' || i.cat === cat);
    grid.innerHTML = items.map(it => `
      <div class="mcard ${it.id === selected ? 'sel' : ''}" data-id="${it.id}">
        <div class="nm">${esc(it.name)}${!readOnly ? ` <button class="btn-x" title="Delete this item from the market" data-delitem="${it.id}">🗑</button>` : ''}</div>
        <div class="unit">${esc(it.unit)} · ${esc(it.cat)}${it.custom ? ' · ✨ yours' : ''}</div>
        <div class="pr" data-price="${it.id}">${formatCoins(livePrice(it.id))}</div>
        <div class="small" data-chg="${it.id}"></div>
        <canvas data-spark="${it.id}"></canvas>
      </div>`).join('');
    grid.querySelectorAll('[data-delitem]').forEach(b => b.onclick = e => {
      e.stopPropagation();
      const it = allItems().find(i => i.id === b.dataset.delitem);
      if (!it) return;
      if (it.custom) {
        if (!confirm(`Delete "${it.name}" from the market?\n\nThis is your own item, so it's gone for good.`)) return;
        ms.customItems = ms.customItems.filter(i => i.id !== it.id); delete live[it.id];
      } else {
        if (!confirm(`Delete "${it.name}" from the market?\n\n(You can bring it back later under "Deleted items".)`)) return;
        ms.hiddenItems = [...(ms.hiddenItems || []), it.id];
      }
      saveM(); render(root);
      window.toast && window.toast(`🗑 ${it.name} removed from the market.`);
    });
    grid.querySelectorAll('.mcard').forEach(c => c.onclick = () => {
      selected = c.dataset.id; hoverIdx = null;
      grid.querySelectorAll('.mcard').forEach(x => x.classList.toggle('sel', x === c));
      renderChartPanel();
      root.querySelector('#chartPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    for (const it of items) {
      const cv = grid.querySelector(`[data-spark="${it.id}"]`);
      const data = cache[it.id].slice(Math.max(0, t - 89), t + 1); data[data.length - 1] = livePrice(it.id);
      drawSpark(cv, data, fw !== null ? fw - Math.max(0, t - 89) : -1);
    }
    updateLiveNumbers(false);
  }

  function updateLiveNumbers(flash) {
    if (!root) return;
    const t = today(), fw = firstWarDay();
    for (const it of allItems()) {
      const el = root.querySelector(`[data-price="${it.id}"]`); if (!el) continue;
      const p = livePrice(it.id), old = parseFloat(el.dataset.v || p);
      el.textContent = formatCoins(p); el.dataset.v = p;
      if (flash && Math.abs(p - old) / old > 0.0005) {
        el.classList.remove('flash-up', 'flash-down'); void el.offsetWidth;
        el.classList.add(p > old ? 'flash-up' : 'flash-down');
      }
      const prewar = fw !== null ? cache[it.id][Math.max(0, fw - 1)] : cache[it.id][t - 1];
      root.querySelector(`[data-chg="${it.id}"]`).innerHTML = `${pctHtml(pct(p, cache[it.id][t - 1]))} today · ${pctHtml(pct(p, prewar))} war`;
    }
    const big = root.querySelector('#bigPrice');
    if (big) big.textContent = formatCoins(livePrice(selected));
  }

  function startLive() {
    clearInterval(timer);
    if (!liveOn) return;
    timer = setInterval(() => {
      if (!root || !document.body.contains(root) || !root.querySelector('#mgrid')) { clearInterval(timer); return; }
      tick(); updateLiveNumbers(true); drawBig();
    }, 2500);
  }


  // ================= MAGIC ITEMS =================
  const RAR_CLASS = { common: 'r-common', uncommon: 'r-uncommon', rare: 'r-rare', 'very rare': 'r-veryrare', legendary: 'r-legendary', artifact: 'r-artifact' };
  function magicMult(item) {
    const c = currentCity();
    let m = c ? (Number(c.priceMod) || 1) : 1;
    // the war makes weapons, armour and healing magic more expensive — most of all near the front
    if (item.type === 'Weapon' || item.type === 'Armor' || /Healing/.test(item.name)) m *= 1 + 0.5 * Math.min(1.5, levelAt(today())) * (c ? Number(c.warExposure) || 1 : 1);
    return m;
  }
  const gp = v => `${Math.round(v).toLocaleString()} gp`;
  const regionOk = (item, city) => item.source !== 'Frindeval' || (city && city.region === item.region);
  function shopToday(city) {
    const M = window.MAGIC, salt = (ms.magicSalt || {})[city.id] || 0;
    const r = M.rng(M.hash(city.id + ':' + today() + ':' + salt));
    const roll = 1 + Math.floor(r() * 100);
    const mod = (M.PLACE_MOD[city.type] ?? -10) + (M.SPECIAL_MOD[city.name] || 0);
    const total = roll + mod, row = M.D100.find(x => total <= x.max) || M.D100[M.D100.length - 1];
    const items = [];
    for (const [rar, dice] of Object.entries(row.stock)) {
      const d = /^(\d+)d(\d+)$/.exec(dice);
      let n = 0; if (d) for (let i = 0; i < +d[1]; i++) n += 1 + Math.floor(r() * +d[2]); else n = +dice;
      const pool = [];
      M.ITEMS.filter(i => i.rarity === rar && regionOk(i, city)).forEach(i => { for (let w = 0; w < (i.source === 'Frindeval' ? 4 : 1); w++) pool.push(i); });
      for (let k = 0; k < n && pool.length; k++) {
        const it = pool[Math.floor(r() * pool.length)];
        if (!items.includes(it)) items.push(it);
        for (let j = pool.length - 1; j >= 0; j--) if (pool[j] === it) pool.splice(j, 1);
      }
    }
    return { roll, mod, total, row, items };
  }
  function renderMagic() {
    const box = root.querySelector('#magicView'); if (!box || !window.MAGIC) return;
    const M = window.MAGIC, city = currentCity();
    const shop = city && city.type !== 'Dungeon' ? shopToday(city) : null;
    const q = mq.search.trim().toLowerCase();
    const list = M.ITEMS.filter(i => (!q || i.name.toLowerCase().includes(q) || (i.region || '').toLowerCase().includes(q))
      && (!mq.rarity || i.rarity === mq.rarity) && (!mq.source || i.source === mq.source))
      .sort((a, b) => M.RARITY_ORDER.indexOf(a.rarity) - M.RARITY_ORDER.indexOf(b.rarity) || a.name.localeCompare(b.name));
    const row = it => `<tr>
        <td><b>${esc(it.name)}</b>${it.text ? `<div class="small muted">${esc(it.text)}</div>` : ''}</td>
        <td><span class="rar ${RAR_CLASS[it.rarity]}">${esc(it.rarity)}</span></td>
        <td>${esc(it.type)}${it.attune ? ' <span title="Requires attunement">(A)</span>' : ''}</td>
        <td>${esc(it.source)}</td>
        <td class="num">${it.rarity === 'legendary' ? `<span class="muted">~${gp(it.price * magicMult(it))}</span>` : gp(it.price * magicMult(it))}</td>
        <td class="small">${esc(it.source === 'Frindeval' ? 'Only in: ' + it.region : M.WHERE[it.rarity])}</td></tr>`;
    box.innerHTML = `
      <div class="split market-split">
        <div class="stack">
          <div class="panel">
            <h2 style="margin:0">🔮 Magic shop ${city ? `in ${esc(city.name)}` : ''} <span class="small muted">· market day ${today() - 729 >= 0 ? '+' + (today() - 729) : ''}</span></h2>
            ${!city ? '<p class="muted">Pick a place with <b>📍</b> at the top to see what its magic shop has today.</p>'
              : !shop ? '<p class="muted">Nobody sells anything here… it\'s a dungeon.</p>'
              : `<p class="small">🎲 d100 rolled <b>${shop.roll}</b> ${shop.mod >= 0 ? '+' : '−'} ${Math.abs(shop.mod)} (${esc(city.type || 'place')}${M.SPECIAL_MOD[city.name] ? ', ' + esc(city.name) : ''}) = <b>${shop.total}</b> → ${esc(shop.row.text)}
                 ${readOnly ? '' : '<button class="btn small" id="reroll" style="margin-left:6px">🎲 Reroll</button>'}</p>
                 ${shop.items.length ? `<div class="mtable-wrap"><table class="mtable"><thead><tr><th>Item</th><th>Rarity</th><th>Type</th><th>Book</th><th>Price here</th><th></th></tr></thead>
                   <tbody>${shop.items.map(row).join('')}</tbody></table></div>` : '<p class="muted">The shelves are empty today. Try again tomorrow (🌙 End the day).</p>'}
                 <p class="small muted">Stock changes every day. Prices include the local price level${levelAt(today()) > 0 ? ' and the war (weapons, armour and healing cost more near the front)' : ''}.</p>`}
          </div>
          <div class="panel">
            <h3>📚 All magic items (${list.length})</h3>
            <div class="row" style="margin-bottom:10px">
              <input id="mqSearch" placeholder="🔍 Search items or regions…" value="${esc(mq.search)}" style="flex:2 1 200px">
              <select id="mqRarity" style="flex:1 1 120px"><option value="">All rarities</option>${M.RARITY_ORDER.slice(0, 5).map(r => `<option ${mq.rarity === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
              <select id="mqSource" style="flex:1 1 150px"><option value="">All books</option>${[['DMG', "Dungeon Master's Guide"], ['XGE', "Xanathar's Guide"], ['TCE', "Tasha's Cauldron"], ['Frindeval', '✨ Frindeval items']].map(([v, l]) => `<option value="${v}" ${mq.source === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
            </div>
            <div class="mtable-wrap"><table class="mtable"><thead><tr><th>Item</th><th>Rarity</th><th>Type</th><th>Book</th><th>Price${city ? ' here' : ''}</th><th>Where to find</th></tr></thead>
              <tbody>${list.map(row).join('')}</tbody></table></div>
            <p class="small muted">(A) = needs attunement. Prices use Xanathar's ranges per rarity (consumables half price). Rules text is in your books.</p>
          </div>
        </div>
        <aside class="stack">
          <div class="panel">
            <h3>🎲 d100: What's in the shop today?</h3>
            <p class="small muted">Roll d100 and add: Village −20, Town ±0, City +10, Castle ±0, Wilderness −40. Bonus: Kentia & Tuvar +10, Tavlar +15, Antvere/Odeila/Iceforge +5.</p>
            <table class="mtable d100"><thead><tr><th>Total</th><th>For sale</th></tr></thead><tbody>
              ${M.D100.map((r, i) => `<tr><td class="num">${i === 0 ? '≤ ' + r.max : (M.D100[i - 1].max + 1) + (r.max >= 999 ? '+' : '–' + r.max)}</td><td>${esc(r.text)}</td></tr>`).join('')}
            </tbody></table>
            <p class="small muted">Regional ✨ Frindeval items only appear in their own region's shops (4× more likely there). Legendary items and artifacts are never sold.</p>
          </div>
          ${readOnly ? '' : `<div class="panel">
            <h3>⚱️ The six Vestiges</h3>
            <p class="small muted">Artifacts of the Forgotten God. Never for sale. Each lies in a secret dungeon (🙈 hidden from players) — the challenge rises by 2 each time.</p>
            ${M.VESTIGES.map(v => `<details class="vestige"><summary><b>${v.n}. ${esc(v.name)}</b> <span class="rar r-artifact">CR ${v.cr}</span></summary>
              <div class="small muted">${esc(v.type)}</div>
              <p class="small prewrap">${esc(v.lore)}</p>
              <p class="small"><b>📍 ${esc(v.place)}:</b> ${esc(v.dungeon)}</p>
              <button class="btn small" data-vmap="${esc(v.place)}">🗺 Show on map</button></details>`).join('')}
          </div>`}
        </aside>
      </div>`;
    const rr = box.querySelector('#reroll');
    if (rr) rr.onclick = () => { ms.magicSalt = ms.magicSalt || {}; ms.magicSalt[city.id] = (ms.magicSalt[city.id] || 0) + 1; saveM(); renderMagic(); };
    const s1 = box.querySelector('#mqSearch');
    s1.oninput = e => { mq.search = e.target.value; const pos = e.target.selectionStart; renderMagic(); const i = root.querySelector('#mqSearch'); i.focus(); i.setSelectionRange(pos, pos); };
    box.querySelector('#mqRarity').onchange = e => { mq.rarity = e.target.value; renderMagic(); };
    box.querySelector('#mqSource').onchange = e => { mq.source = e.target.value; renderMagic(); };
    box.querySelectorAll('[data-vmap]').forEach(b => b.onclick = () => { if (window.World && window.World.showOnMapByName) window.World.showOnMapByName(b.dataset.vmap); });
  }

  function stop() { clearInterval(timer); root = null; }
  function reset() { const keep = { customItems: ms.customItems, hiddenItems: ms.hiddenItems || [], cityId: ms.cityId }; ms = { ...defaultMState(), ...keep }; saveM(); for (const k in live) live[k] = 0; }
  // move the world one day forward (prices + travellers)
  function endDay() {
    ms.daysAdvanced++; for (const k in live) live[k] = 0; saveM();
    if (window.Market.onDayEnd) window.Market.onDayEnd();
  }
  function setCity(id) { ms.cityId = id || null; saveM(); }
  function reload() { ms = loadM(); for (const k in live) live[k] = 0; cache = null; }
  function useState(s, opts = {}) { ms = sanitize(s); readOnly = !!opts.readOnly; for (const k in live) live[k] = 0; cache = null; }

  window.addEventListener('resize', () => { if (root && root.querySelector('#mgrid')) { drawBig(); renderGrid(); } });

  window.Market = { render, stop, reset, setCity, endDay, reload, useState, formatCoins, items: allItems, _state: () => ms };
})();
