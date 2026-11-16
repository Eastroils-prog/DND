# 🐉 World Keeper — D&D NPCs, Family Trees & Living Market

A web app for Dungeon Masters:
- 🧙 **NPCs**: add, edit, delete. Race, job, alignment, status, description, secret DM notes
- 🏰 **Locations**: places in your world, and who lives where
- 🌳 **Family trees**: link NPCs as parents, children, spouses and siblings, then see the tree
- 💰 **Living market**: about 30 items (beer, bread, healing potions, weapons, inn stays by comfort level…)
  with 2 years of price history and live-ticking prices. A war started 14 days ago and is still affecting prices.
- ⚙️ **Backup**: download and load your world as a file

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
| `PRD.md` | The plan and roadmap |

Your data is saved in your browser (localStorage). Download a backup regularly!
