# PRD — D&D World Keeper (NPCs, Family Trees & Living Market)

## The idea in one sentence
A web app where a Dungeon Master keeps track of every NPC in their world — where they live,
who they are, who their family is — plus a "living" market where prices move every day and react
to world events (like the war that started two weeks ago).

## Who uses it
One Dungeon Master (you), on a laptop or phone, before and during game sessions.

## Core features
| # | Feature | What it does |
|---|---------|--------------|
| 1 | NPC roster | Add / edit / delete NPCs: name, race, gender, age, job, alignment, status (alive/dead/missing), location, description, secret DM notes. Search + filter by location. |
| 2 | Locations | Add / edit / delete places (city, village, tavern, castle…). See every NPC who lives there. |
| 3 | Family tree | Link NPCs as parent / child / spouse / sibling. Visual tree (grandparents → grandchildren). Click anyone to re-center the tree on them. |
| 4 | Living market | ~30 items (beer, bread, healing potions, weapons, inn stays per comfort level…). 2 years of daily price history with seasons, a bad harvest, inflation and a war that started 14 days ago. Prices "tick" live every few seconds. |
| 5 | DM market controls | Change war status (peace / skirmishes / full war / siege / ceasefire), "End the day" to move the world one day forward. |
| 6 | Factions & relationships | Guilds/houses/cults with ranks; friends, rivals, enemies, employers, debts. |
| 7 | City prices + custom items | Every location has its own prices depending on wealth and distance to the war; add your own market items. |
| 8 | Portraits & print | Upload NPC pictures; print player or DM cards. |
| 9 | Backup | Export your whole world to a file, import it back, reset. |

## Restaurant roadmap 🍔 → 🍽️ → 🏰
**Phase 1 — Food stand (DONE, today)**
Everything runs in the browser. Data is saved in the browser's own memory (localStorage).
No server, no account, free. Hosted on GitHub Pages.

**Phase 2 — Small restaurant (DONE)**
- ✅ Custom market items: your own goods, price, how the war affects them, how jumpy the price is
- ✅ Prices per city: each location has a price level and a "how close is the war?" setting (front-line towns pay a lot more)
- ✅ NPC portraits: upload a picture; it's shrunk automatically and shows in the list, NPC page, family tree and printed cards
- ✅ Factions: guilds, noble houses, cults… with ranks, headquarters, goals and secret notes
- ✅ Relationships beyond family: friend, rival, enemy, lover, employer/employee, mentor/student, owes money, secretly hates… (with notes)
- ✅ Printable NPC cards: player copy (no secrets) or DM copy, for one NPC, everyone in a location, or a whole faction

**Phase 3 — Full restaurant with front & back of house (DONE — needs your Supabase account, see SETUP.md)**
- ✅ Back of house: Supabase database. Your world syncs between phone + laptop. Works offline and catches up later.
- ✅ Locked door: login with email + password. Database rules (Row Level Security) mean only you can read or change your world.
- ✅ Dining room: a player-view link (`player.html`). Players see only NPCs marked "👁 Players have met", non-secret places,
  public factions and the live market. They never see secret notes, alignments, hidden NPCs or secret relationships.
  You can make a new link at any time, and the old one stops working.
- ✅ AI chef: "🤖 AI NPC" writes an NPC (plus family) from your idea, using Claude in a Supabase Edge Function. The API key
  stays on the server, and only emails on your guest list can use it.
- ✅ Free extra: "🎲 Random NPC" generator (no AI, works offline)

**Phase 4 — ideas for later**
- Relationship web picture (who likes/hates who)
- Session notes / timeline ("what happened in session 12")
- Players can leave notes on NPCs they've met
- Market items only sold in certain cities; shop inventories per NPC merchant

## Testing checklist (we test as we go)
1. ✅ Page loads with no errors
2. ✅ Buttons and forms work (add/edit/delete NPC, locations, relationships, market controls)
3. ✅ Real APIs: login, sync, player link and AI tested end-to-end against a pretend Supabase. Real test = SETUP.md
4. ✅ Security: everything you type is "escaped" so typing `<script>` into a name can't break or hack the page
