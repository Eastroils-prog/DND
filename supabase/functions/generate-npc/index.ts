// =========================================================
// AI CHEF — Supabase Edge Function "generate-npc"
// Turns an idea like "a nervous tavern keeper with a secret" into a full NPC
// (optionally with family) using Claude.
//
// Your Claude API key lives ONLY here, as a Supabase secret (ANTHROPIC_API_KEY).
// It never goes to the browser, so nobody can steal it from your website.
// Who may use it: emails in ALLOWED_EMAILS, and the players of an admin whose email is in ALLOWED_EMAILS.
// Two jobs: { mode: "npc" } invents one NPC; { mode: "backstory" } reads a player's backstory
// and suggests family members and people from their past.
// =========================================================
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral",
  "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil",
];

const person = {
  name: { type: "string" },
  race: { type: "string" },
  gender: { type: "string" },
  age: { type: "string" },
  occupation: { type: "string" },
  description: { type: "string", description: "Looks, personality, how they talk. 2-4 sentences." },
};

// The exact shape Claude must answer in (structured outputs).
const SCHEMA = {
  type: "object",
  properties: {
    ...person,
    alignment: { type: "string", enum: ALIGNMENTS },
    secret: { type: "string", description: "A secret or plot hook only the DM knows. 1-3 sentences." },
    location: { type: "string", description: "Exactly one of the given location names, or an empty string." },
    relatives: {
      type: "array",
      description: "Family members to create too. Empty if family was not requested.",
      items: {
        type: "object",
        properties: { relation: { type: "string", enum: ["spouse", "child", "parent", "sibling"] }, ...person },
        required: ["relation", "name", "race", "gender", "age", "occupation", "description"],
        additionalProperties: false,
      },
    },
  },
  required: ["name", "race", "gender", "age", "occupation", "description", "alignment", "secret", "location", "relatives"],
  additionalProperties: false,
};

const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);

// ---------- backstory helper for players ----------
const BACKSTORY_SCHEMA = {
  type: "object",
  properties: {
    family: {
      type: "array",
      items: {
        type: "object",
        properties: {
          relation: { type: "string", enum: ["grandparent", "parent", "sibling", "spouse", "child", "other"] },
          name: { type: "string" }, race: { type: "string" }, alive: { type: "boolean" },
          notes: { type: "string", description: "1-2 sentences: who they are to the character." },
        },
        required: ["relation", "name", "race", "alive", "notes"],
        additionalProperties: false,
      },
    },
    npcs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" }, role: { type: "string", description: "e.g. old mentor, rival, the one who betrayed them" },
          race: { type: "string" }, place: { type: "string" },
          description: { type: "string", description: "1-3 sentences, ready to use at the table." },
        },
        required: ["name", "role", "race", "place", "description"],
        additionalProperties: false,
      },
    },
  },
  required: ["family", "npcs"],
  additionalProperties: false,
};
async function backstory(body: Record<string, unknown>) {
  const story = clip(body.backstory, 6000);
  if (story.trim().length < 20) return json({ error: "Write a few sentences of backstory first." }, 400);
  const who = [clip(body.name, 80), clip(body.race, 40), clip(body.cls, 40)].filter(Boolean).join(", ");
  const known = Array.isArray(body.existing) ? (body.existing as unknown[]).slice(0, 40).map((s) => clip(s, 80)).join("; ") : "";
  const prompt = [
    `A player in a D&D 5e campaign wrote this backstory for their character${who ? ` (${who})` : ""}:`,
    `<backstory>\n${story}\n</backstory>`,
    "Suggest the character's family members and the people from their past that this backstory mentions or clearly implies.",
    "Use names that appear in the backstory exactly as written; invent fitting names only for people who are mentioned without a name.",
    "Give at most 8 family members and 8 other people. Don't contradict the backstory.",
    known ? `Already listed (don't repeat): ${known}.` : "",
  ].filter(Boolean).join("\n");
  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: "You help tabletop RPG players flesh out their characters. Answer only with the requested JSON.",
      output_config: { effort: "medium", format: { type: "json_schema", schema: BACKSTORY_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") return json({ error: "The AI didn't want to work with that backstory. Try rewording it." }, 422);
    if (response.stop_reason === "max_tokens") return json({ error: "The AI's answer was too long. Please try again." }, 502);
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return json({ result: JSON.parse(text) });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return json({ error: "The Claude API key is wrong or missing (ANTHROPIC_API_KEY secret in Supabase)." }, 500);
    if (err instanceof Anthropic.RateLimitError) return json({ error: "Too many requests right now. Wait a minute and try again." }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: `Claude API error ${err.status}: ${err.message}` }, 502);
    if (err instanceof SyntaxError) return json({ error: "The AI sent back something unreadable. Please try again." }, 502);
    console.error(err);
    return json({ error: "Something went wrong in the AI helper." }, 500);
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  // 1) Who is asking? Must be logged in to YOUR app.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Please log in first." }, 401);

  // 2) Only emails on the guest list (and their players) may spend your AI credits.
  const allowed = (Deno.env.get("ALLOWED_EMAILS") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  let ok = allowed.includes((user.email ?? "").toLowerCase());
  if (!ok) {
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: m } = await service.from("members").select("owner, role").eq("user_id", user.id).maybeSingle();
    if (m && m.role === "player") {
      const { data: owner } = await service.auth.admin.getUserById(m.owner);
      ok = allowed.includes((owner?.user?.email ?? "").toLowerCase());
    }
  }
  if (!ok) return json({ error: "Your account may not use the AI helper. The DM can add their email to the ALLOWED_EMAILS secret." }, 403);

  if (!Deno.env.get("ANTHROPIC_API_KEY")) {
    return json({ error: "The AI helper isn't switched on yet: the DM must add the ANTHROPIC_API_KEY secret in Supabase (Edge Functions → Secrets)." }, 503);
  }

  // 3) Read the request (and keep it small).
  const body = await req.json().catch(() => ({}));
  if (body.mode === "backstory") return backstory(body);
  const idea = clip(body.idea, 600) || "a memorable NPC for a fantasy D&D town";
  const withFamily = Boolean(body.withFamily);
  const locations: string[] = Array.isArray(body.locations) ? body.locations.slice(0, 60).map((s: unknown) => clip(s, 80)) : [];
  const worldNote = clip(body.worldNote, 400);

  const prompt = [
    `Create one D&D 5e NPC based on this idea from the Dungeon Master: "${idea}".`,
    worldNote ? `What's happening in the world right now: ${worldNote}` : "",
    locations.length
      ? `Places in this world: ${locations.join("; ")}. Put the NPC in the one that fits best (copy its name exactly), or use "" if none fits.`
      : `There are no places yet, so use "" for location.`,
    withFamily
      ? "Also invent 2-4 family members (spouse, children, parents or siblings) who have their own personalities and maybe a family conflict."
      : "Do not invent relatives (relatives must be an empty list).",
    "Make them feel alive and easy to role-play: a clear voice, a want, and a hook the players can pull on. Avoid clichés and joke names.",
  ].filter(Boolean).join("\n");

  // 4) Ask Claude. The key is read from the ANTHROPIC_API_KEY secret automatically.
  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // if the main model declines, the API retries on a suitable fallback model
      system: "You are a creative assistant for a tabletop RPG Dungeon Master. Answer only with the requested JSON.",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "The AI didn't want to make that one. Try describing the NPC differently." }, 422);
    }
    if (response.stop_reason === "max_tokens") {
      return json({ error: "The AI's answer was too long. Please try again." }, 502);
    }
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const npc = JSON.parse(text);
    if (!withFamily) npc.relatives = [];
    return json({ npc });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return json({ error: "The Claude API key is wrong or missing (ANTHROPIC_API_KEY secret in Supabase)." }, 500);
    } else if (err instanceof Anthropic.RateLimitError) {
      return json({ error: "Too many requests right now. Wait a minute and try again." }, 429);
    } else if (err instanceof Anthropic.APIError) {
      return json({ error: `Claude API error ${err.status}: ${err.message}` }, 502);
    } else if (err instanceof SyntaxError) {
      return json({ error: "The AI sent back something unreadable. Please try again." }, 502);
    }
    console.error(err);
    return json({ error: "Something went wrong in the AI helper." }, 500);
  }
});
