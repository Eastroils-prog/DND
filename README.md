# 🐉 World Keeper — D&D NPCs, Family Trees & Living Market

A web app for Dungeon Masters:
- 🧙 **NPCs**: add, edit, delete. Race, job, alignment, status, description, secret DM notes
- 🏰 **Locations**: places in your world, and who lives where
- 🗺 **Maps**: your maps of Frindeval with clickable pins. Click a town to see its NPCs, or add your own maps
- 🌳 **Family trees**: link NPCs as parents, children, spouses and siblings, then see the tree
- 💰 **Living market**: about 30 items (beer, bread, healing potions, weapons, inn stays by comfort level…)
  with 2 years of price history and live-ticking prices. A war started 14 days ago and is still affecting prices.
- ⚜️ **Factions**: guilds, noble houses and cults, with ranks
- 🤝 **Relationships**: friends, rivals, enemies, employers, debts, secret hatreds
- 📷 **Portraits** and 🖨 **printable NPC cards** (player or DM version)
- 📍 **City prices**: every location has its own prices, and the war hits front-line towns hardest. ✨ You can add your own market items too
- ☁️ **Cloud** (Phase 3): log in, sync between phone and laptop, send players a **player-view link** with no secrets
- 🤖 **AI NPC** (writes NPCs + families with Claude) and 🎲 **Random NPC** (free, offline)
- 💾 **Backup**: download and load your world as a file

👉 **To switch on the cloud, login, player view and AI, follow [SETUP.md](SETUP.md).** Without it, everything still works in this browser.

## How to open it
**On your computer:** download this repo (green "Code" button → "Download ZIP"), unzip it and double-click `index.html`.

**As a website (free):** in this GitHub repo go to **Settings → Pages**. Under "Branch", pick the branch and `/ (root)`, then press **Save**.
After about a minute you'll get a link like `https://<your-name>.github.io/DND/`.

## Files
| File | What it is (restaurant version) |
|------|------|
| `index.html` | The front door and the dining room layout |
| `style.css` | The decorations: colors, fonts, spacing |
| `app.js` | The waiters: NPCs, locations, family tree, backup |
| `market.js` | The market kitchen that cooks up prices, history and the war |
| `world-data.js` | Your world, Frindeval: every place, house and starting NPC. The app loads this the first time |
| `maps/` | Your map pictures |
| `cloud.js` | The delivery van between your browser and the cloud kitchen (login + sync) |
| `config.js` | The kitchen's street address (your Supabase URL + public key) |
| `player.html` / `player.js` | The dining room for players (read-only, no secrets) |
| `supabase/schema.sql` | The kitchen shelves + lock (database table and security rules) |
| `supabase/functions/generate-npc/` | The AI chef (runs on Supabase, keeps your Claude key secret) |
| `SETUP.md` | Step-by-step guide to switch on Phase 3 |
| `PRD.md` | The plan and roadmap |

Your data is saved in your browser (localStorage). Download a backup regularly!
