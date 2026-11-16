/* =========================================================
   CLOUD (the "back of house")
   - Login with email + password (Supabase Auth)
   - Saves your world to a Supabase database, so it syncs between devices
   - Keeps a player-safe copy (no secrets) for the player view link
   - Asks the AI chef (a Supabase Edge Function) to invent NPCs
   If config.js is empty, everything stays "local only".
   ========================================================= */
(function () {
  const cfg = window.WORLD_KEEPER_CONFIG || {};
  const configured = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient);
  const sb = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const META_KEY = 'dnd-cloud-meta-v1';

  let meta = { ownerId: null, lastSyncedAt: null, dirty: false };
  try { meta = { ...meta, ...JSON.parse(localStorage.getItem(META_KEY) || '{}') }; } catch (e) { /* ignore */ }
  const saveMeta = () => { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) { /* ignore */ } };

  let user = null, row = null, timer = null, getPayload = null, applyRemote = null, busy = false;
  let status = configured ? 'signed-out' : 'local', statusMsg = '';
  const listeners = [];
  function setStatus(s, msg = '') { status = s; statusMsg = msg; listeners.forEach(f => { try { f(s, msg); } catch (e) { /* ignore */ } }); }

  function newCode() {
    const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(14));
    return Array.from(bytes, b => abc[b % abc.length]).join('');
  }

  async function init(opts) {
    getPayload = opts.getPayload; applyRemote = opts.applyRemote;
    if (!sb) { setStatus('local'); return; }
    const { data } = await sb.auth.getSession();
    user = data.session ? data.session.user : null;
    sb.auth.onAuthStateChange((_event, session) => {
      const u = session ? session.user : null;
      const changed = (u && u.id) !== (user && user.id);
      user = u;
      if (changed) { if (user) firstSync(); else { row = null; setStatus('signed-out'); } }
    });
    if (user) await firstSync(); else setStatus('signed-out');
    // when you come back to the tab, grab changes made on your other device
    window.addEventListener('focus', () => { if (user && !meta.dirty && !busy) pull(); });
    window.addEventListener('online', () => { if (user && meta.dirty) push(); });
  }

  async function fetchRow() {
    const { data, error } = await sb.from('worlds').select('data, updated_at, share_code').eq('owner', user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  // First time we see this account in this browser: decide which world wins.
  async function firstSync() {
    busy = true; setStatus('syncing');
    try {
      const remote = await fetchRow();
      row = remote ? { updated_at: remote.updated_at, share_code: remote.share_code } : null;
      if (!remote) { await push(); return; }                       // empty cloud: upload this world
      const sameOwner = meta.ownerId === user.id;
      if (sameOwner && meta.dirty) { await push(); return; }        // unsaved edits made on this device
      if (sameOwner && meta.lastSyncedAt && new Date(remote.updated_at) <= new Date(meta.lastSyncedAt)) { setStatus('synced'); return; }
      if (!sameOwner) {
        const n = (remote.data && Array.isArray(remote.data.npcs)) ? remote.data.npcs.length : 0;
        const local = getPayload().data.npcs.length;
        const useCloud = confirm(`You have a world saved in the cloud with ${n} NPCs.\n\nOK = use the CLOUD world on this device (this browser's world with ${local} NPCs is replaced — download a backup first if you need it)\nCancel = keep THIS browser's world and upload it to the cloud`);
        if (!useCloud) { await push(); return; }
      }
      applyRemote(remote.data);
      meta = { ownerId: user.id, lastSyncedAt: remote.updated_at, dirty: false }; saveMeta();
      setStatus('synced');
    } catch (e) {
      setStatus('error', friendly(e));
    } finally { busy = false; }
  }

  async function pull() {
    if (!user) return;
    try {
      const remote = await fetchRow();
      if (remote && (!meta.lastSyncedAt || new Date(remote.updated_at) > new Date(meta.lastSyncedAt))) {
        row = { updated_at: remote.updated_at, share_code: remote.share_code };
        applyRemote(remote.data);
        meta = { ownerId: user.id, lastSyncedAt: remote.updated_at, dirty: false }; saveMeta();
        setStatus('synced', 'Loaded changes from your other device');
      }
    } catch (e) { setStatus('error', friendly(e)); }
  }

  async function push() {
    if (!user) return;
    clearTimeout(timer); busy = true; setStatus('syncing');
    try {
      const p = getPayload();
      const rec = { owner: user.id, data: p.data, player_data: p.player, updated_at: new Date().toISOString() };
      if (!row || !row.share_code) rec.share_code = newCode();
      const { data, error } = await sb.from('worlds').upsert(rec, { onConflict: 'owner' }).select('updated_at, share_code').single();
      if (error) throw error;
      row = data;
      meta = { ownerId: user.id, lastSyncedAt: data.updated_at, dirty: false }; saveMeta();
      setStatus('synced');
    } catch (e) {
      setStatus('error', friendly(e));
    } finally { busy = false; }
  }

  // called by the app every time you change something
  function changed() {
    meta.dirty = true; if (user) meta.ownerId = meta.ownerId || user.id; saveMeta();
    if (!user) return;
    setStatus('pending');
    clearTimeout(timer); timer = setTimeout(push, 1500);
  }

  function friendly(e) {
    if (!navigator.onLine) return "You're offline. Changes are saved on this device and will upload when you're back online.";
    const m = (e && (e.message || e.error_description)) || String(e);
    if (/relation .*worlds.* does not exist|Could not find the table/i.test(m)) return 'The database table is missing. Run supabase/schema.sql (SETUP.md step 3).';
    return m;
  }

  async function signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === 'Email not confirmed' ? 'Please click the link in the email Supabase sent you first.' : error.message);
  }
  async function signUp(email, password) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.href.split('#')[0].split('?')[0] } });
    if (error) throw error;
    return data.session ? 'signed-in' : 'check-email';
  }
  async function signOut() { await sb.auth.signOut(); }

  async function regenerateLink() {
    if (!user) return;
    const { data, error } = await sb.from('worlds').update({ share_code: newCode() }).eq('owner', user.id).select('updated_at, share_code').single();
    if (error) throw error;
    row = data;
  }
  function playerLink() {
    if (!row || !row.share_code) return null;
    return new URL('player.html?w=' + encodeURIComponent(row.share_code), location.href.split('#')[0].split('?')[0]).href;
  }

  // Ask the AI chef (Edge Function "generate-npc") for a new NPC
  async function generateNpc(payload) {
    if (!sb) throw new Error('Cloud is not set up yet (see SETUP.md).');
    if (!user) throw new Error('Log in first (☁️ Cloud tab) to use the AI helper.');
    const { data, error } = await sb.functions.invoke('generate-npc', { body: payload });
    if (error) {
      let msg = error.message;
      try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch (e) { /* ignore */ }
      if (/Failed to send a request|not found/i.test(msg)) msg = 'The AI helper is not installed yet (SETUP.md step 6).';
      throw new Error(msg);
    }
    if (!data || !data.npc) throw new Error((data && data.error) || 'The AI helper sent back nothing.');
    return data.npc;
  }

  window.Cloud = {
    configured, init, changed, push, pull, signIn, signUp, signOut, regenerateLink, playerLink, generateNpc,
    onStatus: f => { listeners.push(f); f(status, statusMsg); },
    get user() { return user; }, get status() { return status; }, get statusMsg() { return statusMsg; },
    get lastSyncedAt() { return meta.lastSyncedAt; },
  };
})();
