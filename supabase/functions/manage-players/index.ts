// =========================================================
// MANAGE PLAYERS — Supabase Edge Function "manage-players"
// Lets the admin (DM) create, list, reset and remove player accounts
// from inside the app. Only the admin of a world can use it.
// It uses Supabase's built-in service key, which never leaves the server.
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// usernames like "gustavs" become logins like "gustavs@frindeval.app" (no real email needed)
const PLAYER_DOMAIN = "frindeval.app";
const toEmail = (u: string) => (u.includes("@") ? u : `${u}@${PLAYER_DOMAIN}`).toLowerCase();
const cleanUser = (u: unknown) => String(u ?? "").trim().toLowerCase().slice(0, 60);

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

  // Only an admin may manage players: someone who is NOT a player in another world.
  const { data: me } = await admin.from("members").select("role, owner").eq("user_id", user.id).maybeSingle();
  if (me && me.role === "player") return json({ error: "Only the admin can manage players." }, 403);
  if (!me) await admin.from("members").insert({ user_id: user.id, owner: user.id, role: "admin", name: "Admin", username: user.email ?? "" });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action === "list") {
    const { data, error } = await admin.from("members").select("user_id, name, username, role, created_at").eq("owner", user.id).order("created_at");
    if (error) return json({ error: error.message }, 500);
    return json({ players: (data ?? []).filter((m) => m.role === "player") });
  }

  if (action === "create") {
    const username = cleanUser(body.username), name = String(body.name ?? username).trim().slice(0, 60);
    const password = String(body.password ?? "");
    if (!/^[a-z0-9._-]{2,40}$/.test(username) && !username.includes("@")) return json({ error: "Usernames can use letters, numbers, dots and dashes." }, 400);
    if (password.length < 8) return json({ error: "The password must be at least 8 characters." }, 400);
    const { data: created, error } = await admin.auth.admin.createUser({
      email: toEmail(username), password, email_confirm: true, user_metadata: { name, role: "player" },
    });
    if (error || !created.user) return json({ error: error?.message ?? "Could not create the account." }, 400);
    const { error: e2 } = await admin.from("members").insert({ user_id: created.user.id, owner: user.id, role: "player", name, username });
    if (e2) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: e2.message }, 500); }
    return json({ ok: true, player: { user_id: created.user.id, name, username } });
  }

  // reset & remove: only for players in YOUR world
  const target = String(body.user_id ?? "");
  const { data: member } = await admin.from("members").select("user_id, role, owner").eq("user_id", target).maybeSingle();
  if (!member || member.owner !== user.id || member.role !== "player") return json({ error: "That player is not in your world." }, 404);

  if (action === "reset") {
    const password = String(body.password ?? "");
    if (password.length < 8) return json({ error: "The password must be at least 8 characters." }, 400);
    const { error } = await admin.auth.admin.updateUserById(target, { password });
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  if (action === "remove") {
    const { error } = await admin.auth.admin.deleteUser(target); // their membership and notes go with them
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  return json({ error: "Unknown action." }, 400);
});
