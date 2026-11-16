/* =========================================================
   "IS THIS THE SAME PERSON?"
   Compares a new NPC (name, job, where met) with existing ones.
   Score 0..1. Used by players (auto-link) and by the DM (suggestions).
   ========================================================= */
(function () {
  const TITLES = /\b(jarl|jarlkona|lord|lady|sir|sultan|sultana|prince|princess|emir|emira|mayor|captain|thane|archmagister|speaker|warden|harbourmaster|harbormaster|elder|old|mother|high|priestess|grand|vizier|seeress|sister|master|the|of|a|an)\b/g;
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ð/g, 'd').replace(/[^a-z0-9 ]/g, ' ');
  const words = s => norm(s).replace(TITLES, ' ').split(/\s+/).filter(w => w.length > 1);
  function lev(a, b) { // how many letter changes to turn a into b
    if (a === b) return 0;
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  const ratio = (a, b) => (!a && !b) ? 1 : 1 - lev(a, b) / Math.max(a.length, b.length);
  function nameScore(a, b) {
    const A = words(a), B = words(b);
    if (!A.length || !B.length) return 0;
    const full = ratio(A.join(' '), B.join(' '));
    // each word of the shorter name matched to its best word in the other name ("Brom the smith" ~ "Brom Ironfoot")
    const [S, L] = A.length <= B.length ? [A, B] : [B, A];
    const per = S.reduce((t, w) => t + Math.max(...L.map(x => ratio(w, x))), 0) / S.length;
    const first = ratio(A[0], B[0]);
    return Math.max(full, per * 0.9, first >= 0.85 ? 0.75 : 0);
  }
  // candidate: { name, occupation, place } · other: same shape
  function score(c, o) {
    const n = nameScore(c.name, o.name);
    const place = c.place && o.place ? (ratio(norm(c.place).trim(), norm(o.place).trim()) > 0.8 ? 1 : 0) : 0.5;
    const cj = words(c.occupation), oj = words(o.occupation);
    // jobs match when a word is close or one contains the other ("smith" ~ "blacksmith"); job words in the name count too
    const nj = words(c.name);
    const jobLike = (w, x) => w.length > 3 && x.length > 3 && (x.includes(w) || w.includes(x) || ratio(w, x) > 0.8);
    const job = (cj.length || nj.length) && oj.length ? ([...cj, ...nj].some(w => oj.some(x => jobLike(w, x))) ? 1 : 0) : 0.5;
    return Math.min(1, n * 0.7 + place * 0.15 + job * 0.15);
  }
  // best match from a list; returns { item, score } or null
  function best(c, list, get = x => x) {
    let top = null;
    for (const item of list) { const s = score(c, get(item)); if (!top || s > top.score) top = { item, score: s }; }
    return top;
  }
  const AUTO_LINK = 0.7; // at or above this, a player's NPC is linked automatically
  window.Similar = { score, nameScore, best, AUTO_LINK, words };
})();
