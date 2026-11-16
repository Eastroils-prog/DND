// =========================================================
// AI CHEF — Supabase Edge Function "generate-npc"
// Turns an idea like "a nervous tavern keeper with a secret" into a full NPC
// (optionally with family) using Claude.
//
// Your Claude API key lives ONLY here, as a Supabase secret (ANTHROPIC_API_KEY).
// It never goes to the browser, so nobody can steal it from your website.
// Only logged-in users whose email is in ALLOWED_EMAILS may use it.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  // 1) Who is asking? Must be logged in to YOUR app.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Please log in first." }, 401);

  // 2) Only emails on the guest list may spend your AI credits.
  const allowed = (Deno.env.get("ALLOWED_EMAILS") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes((user.email ?? "").toLowerCase())) {
    return json({ error: "Your email is not on the AI guest list. Add it to the ALLOWED_EMAILS secret (SETUP.md step 6)." }, 403);
  }

  // 3) Read the request (and keep it small).
  const body = await req.json().catch(() => ({}));
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
      return json({ error: "The Claude API key is wrong or missing (SETUP.md step 6)." }, 500);
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
