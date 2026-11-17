/* =========================================================
   APP ON YOUR PHONE + NOTIFICATIONS
   - "📲 App" button: how to put Frindeval on the home screen
   - players can switch on notifications (new NPCs, maps, messages from the DM)
   ========================================================= */
(function () {
  const cfg = window.WORLD_KEEPER_CONFIG || {};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let installPrompt = null; // Android / desktop Chrome give us a real "Install" button
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isPhone = isIOS || isAndroid;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!cfg.vapidPublicKey;
  const b64ToBytes = b64 => { const s = atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); };

  async function notificationsOn() {
    if (!pushSupported() || Notification.permission !== 'granted') return false;
    const reg = await navigator.serviceWorker.getRegistration(); if (!reg) return false;
    return !!(await reg.pushManager.getSubscription());
  }
  async function enableNotifications(owner) {
    if (!pushSupported()) throw new Error(isIOS && !standalone() ? 'On iPhone, first add the app to your home screen and open it from there.' : 'This browser cannot show notifications.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Notifications were not allowed. You can allow them in your phone settings.');
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(cfg.vapidPublicKey) });
    const j = sub.toJSON();
    const { error } = await window.Cloud.sb.from('push_subscriptions').upsert({ endpoint: j.endpoint, owner, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
    if (error) throw new Error(error.message);
  }
  async function disableNotifications() {
    const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { await window.Cloud.sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
  }

  // ---------- the guide ----------
  function installSteps() {
    if (standalone()) return '<p>✅ <b>Frindeval is already on your home screen.</b> You are using the app right now.</p>';
    if (isIOS) return `<ol class="guide">
        <li>Open this page in <b>Safari</b> (the compass icon). Other browsers on iPhone can't add apps.</li>
        <li>Tap the <b>Share</b> button <span class="kbd">⬆︎</span> (the square with an arrow, at the bottom or top of the screen).</li>
        <li>Scroll down and tap <b>"Add to Home Screen"</b> <span class="kbd">➕</span>.</li>
        <li>Tap <b>Add</b>. The golden d20 <b>Frindeval</b> icon appears on your home screen.</li>
        <li>Open Frindeval <b>from that icon</b> and log in.</li></ol>`;
    if (installPrompt) return '<p>Tap the button to put Frindeval on your home screen:</p><button class="btn primary" id="pwaInstall">📲 Install Frindeval</button>';
    if (isAndroid) return `<ol class="guide">
        <li>Open this page in <b>Chrome</b>.</li>
        <li>Tap the <b>⋮</b> menu (top right).</li>
        <li>Tap <b>"Add to Home screen"</b> or <b>"Install app"</b>, then <b>Install</b>.</li>
        <li>Open Frindeval from the new icon and log in.</li></ol>`;
    return `<ol class="guide"><li>On a computer with <b>Chrome</b> or <b>Edge</b>: click the install icon <span class="kbd">⊕</span> at the right end of the address bar, then <b>Install</b>.</li>
        <li>On a phone: open this website and press <b>📲 App</b> again — it shows the steps for your phone.</li></ol>`;
  }
  async function notifySection(owner) {
    if (!owner) return `<h3>🔔 Notifications</h3><p class="small">As the DM you send them: when you share new NPCs or maps with players, their phones get a notification automatically. You can also send a message from <b>☁️ Cloud & Backup → 📣 Message your players</b>.</p>`;
    if (!pushSupported()) return `<h3>🔔 Notifications</h3><p class="small">${isIOS && !standalone()
      ? 'On iPhone, notifications only work in the app: first do the steps above, open Frindeval <b>from the home screen icon</b>, then press <b>📲 App</b> again.'
      : 'This browser cannot show notifications. Try Chrome (Android) or Safari after adding to the home screen (iPhone).'}</p>`;
    const on = await notificationsOn();
    return `<h3>🔔 Notifications</h3>
      <p class="small">Get a message on your phone when the DM gives you new NPCs or maps.</p>
      <button class="btn ${on ? '' : 'primary'}" id="pwaNotify">${on ? '🔕 Turn notifications off' : '🔔 Turn on notifications'}</button>
      <span class="small muted" id="pwaNotifyState">${on ? '✅ On for this device' : ''}</span>`;
  }
  async function openGuide(opts = {}) {
    let m = document.getElementById('pwaModal');
    if (!m) { m = document.createElement('div'); m.id = 'pwaModal'; m.className = 'modal'; document.body.appendChild(m); }
    m.innerHTML = `<div class="modal-card panel" role="dialog" aria-modal="true" aria-label="Frindeval app">
      <div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">📲 Frindeval on your phone</h2><button class="btn-x" id="pwaClose" aria-label="Close">✕</button></div>
      <div class="guide-head"><img src="icons/icon-192.png" alt="" width="56" height="56"><div class="small">Add Frindeval to your home screen and it opens like a real app — full screen, with its own golden d20 icon.</div></div>
      <h3>1. Put it on your home screen</h3>${installSteps()}
      ${await notifySection(opts.owner)}</div>`;
    m.hidden = false;
    const close = () => { m.hidden = true; };
    m.onclick = e => { if (e.target === m) close(); };
    document.getElementById('pwaClose').onclick = close;
    const ib = document.getElementById('pwaInstall');
    if (ib) ib.onclick = async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; openGuide(opts); };
    const nb = document.getElementById('pwaNotify');
    if (nb) nb.onclick = async () => {
      nb.disabled = true;
      try {
        if (await notificationsOn()) { await disableNotifications(); }
        else { await enableNotifications(opts.owner); }
        openGuide(opts);
      } catch (err) { document.getElementById('pwaNotifyState').textContent = '⚠️ ' + err.message; nb.disabled = false; }
    };
  }
  // small "📲 App" button in the top bar
  function addButton(getOpts) {
    const bar = document.querySelector('.topbar'); if (!bar || document.getElementById('appBtn')) return;
    const b = document.createElement('button'); b.id = 'appBtn'; b.className = 'btn small app-btn'; b.innerHTML = '📲 <span class="tl">App</span>';
    b.onclick = () => openGuide(getOpts ? getOpts() : {});
    const brand = bar.querySelector('.brand'); brand.after(b);
  }
  // a one-time hint on phones that aren't using the app yet
  function maybeHint(getOpts) {
    if (!isPhone || standalone()) return;
    try { if (localStorage.getItem('pwa-hint-done')) return; } catch (e) { return; }
    const h = document.createElement('div'); h.className = 'pwa-hint';
    h.innerHTML = `<img src="icons/icon-192.png" alt="" width="36" height="36"><div><b>Add Frindeval to your home screen</b><div class="small">Opens like an app${getOpts && getOpts().owner ? ', with notifications' : ''}.</div></div>
      <button class="btn small primary" id="hintHow">How?</button><button class="btn-x" id="hintX" aria-label="Close">✕</button>`;
    document.body.appendChild(h);
    const done = () => { h.remove(); try { localStorage.setItem('pwa-hint-done', '1'); } catch (e) { /* ignore */ } };
    h.querySelector('#hintX').onclick = done;
    h.querySelector('#hintHow').onclick = () => { done(); openGuide(getOpts ? getOpts() : {}); };
  }
  window.PWA = { openGuide, addButton, maybeHint, enableNotifications, notificationsOn, pushSupported, standalone, isIOS };
})();
