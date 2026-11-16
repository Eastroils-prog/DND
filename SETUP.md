# ☁️ Phase 3 setup: switching on the cloud, login, player view and AI

**Time:** about 20–30 minutes. **Cost:** the cloud is free. The AI costs a few cents per NPC, and only if you switch it on.

🍽️ **Restaurant version:** your app is the dining room. Now we build the **kitchen in the back** (Supabase) where the food (your world) is stored, put a **lock on the kitchen door** (login), and hire an **AI chef** (Claude).

You only do steps 1–5 once. Step 6 (AI) is optional.

---

## Step 0: Put the website online (if you haven't yet)
1. Merge the branch `claude/gifted-meitner-dfv5pp` into `main` on GitHub (open a Pull Request, press **Merge**).
2. In your repo: **Settings → Pages**. Pick branch **main**, folder **/ (root)**, then **Save**.
3. After a minute you get a link like `https://YOUR-NAME.github.io/DND/`. Write it down. This is **your app link**.

## Step 1: Make a free Supabase account (the kitchen)
1. Go to **supabase.com** and sign up (you can use your GitHub account).
2. Click **New project**. Name it `world-keeper`. Make up a database password and **save it somewhere safe**. Pick the region closest to you.
3. Wait about 2 minutes while it's built.

## Step 2: Copy the two "address" values
1. In your Supabase project, open **Project Settings → API** (you may also find it under **Connect** or **API Keys**).
2. Copy the **Project URL**. It looks like `https://abcdefgh.supabase.co`.
3. Copy the **anon / public** key. It's a long text starting with `eyJ`, or a key starting with `sb_publishable_`.
4. On GitHub, open the file **`config.js`**, click the ✏️ pencil, and paste them between the quotes:
   ```js
   supabaseUrl: 'https://abcdefgh.supabase.co',
   supabaseAnonKey: 'eyJ.....',
   ```
5. Click **Commit changes**.

> ✅ These two values are *meant* to be public, like a restaurant's street address. The lock is in step 3.
> ❌ Never paste the **service_role** / **secret** key or your **Claude API key** into `config.js`!

## Step 3: Build the kitchen shelves + lock (the database)
1. In Supabase, open **SQL Editor → New query**.
2. Open the file **`supabase/schema.sql`** from this repo, copy **everything**, paste it in, and press **Run**.
3. It should say "Success". This makes the table for your world plus the "bouncer" rules: only you can read or change your world, and players can only see the safe copy.

## Step 4: Tell Supabase where your app lives
1. In Supabase, open **Authentication → URL Configuration**.
2. Set **Site URL** to **your app link** from step 0, e.g. `https://YOUR-NAME.github.io/DND/`.
3. Under **Redirect URLs**, add the same link and press **Save**. Now the "confirm your email" link sends you back to your app.

## Step 5: Create your account and lock the door
1. Open **your app link** → **☁️ Cloud & Backup** tab.
2. Type your email and a password (8+ characters) and press **Create account**.
3. Check your email, click the confirmation link, then press **Log in**.
4. You'll be asked whether to use the cloud world or this browser's world. Pick **Cancel** the first time, so this browser's world gets uploaded.
5. **Lock the door:** in Supabase open **Authentication → Sign In / Providers** (or **Settings**) and switch **off** "Allow new users to sign up". Now nobody else can make an account.

🎉 Now open your app link on your phone, log in with the same email and password, and your world is there too.

**Player view:** in the ☁️ tab, press **📋 Copy** next to the player link and send it to your players.
- They see only NPCs you've marked **👁 Players have met**, places that aren't secret, public factions and the market.
- They never see secrets.
- If the link leaks, press **Make a new link**.

---

## Step 6 (optional): Hire the AI chef 🤖
The AI needs a Claude API key. It lives **only in the kitchen** (Supabase), never on your website, so nobody can steal it.

1. **Get a key:**
   - Go to **console.anthropic.com**, sign up, and add a little credit under **Billing** (for example $5).
   - Open **API Keys → Create Key** and copy it. It starts with `sk-ant-`.
2. **Create the AI function:**
   - In Supabase, open **Edge Functions** and choose to deploy a new function **via the editor**.
   - Name it exactly **`generate-npc`**.
   - Delete the example code and paste in **everything** from the file `supabase/functions/generate-npc/index.ts`.
   - Press **Deploy**.
   - Leave "Verify JWT" (log-in check) **on**.
3. **Add the secrets:** in **Edge Functions → Secrets** (or **Project Settings → Edge Functions**), add two:

   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | your `sk-ant-...` key |
   | `ALLOWED_EMAILS` | your email (for more people, separate with commas: `me@mail.com,friend@mail.com`) |

4. **Try it:**
   - In the app, go to **🧙 NPCs** and press **🤖 AI NPC**.
   - Type something like "a nervous tavern keeper hiding an enemy soldier in the cellar", then press **Create NPC**.
   - Check the NPC (and their family), change anything you like, and press **Save**.

💰 Each AI NPC costs roughly a few US cents. You can set a monthly spending limit in console.anthropic.com → **Limits**.

> No AI? The **🎲 Random NPC** button always works for free, even offline.

---

## If something goes wrong
| You see… | Do this |
|---|---|
| ☁️ tab says "not switched on yet" | `config.js` is still empty or has a typo (step 2). Wait 1–2 minutes after committing; GitHub Pages needs time to update. |
| "The database table is missing" | Run `supabase/schema.sql` again (step 3). |
| "Please click the link in the email" | Confirm your email first (step 5), and check your spam folder. |
| "Your email is not on the AI guest list" | Add your email to `ALLOWED_EMAILS` (step 6.3). |
| "The AI helper is not installed yet" | The function must be named exactly `generate-npc` (step 6.2). |
| "The Claude API key is wrong" | Re-copy the key into `ANTHROPIC_API_KEY` (step 6.3). |
| ⚠️ Not synced / offline | Your changes are safe on this device and upload automatically when you're back online. |

**Two devices at once:** if you edit on your phone *and* laptop at the exact same time, the last one saved wins. Edit on one device at a time.
