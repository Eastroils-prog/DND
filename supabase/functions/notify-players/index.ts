// =========================================================
// NOTIFY PLAYERS — Supabase Edge Function "notify-players"
// The admin (DM) calls this to send a phone notification to every player
// who switched notifications on, e.g. "3 new NPCs" or "A new map".
// Needs the secrets VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
// =========================================================
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await asCaller.auth.getUser();
  if (!user) return json({ error: "Please log in first." }, 401);
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: me } = await admin.from("members").select("role").eq("user_id", user.id).maybeSingle();
  if (me && me.role === "player") return json({ error: "Only the admin can send notifications." }, 403);

  const pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return json({ error: "Notifications are not set up yet (VAPID keys missing)." }, 500);
  webpush.setVapidDetails("mailto:admin@frindeval.app", pub, priv);

  const body = await req.json().catch(() => ({}));
  const payload = JSON.stringify({
    title: String(body.title ?? "Frindeval").slice(0, 80),
    body: String(body.body ?? "Something new is waiting for you.").slice(0, 300),
    url: String(body.url ?? "player.html").slice(0, 200),
    tag: String(body.tag ?? "frindeval").slice(0, 40),
  });

  // test mode: send to one given subscription (used to check the setup works)
  const subs = body.testSubscription
    ? [{ endpoint: body.testSubscription.endpoint, p256dh: body.testSubscription.keys.p256dh, auth: body.testSubscription.keys.auth }]
    : ((await admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("owner", user.id)).data ?? []);

  let sent = 0, removed = 0;
  const errors: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) { // the phone unsubscribed: forget it
        if (!body.testSubscription) await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        removed++;
      } else errors.push(`${status ?? ""} ${(e as Error).message}`.trim().slice(0, 200));
    }
  }));
  return json({ sent, removed, total: subs.length, errors });
});
