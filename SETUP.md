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

### Hosting on Vercel instead of GitHub Pages
1. Go to **vercel.com** → sign in with GitHub → **Add New… → Project** → pick the **DND** repository → **Import**.
2. Framework preset: **Other**. Leave the build command **empty** and the output directory as the **root** (`./`). Press **Deploy**.
3. You get a link like `https://dnd-xxxx.vercel.app`. Every time you merge into `main`, Vercel updates the site by itself.
4. Use **that** link wherever this guide says "your website" (Supabase **Site URL** in step 3, and the player link `…/player.html` in step 6).

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

**What players can do:** see the NPCs you mark **👁 Players have met**, **add NPCs they meet**, **make their own character** (backstory, family tree, people from their past), and **look at the maps** with the shared **⚑ party pin** (one per map — placing it again moves it). You see every character in the DM app's **🛡 Party** tab.
- If a player adds someone who looks like a known NPC (similar name, same job…), it is **linked automatically** and shows as a 📝 note on that NPC's card. They can press "✂️ Not the same person" if it's wrong.
- You see every player addition in **🧙 NPCs → 📝 From players**, with suggestions (including your secret NPCs, which players never see). Link it, or press **➕ Add as new NPC**.
- Maps show **no pins and no place names** from the app. Your map pictures have names painted in — in **🗺 Maps**, use **🎭 Add player version (no names)** to upload a version without labels (Inkarnate can export without text). Players then see that one.

## 📲 Phone app & notifications (already set up)
- Everyone can press **📲 App** at the top to see how to put Frindeval on their home screen (iPhone: Safari → Share → Add to Home Screen; Android: Chrome → ⋮ → Install app).
- Players press **🔔** (next to "+ Add an NPC you met") to switch on notifications. **On iPhone this only works after adding the app to the home screen and opening it from there** (Apple's rule, iOS 16.4 or newer).
- When you share new NPCs or maps, players' phones get a notification automatically. You can also send your own message in **☁️ Cloud & Backup → 📣 Message your players**.
- Behind the scenes: the `notify-players` Edge Function and the secrets `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in Supabase (already installed).

## Step 7: switch on the AI helper 🤖 (one secret to add)
The AI helper (`generate-npc`) is already installed, and your admin account (plus your players) may use it.
It only needs your Claude API key — a secret, so you add it yourself:
1. **console.anthropic.com** → sign up → **Billing**: add a little credit (e.g. $5) → **Limits**: set a monthly limit.
2. **API Keys → Create Key** → copy it (starts with `sk-ant-`). Never paste it in chat or on GitHub.
3. Supabase → **Edge Functions → Secrets → Add new secret**: Name `ANTHROPIC_API_KEY`, Value: your key → **Save**.
4. Done: **🤖 AI NPC** (DM app) and **🤖 Find family & people in my backstory** (players' 🛡 My character) now work. Each use costs a few cents.

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
