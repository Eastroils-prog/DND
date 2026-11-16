# ☁️ Setup: cloud, logins, players (and the optional AI)

**Time:** about 30 minutes. **Cost:** free (the AI is optional and costs a few cents per NPC).

🍽️ **Restaurant version:** your app is the dining room. Supabase is the **kitchen** where your world is stored. Logins are the **lock on the door**: only you (the admin) can see and change the world. Your players get their own small room where they can add NPCs they meet and look at the maps.

---

## Step 1: Connect the app to your Supabase project
1. In Supabase, open your project → **Project Settings → API** (or **Connect / API Keys**).
2. Copy the **Project URL** (`https://xxxx.supabase.co`) and the **anon / public** key (`eyJ…` or `sb_publishable_…`).
3. Either **send both to Claude**, or put them in `config.js` yourself (GitHub → `config.js` → ✏️ → paste → **Commit changes**).

> ✅ These two are *meant* to be public, like a restaurant's street address.
> ❌ Never share the **service_role / secret** key or any passwords in chat or on GitHub.

## Step 2: Build the kitchen (database)
1. Supabase → **SQL Editor → New query**.
2. Copy **everything** from `supabase/schema.sql`, paste it, and press **Run**. It should say "Success".
   (It is safe to run again after every update.)

## Step 3: Lock the front door
1. Supabase → **Authentication → Sign In / Providers** → switch **off** "Allow new users to sign up". Only you create accounts.
2. Supabase → **Authentication → URL Configuration** → set **Site URL** to your website, e.g. `https://eastroils-prog.github.io/DND/`.

## Step 4: Make your admin account
1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Email: **`admin@frindeval.app`** (it doesn't have to be a real email) · Password: the admin password Claude gave you (or your own).
3. Tick **Auto Confirm User** and press **Create user**.
4. On the website, log in with username **`admin`** and that password.

## Step 5: Install the "player helper" (lets you make player accounts in the app)
1. Supabase → **Edge Functions → Deploy a new function → Via Editor**.
2. Name it exactly **`manage-players`**.
3. Delete the example code, paste **everything** from `supabase/functions/manage-players/index.ts`, and press **Deploy**. Leave "Verify JWT" **on**.

## Step 6: Make the player accounts
1. On the website: **☁️ Cloud & Backup → 👥 Players**.
2. Add each player: name, username, password (🎲 makes a random one):

   | Name | Username |
   |---|---|
   | Gustavs | `gustavs` |
   | Marsels | `marsels` |
   | Oskars | `oskars` |

3. Send each player their **username + password** privately, and the link: `https://eastroils-prog.github.io/DND/player.html`.

**What players can do:** see the NPCs you mark **👁 Players have met**, **add NPCs they meet**, and **look at the maps**. That's all.
- If a player adds someone who looks like a known NPC (similar name, same job…), it is **linked automatically** and shows as a 📝 note on that NPC's card. They can press "✂️ Not the same person" if it's wrong.
- You see every player addition in **🧙 NPCs → 📝 From players**, with suggestions (including your secret NPCs, which players never see). Link it, or press **➕ Add as new NPC**.
- Maps show **no pins and no place names** from the app. Your map pictures have names painted in — in **🗺 Maps**, use **🎭 Add player version (no names)** to upload a version without labels (Inkarnate can export without text). Players then see that one.

## Step 7 (optional): the AI helper 🤖
1. Get a Claude API key at **console.anthropic.com** (add a little credit, e.g. $5; set a monthly limit under **Limits**).
2. Supabase → Edge Functions → new function named **`generate-npc`** → paste `supabase/functions/generate-npc/index.ts` → Deploy.
3. Supabase → **Edge Functions → Secrets**: add `ANTHROPIC_API_KEY` = your `sk-ant-…` key and `ALLOWED_EMAILS` = `admin@frindeval.app`.

---

## ⚠️ Good to know: what the login does and doesn't protect
- ✅ Your **saved world** (every NPC, secret and change you make) lives in the database and can only be read by the admin login. Players only ever receive the player-safe copy.
- ⚠️ The **website files** on GitHub are public, including `world-data.js` — the *starting* version of Frindeval with its original secrets. A curious player who opens that file directly could read those starting secrets. If that matters to you, ask Claude to move the starting world out of the public files.

## If something goes wrong
| You see… | Do this |
|---|---|
| A red bar "Something went wrong" | Copy the text and send it to Claude. |
| The site looks old after an update | Press **Ctrl + Shift + R**. The version number (e.g. **v7**) next to the title shows which version you have. |
| "Wrong username or password" | Check spelling; usernames are lowercase. The admin can set a new password with 🔑. |
| "The player helper is not installed yet" | Do step 5 (the name must be exactly `manage-players`). |
| "The database table is missing" | Do step 2 again. |
| The yellow bar "Login is switched off" | `config.js` is still empty (step 1). |
