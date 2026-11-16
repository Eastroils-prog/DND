/* =========================================================
   VILLAGER GENERATOR
   Fills every place in Frindeval up to at least 10 people,
   with names, jobs, families and secrets that fit the region.
   It uses a fixed "seed" per place, so the same villagers are
   made every time (until you change them in the app).
   ========================================================= */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // ---------- cultures: names and races ----------
  const CULTURES = {
    norse: {
      races: ['Human', 'Human', 'Human', 'Human', 'Human', 'Human', 'Dwarf', 'Half-Elf', 'Halfling'],
      M: ['Arne', 'Bjarni', 'Dag', 'Egil', 'Finnr', 'Geir', 'Gisli', 'Hallvard', 'Ivar', 'Jostein', 'Ketil', 'Leif', 'Magnus', 'Njal', 'Odd', 'Ragnar', 'Sigurd', 'Snorri', 'Torstein', 'Ulfar', 'Vidar', 'Yngvi', 'Asbjorn', 'Brand', 'Eyvind', 'Grim', 'Hrolf', 'Kolbein', 'Orm', 'Skeggi'],
      F: ['Asa', 'Bodil', 'Dagny', 'Eir', 'Frida', 'Gudny', 'Helga', 'Inga', 'Jorunn', 'Ketilrid', 'Liv', 'Oddny', 'Ragnhild', 'Signy', 'Sif', 'Thora', 'Tove', 'Ulla', 'Valdis', 'Yrsa', 'Alfhild', 'Borghild', 'Gyda', 'Hallveig', 'Ragna', 'Saldis', 'Thurid', 'Vigdis', 'Aud', 'Herdis'],
      family: (father, gender) => `${father}${gender === 'Male' ? 'sson' : 'sdottir'}`.replace(/ss+on/, 'sson').replace(/ssdottir/, 'sdottir'),
      bynames: ['the Tall', 'Quickhand', 'Saltbeard', 'the Red', 'Longaxe', 'Oxfoot', 'the Quiet', 'Ravenhair', 'Stonefist', 'the Younger', 'Fairhair', 'Wolfskin'],
    },
    elf: {
      races: ['Elf', 'Elf', 'Elf', 'Elf', 'Half-Elf', 'Half-Elf', 'Half-Elf', 'Human'],
      M: ['Aelar', 'Beiro', 'Carric', 'Erevan', 'Galinndan', 'Hadarai', 'Ivellios', 'Laucian', 'Mindartis', 'Paelias', 'Quarion', 'Riardon', 'Soveliss', 'Thamior', 'Varis'],
      F: ['Adrie', 'Birel', 'Caelynn', 'Drusilia', 'Enna', 'Felosial', 'Ielenia', 'Keyleth', 'Leshanna', 'Mialee', 'Naivara', 'Quelenna', 'Sariel', 'Thia', 'Valanthe'],
      surnames: ['Amakiir', 'Galanodel', 'Holimion', 'Ilphelkiir', 'Liadon', 'Meliamne', 'Naïlo', 'Siannodel', 'Xiloscient', 'Vael', 'Moonbrook', 'Starquill'],
    },
    dwarf: {
      races: ['Dwarf', 'Dwarf', 'Dwarf', 'Dwarf', 'Dwarf', 'Dwarf', 'Gnome', 'Human'],
      M: ['Adrik', 'Baern', 'Brottor', 'Dain', 'Eberk', 'Fargrim', 'Gardain', 'Harbek', 'Kildrak', 'Morgran', 'Orsik', 'Rangrim', 'Thoradin', 'Tordek', 'Vondal'],
      F: ['Amber', 'Bardryn', 'Dagnal', 'Diesa', 'Eldeth', 'Gunnloda', 'Helja', 'Kathra', 'Kristryd', 'Mardred', 'Riswynn', 'Sannl', 'Torbera', 'Vistra', 'Hlin'],
      surnames: ['Deepvein', 'Ironfist', 'Frostbeard', 'Coalhammer', 'Stonehelm', 'Gorunn', 'Holderhek', 'Rumnaheim', 'Ashbeard', 'Copperpick'],
    },
    desert: {
      races: ['Human', 'Human', 'Human', 'Human', 'Human', 'Human', 'Half-Orc', 'Tiefling', 'Dragonborn', 'Halfling'],
      M: ['Amir', 'Basim', 'Dawud', 'Faris', 'Ghazi', 'Hakim', 'Idris', 'Jabir', 'Karim', 'Latif', 'Malik', 'Nabil', 'Omar', 'Qasim', 'Rashid', 'Saleh', 'Tariq', 'Wasim', 'Yahya', 'Zahir', 'Anwar', 'Hamza'],
      F: ['Aisha', 'Basma', 'Dalal', 'Farah', 'Ghada', 'Hala', 'Inaya', 'Jamila', 'Karima', 'Layla', 'Maysa', 'Nadia', 'Qadira', 'Rania', 'Salma', 'Tahira', 'Wafa', 'Yasmin', 'Zainab', 'Amal', 'Huda', 'Mariam'],
      surnames: ['al-Hadi', 'al-Rimal', 'al-Nakhla', 'al-Bahri', 'al-Qasr', 'al-Sayf', 'al-Najm', 'al-Turab', 'al-Waha', 'al-Jamal', 'al-Fajr', 'al-Ramli', 'al-Qamar', 'al-Zahra', 'al-Badr', 'al-Hilal', 'al-Saqr', 'al-Ghazal', 'al-Rih', 'al-Tal', 'al-Khalil', 'al-Dahab', 'al-Murjan', 'al-Sahra'],
    },
    western: {
      races: ['Human', 'Human', 'Human', 'Human', 'Human', 'Halfling', 'Half-Elf', 'Gnome', 'Dwarf', 'Half-Orc', 'Tiefling'],
      M: ['Aldo', 'Bram', 'Cedric', 'Doran', 'Edric', 'Fenn', 'Garret', 'Hollis', 'Jory', 'Lorne', 'Merrick', 'Osric', 'Pell', 'Rowan', 'Tobin', 'Wendel', 'Alaric', 'Corin'],
      F: ['Alba', 'Bryony', 'Cora', 'Della', 'Elowen', 'Fenna', 'Greta', 'Hester', 'Isolde', 'Juna', 'Maren', 'Nell', 'Orla', 'Petra', 'Rosalind', 'Tamsin', 'Wynne', 'Brisa'],
      surnames: ['Ashdown', 'Brightwater', 'Cobb', 'Dunmore', 'Fairweather', 'Greaves', 'Hollow', 'Marsh', 'Thorne', 'Wexley', 'Quill', 'Rookwood', 'Saltmarsh', 'Underhill'],
    },
  };
  const AGE = { Human: [16, 72], 'Half-Elf': [18, 140], Elf: [90, 600], Dwarf: [40, 280], Halfling: [18, 110], Gnome: [40, 350], 'Half-Orc': [15, 60], Tiefling: [16, 90], Dragonborn: [15, 70], Aasimar: [18, 120] };

  // ---------- jobs by kind of place ----------
  const JOBS = {
    farm: ['Farmer', 'Miller', 'Farmhand', 'Shepherd', 'Beekeeper', 'Granary clerk', 'Cart driver', 'Brewer', 'Blacksmith', 'Harvest priest', 'Wolf-kennel hand', 'Thatcher'],
    fishing: ['Fisher', 'Net-maker', 'Boatwright', 'Fish smoker', 'Eel trapper', 'Salt-gatherer', 'Lookout', 'Fisherwife', 'Oar-maker', 'Former raider', 'Ferryman', 'Mussel-picker'],
    city: ['Town guard', 'Innkeeper', 'Baker', 'Tailor', 'Scribe', 'Priest', 'Cooper', 'Alchemist', 'Beggar', 'Dockworker', 'Courier', 'Barber-surgeon', 'Tavern bard', 'Locksmith', 'Washerwoman', 'Stablemaster'],
    mine: ['Miner', 'Smelter', 'Rune-smith', 'Tunnel engineer', 'Ore-cart hauler', 'Gem cutter', 'Forge cook', 'Lamp-keeper', 'Ore assayer', 'Bellows-worker', 'Mine guard'],
    elf: ['Scribe', 'Librarian', 'Enchanter', 'Herbalist', 'Translator', 'Student of magic', 'Illuminator', 'Lamp-keeper', 'Archivist', 'Harpist', 'Star-reader', 'Bookbinder'],
    forest: ['Woodcutter', 'Hunter', 'Charcoal burner', 'Trapper', 'Sawmill worker', 'Herbalist', 'Resin-gatherer', 'Forester', 'Bowyer', 'Carpenter'],
    vinland: ['Shield-maiden', 'Berserker', 'Skald', 'Raider', 'Smith', 'Mead-brewer', 'Longship builder', 'Goatherd', 'Rune-carver', 'Sword-trainer', 'Thrall-turned-farmer'],
    warfront: ['Soldier', 'Refugee', 'Camp cook', 'Field medic', 'Scout', 'Quartermaster', 'Deserter', 'War widow', 'Gravedigger', 'Messenger', 'Looter'],
    desert: ['Caravan guard', 'Water-seller', 'Spice trader', 'Camel herder', 'Glassblower', 'Date farmer', 'Scribe', 'Dune guide', 'Well-digger', 'Potter', 'Weaver', 'Sultan\'s tax collector', 'Storyteller', 'Coffee-house keeper'],
    port: ['Dockworker', 'Ship\'s captain', 'Sailmaker', 'Harbour clerk', 'Fishmonger', 'Smuggler', 'Pearl diver', 'Rope-maker', 'Tavern keeper', 'Customs officer', 'Navigator', 'Cartographer'],
    corsair: ['Corsair', 'Harpooner', 'Rope-maker', 'Lookout', 'Prisoner', 'Fence', 'Ship\'s cook', 'Shipwright', 'Sail-mender', 'Deck boy', 'Quartermaster'],
    temple: ['Sun Priest', 'Acolyte', 'Pilgrim', 'Temple guard', 'Stonemason', 'Lamp-keeper', 'Scribe of the calendar', 'Beggar', 'Water-bearer'],
    falconry: ['Falconer', 'Falcon-keeper', 'Egg-warden', 'Rider in training', 'Fisher (feeds the falcons)', 'Guard', 'Healer of birds', 'Fletcher'],
    raiders: ['Raider', 'Raider', 'Boat-thief', 'Lookout', 'Captive', 'Cook', 'Fence', 'Spy', 'Rower'],
    wild: ['Hermit', 'Outlaw', 'Charcoal burner', 'Hunter', 'Witch', 'Lost traveller', 'Druid', 'Trapper', 'Madwoman of the woods'],
    isles: ['Castaway', 'Hermit', 'Shipwreck survivor', 'Seal-hunter', 'Storm-priest', 'Mad cartographer', 'Isle-born fisher', 'Wrecker'],
    mountain: ['Monk', 'Pilgrim', 'Goatherd', 'Mountain guide', 'Tomb-keeper', 'Hermit', 'Shrine cook', 'Healer'],
    village: ['Farmer', 'Fisher', 'Herder', 'Smith', 'Midwife', 'Carpenter', 'Tavern keeper', 'Miller', 'Weaver', 'Hunter'],
  };
  const KIND_BY_KEY = {
    iceforge: 'mine', tavlar: 'elf', valheim: 'vinland', falconisle: 'falconry', raidercoves: 'raiders', isles: 'isles', elbrus: 'mountain',
    darkforest: 'wild', steppyramid: 'temple', orch: 'corsair', mags: 'corsair', fult: 'corsair', gahts: 'corsair',
    frosthold: 'warfront', sunapa: 'warfront', titansgate: 'warfront', amkor: 'warfront',
    edgefield: 'farm', topfield: 'farm', midfield: 'farm', lihulinn: 'farm', haddar: 'farm',
    fishbuck: 'fishing', waterhold: 'fishing', deephaven: 'fishing', jarlus: 'fishing', vilts: 'forest', mizuts: 'forest', jurija: 'forest',
    eldermere: 'forest', lidlanda: 'forest', edgeport: 'port', odeila: 'port', wolve: 'port', drangar: 'port', porssand: 'port', hafr: 'port', siglunes: 'port',
    tuvar: 'desert', jullt: 'desert', mares: 'desert', brokey: 'desert',
  };
  const CULTURE_BY_REGION = {
    'Northeast Frindeval — Clan Veyra': 'norse', Otherside: 'norse', 'The Fields': 'norse', 'Dead Basin': 'norse', Vinland: 'norse',
    'Falk Forests': 'norse', 'Dark Forest coast': 'norse', 'The War Front (north)': 'norse',
    'The Wastelands': 'desert', 'The Dunes (Sultanate)': 'desert',
  };
  const CULTURE_BY_KEY = { tavlar: 'elf', iceforge: 'dwarf' };

  const LOOKS = ['has a crooked nose and a booming laugh', 'is missing two fingers', 'has ink-stained fingers', 'has a burn scar on one cheek',
    'always wears a faded blue scarf', 'is very tall and stoops through doorways', 'has bright, nervous eyes', 'is covered in flour', 'has a soldier\'s posture',
    'wears a necklace of fish bones', 'has one grey eye and one brown', 'smells of smoke', 'has braided hair down to the waist', 'is round and red-cheeked',
    'has a deep, slow voice', 'has freckles everywhere', 'walks with a limp', 'wears far too much jewellery', 'has calloused, enormous hands', 'is thin as a rake'];
  const MANNER = ['Talks very fast when nervous.', 'Never makes eye contact.', 'Calls everyone "friend".', 'Hums old songs while working.', 'Laughs at their own jokes.',
    'Whispers, as if someone is listening.', 'Is extremely polite — suspiciously so.', 'Complains about prices constantly.', 'Quotes old proverbs.', 'Bites their nails.',
    'Asks travellers for news of the war.', 'Is proud of their work and shows it to anyone.', 'Gossips about the nobles.', 'Distrusts outsiders.', 'Offers food to every guest.',
    'Speaks slowly and chooses every word.', 'Swears colourfully.', 'Is always tired.', 'Tells long stories that go nowhere.', 'Is kind to children and animals.'];
  const SECRETS = {
    any: ['Owes money to the wrong people.', 'Is secretly in love with a married neighbour.', 'Stole something valuable years ago and hid it under the floor.',
      'Is hiding a relative who deserted from the army.', 'Has a talent for magic and hides it.', 'Writes anonymous letters to the local ruler.',
      'Knows a hidden path nobody else uses.', 'Is not who they claim to be — they arrived here under a false name.', 'Saw something strange at night and told no one.',
      'Waters down what they sell.', 'Is saving coins to run away.', 'Was once a thief, and old friends have found them.', 'Has a sibling working for the enemy.',
      'Found an old map and does not know what it leads to.'],
    norse: ['Buys stolen goods from the Dead Basin raiders.', 'Worships the old gods in secret.', 'Believes the Jarl is cursed.', 'Sells information to House Ulfgarðr.',
      'Hides a wolf pup that escaped the Ulfgarðr kennels.', 'Lost family to the raiders and plans revenge.'],
    desert: ['Avoids the water-tax by digging a secret well.', 'Reports gossip to the Grand Vizier\'s spies.', 'Smuggles goods for the Red Isle Corsairs.',
      'Has heard the knocking under the Step Pyramid.', 'Is a runaway from the corsair isles.', 'Loves the prince from afar and writes poems about him.'],
    wild: ['Is slowly turning into something of the forest.', 'Knows what really lives in the red waters.', 'Has a price on their head in Kentia.'],
  };
  const ALIGN = ['Lawful Good', 'Neutral Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'True Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil'];
  const TRADER_JOBS = { norse: 'Travelling merchant', elf: 'Book trader', dwarf: 'Ore trader', desert: 'Caravan trader', western: 'Peddler' };

  // ---------- road graph (for picking trader routes) ----------
  function neighbours(roads, key) {
    const out = [];
    for (const [a, b, d] of roads) { if (a === key) out.push([b, d]); else if (b === key) out.push([a, d]); }
    return out;
  }
  function reachable(roads, start, maxDays) { // places within maxDays, nearest first
    const dist = { [start]: 0 }, queue = [start];
    while (queue.length) {
      queue.sort((x, y) => dist[x] - dist[y]);
      const k = queue.shift();
      for (const [n, d] of neighbours(roads, k)) {
        const nd = dist[k] + d;
        if (nd <= maxDays && (dist[n] === undefined || nd < dist[n])) { dist[n] = nd; queue.push(n); }
      }
    }
    return Object.keys(dist).filter(k => k !== start).sort((a, b) => dist[a] - dist[b]);
  }

  // =========================================================
  // ANCESTORS: everyone gets parents and grandparents (2 generations).
  // Nobles get their family line traced 5 generations back.
  // =========================================================
  const LIFESPAN = { Human: 80, 'Half-Elf': 180, Elf: 700, Dwarf: 350, Halfling: 150, Gnome: 450, 'Half-Orc': 70, Tiefling: 100, Dragonborn: 80, Aasimar: 160 };
  const GAP = { Human: [18, 38], 'Half-Elf': [20, 60], Elf: [90, 250], Dwarf: [45, 100], Halfling: [20, 45], Gnome: [40, 120], 'Half-Orc': [15, 30], Tiefling: [18, 40], Dragonborn: [15, 30], Aasimar: [20, 50] };
  const TITLES = /^(Jarl|Lord|Lady|Sultan|Sultana|Prince|Princess|Emir|Emira|Mayor|Captain|Thane|Archmagister|Speaker|Warden|Harbourmaster|Elder|Old Mother|Old|High Priestess|Grand Vizier|Seeress|Sister|Master|Headwoman)\s+/;
  const DEATHS = {
    norse: ['Died of a winter fever.', 'Lost at sea in a storm.', 'Killed by Dead Basin raiders.', 'Died old and grey by the fire.', 'Fell in a border skirmish.', 'Drowned in the Dead Basin.', 'Taken by wolves in a hard winter.', 'Died in childbirth.', 'Crushed by a falling tree.', 'Died of the red cough.'],
    desert: ['Died of thirst in a sandstorm.', 'Taken by corsairs and never seen again.', 'Died old in the shade of the palms.', 'Stung by a dune scuttler.', 'Died of the summer fever.', 'Lost with a caravan in the deep desert.', 'Died peacefully after the pilgrimage.'],
    elf: ['Faded peacefully after six centuries.', 'Died in the Holy War.', 'Sailed west and never returned.', 'Died guarding the library.'],
    dwarf: ['Killed in a tunnel collapse.', 'Died at the anvil, hammer in hand.', 'Fell in a battle under the mountain.', 'Died of the black lung.'],
    western: ['Died of plague.', 'Lost at sea.', 'Died old in bed.', 'Killed by bandits on the road.', 'Died of a fever.'],
  };
  const NOBLE_HOUSES = {
    veyra: { title: m => m ? 'Jarl' : 'Jarlkona', occ: (m) => m ? 'Jarl of Clan Veyra' : 'Jarlkona of Clan Veyra', byname: true },
    ulfgardr: { sur: 'Ulfgarðr', title: m => m ? 'Lord' : 'Lady', occ: () => 'Head of House Ulfgarðr' },
    kaldgeirr: { sur: 'Kaldgeirr', title: m => m ? 'Lord' : 'Lady', occ: () => 'Head of House Kaldgeirr' },
    falk: { sur: 'Falk', title: m => m ? 'Lord' : 'Lady', occ: () => 'Head of House Falk' },
    sultanate: { title: m => m ? 'Sultan' : 'Sultana', occ: m => m ? 'Sultan of Tuvar' : 'Sultana of Tuvar' },
  };
  window.FRINDEVAL_ANCESTORS = function (W) {
    const byKey = {}; W.npcs.forEach(n => { byKey[n.key] = n; });
    const locByKey = {}; W.locations.forEach(l => { locByKey[l.key] = l; });
    const nobleFac = new Set(W.factions.filter(f => f.type === 'Noble house').map(f => f.key));
    const used = new Set(W.npcs.map(n => n.name));
    const isNoble = n => (n.factions || []).some(([f]) => nobleFac.has(f));
    const houseOf = n => { const f = (n.factions || []).find(([k]) => nobleFac.has(k)); return f ? f[0] : null; };
    const cultureOf = n => CULTURE_BY_KEY[n.loc] || (locByKey[n.loc] && CULTURE_BY_REGION[locByKey[n.loc].region]) || 'western';
    const added = [];
    function split(name) { // "Lord Sten Ulfgarðr" -> { first: 'Sten', sur: 'Ulfgarðr' }
      const core = String(name).replace(TITLES, '').replace(TITLES, '');
      const parts = core.split(' ');
      return { first: parts[0], sur: parts.slice(1).join(' ') };
    }
    function parentRaces(race, r) {
      if (race === 'Half-Elf') return r() < 0.5 ? ['Human', 'Elf'] : ['Elf', 'Human'];
      if (race === 'Aasimar') return ['Human', 'Human'];
      if (race === 'Tiefling') return r() < 0.5 ? ['Tiefling', 'Human'] : ['Human', 'Tiefling'];
      return [race, race];
    }
    function makeParents(child, gen, noble) {
      const r = mulberry32(hash('ancestors:' + child.key));
      const pick = a => a[Math.floor(r() * a.length)];
      const cultKey = child.cult || cultureOf(child), C = CULTURES[cultKey];
      const { sur } = split(child.name);
      // people who married INTO a house (e.g. Sigrid) come from their own family, not the house line
      const marriedIn = c => c.gender === 'Female' && c.spouse && byKey[c.spouse] && houseOf(byKey[c.spouse]) && houseOf(byKey[c.spouse]) === houseOf(c);
      const house = child.house !== undefined && child.house !== null ? child.house : (noble && !child.ancestor && !marriedIn(child) ? houseOf(child) : null);
      const H = house && NOBLE_HOUSES[house];
      const NOBLE_JOBS = { norse: ['Landholder', 'Hersir (local chieftain)', 'Shipowner', 'Old court thane'], desert: ['Merchant prince', 'Emir', 'Vizier of the old court'], elf: ['Elder of Tavlar'], dwarf: ['Hall-lord'], western: ['Landed knight', 'Wealthy merchant'] };
      // father's first name: Norse children carry it in their surname (Sigurdsson -> Sigurd)
      let fatherFirst = null;
      if (C.family && sur) fatherFirst = C.M.find(m => C.family(m, child.gender || 'Male') === sur) || null;
      const [fr, mr] = parentRaces(child.race || 'Human', r);
      const CF = fr === 'Elf' ? CULTURES.elf : fr === 'Dwarf' ? CULTURES.dwarf : C;
      const CM = mr === 'Elf' ? CULTURES.elf : mr === 'Dwarf' ? CULTURES.dwarf : C;
      const childAge = parseInt(child.age, 10) || 40;
      const unique = make => { let nm = make(), t = 0; while (used.has(nm) && t++ < 25) nm = make(); if (used.has(nm)) { let i = 2; while (used.has(`${nm} ${['', '', 'II', 'III', 'IV', 'V', 'VI'][i] || i}`)) i++; nm = `${nm} ${['', '', 'II', 'III', 'IV', 'V', 'VI'][i] || i}`; } used.add(nm); return nm; };
      const people = [['Male', fr, CF], ['Female', mr, CM]].map(([g, race, CC], idx) => {
        const [g1, g2] = GAP[race] || GAP.Human;
        const age = childAge + g1 + Math.floor(r() * (g2 - g1));
        const life = (LIFESPAN[race] || 80) * (0.7 + r() * 0.35);
        const dead = age > life || r() < 0.12 * gen;
        const deathAge = dead ? Math.max(g1 + 5, Math.min(age, Math.round(life))) : age;
        let first, last;
        if (idx === 0) {
          first = fatherFirst || pick(CC.M);
          if (H && H.sur) last = H.sur;
          else if (CC.family) last = CC === C && C.family ? C.family(pick(C.M), 'Male') : pick(CC.surnames || ['']);
          else last = (CC === C && sur && !C.family) ? sur : pick(CC.surnames);
          if (CC.family && H && H.byname) last = `the ${pick(['Grey', 'Bold', 'Wise', 'Stern', 'Old', 'Red', 'Strong', 'Silent', 'Fair', 'Iron-Willed'])}`;
        } else {
          first = pick(CC.F);
          last = CC.family ? CC.family(pick(CC.M), 'Female') : pick(CC.surnames);
        }
        const title = H && idx === 0 ? H.title(true) + ' ' : H && idx === 1 ? H.title(false) + ' ' : '';
        const name = unique(() => `${title}${idx === 0 && fatherFirst ? first : (idx === 0 ? pick(CC.M) : pick(CC.F))} ${last}`.trim());
        const kind = KIND_BY_KEY[child.loc] || 'village';
        const occ = H ? H.occ(idx === 0) : noble ? pick(NOBLE_JOBS[cultKey] || NOBLE_JOBS.western) : pick(JOBS[kind] || JOBS.village);
        const deaths = DEATHS[cultKey] || DEATHS.western;
        const desc = dead ? `${pick(deaths)}` : `${(() => { const l = pick(LOOKS); return l[0].toUpperCase() + l.slice(1); })()}. ${pick(MANNER)}`;
        return {
          key: `anc_${child.key}_${idx ? 'm' : 'f'}`, name, race, gender: g, age: String(dead ? deathAge : age), occupation: occ,
          alignment: pick(ALIGN), status: dead ? 'Dead' : 'Alive', description: desc, notes: '',
          loc: dead ? null : child.loc, generated: true, ancestor: true, cult: cultKey, house: idx === 0 && H ? house : null, factions: H && !dead ? [[house, idx === 0 ? 'Elder of the house' : 'Elder of the house']] : [],
        };
      });
      people[1].spouse = people[0].key;
      people.forEach(p => { W.npcs.push(p); byKey[p.key] = p; added.push(p); });
      child.parents = [people[0].key, people[1].key];
      return people;
    }
    // need: generations back on both sides · line: generations back along the family line (nobles: 5)
    function ensure(n, need, line, gen) {
      if (need <= 0 && line <= 0) return;
      let parents = (n.parents || []).map(k => byKey[k]).filter(Boolean);
      if (!parents.length) parents = makeParents(n, gen, line > 2);
      const [father, mother] = parents;
      if (father) ensure(father, need - 1, line - 1, gen + 1);
      if (mother) ensure(mother, need - 1, 0, gen + 1);
    }
    const start = W.npcs.slice(); // only people who already exist start a tree
    start.forEach(n => { if (n.loc && locByKey[n.loc] && locByKey[n.loc].type !== 'Dungeon') ensure(n, 2, isNoble(n) ? 5 : 0, 1); });
    return added.length;
  };

  // Adds villagers to W.npcs (and travel routes to W.movers) until every place has at least `perPlace` people.
  window.FRINDEVAL_GENERATE = function (W, perPlace = 10) {
    W.movers = W.movers || {};
    const count = {};
    W.npcs.forEach(n => { count[n.loc] = (count[n.loc] || 0) + 1; });
    const usedNames = new Set(W.npcs.map(x => x.name));
    const loners = new Set(['wild', 'raiders', 'isles', 'mountain', 'temple', 'falconry']);
    const noTraders = new Set(['raidercoves', 'falconisle', 'darkforest', 'isles', 'elbrus', 'steppyramid', 'titansgate', 'amkor']);
    for (const L of W.locations) {
      if (L.type === 'Dungeon') continue; // nobody lives in the Vestige dungeons
      const need = perPlace - (count[L.key] || 0);
      if (need <= 0) continue;
      const r = mulberry32(hash('frindeval:' + L.key));
      const pick = a => a[Math.floor(r() * a.length)];
      const cultureKey = CULTURE_BY_KEY[L.key] || CULTURE_BY_REGION[L.region] || 'western';
      const C = CULTURES[cultureKey];
      const kind = KIND_BY_KEY[L.key] || (L.type === 'Village' ? 'village' : 'city');
      const used = new Set();
      const firstName = g => { let n, tries = 0; do { n = pick(C[g === 'Male' ? 'M' : 'F']); } while (used.has(n) && ++tries < 20); used.add(n); return n; };
      const ageOf = (race, lo, hi) => { const [a, b] = AGE[race] || AGE.Human; lo = Math.max(a, lo ?? a); hi = Math.min(b, hi ?? b); return Math.round(lo + r() * Math.max(1, hi - lo)); };
      const surname = (gender, father) => C.family ? C.family(father, gender) : pick(C.surnames);
      const desc = () => { const l = pick(LOOKS); return `${l[0].toUpperCase()}${l.slice(1)}. ${pick(MANNER)}`; };
      const secret = () => pick(r() < 0.5 ? SECRETS.any : (SECRETS[cultureKey] || SECRETS.any).concat(kind === 'wild' ? SECRETS.wild : []));
      const made = [];
      let n = 0;
      // make sure no two people in the world share a full name
      const unique = (make) => { let nm = make(), tries = 0; while (usedNames.has(nm) && tries++ < 30) nm = make(); usedNames.add(nm); return nm; };
      const add = o => { const key = `gen_${L.key}_${n++}`; W.npcs.push({ key, loc: L.key, generated: true, alignment: pick(ALIGN), description: desc(), notes: secret(), ...o }); made.push(key); return key; };

      // 1–2 families first (parents + children), then single people
      const families = loners.has(kind) ? 0 : need >= 6 ? 2 : need >= 3 ? 1 : 0;
      let left = need;
      for (let f = 0; f < families && left >= 3; f++) {
        const race = pick(C.races);
        let fatherFirst = '';
        const famName = C.family ? null : pick(C.surnames);
        const fAge = ageOf(race, (AGE[race] || AGE.Human)[0] + 12, (AGE[race] || AGE.Human)[1] - 10);
        const job = pick(JOBS[kind]);
        const dad = add({ name: unique(() => { fatherFirst = firstName('Male'); return `${fatherFirst} ${famName || surname('Male', pick(C.M))}`; }), race, gender: 'Male', age: String(fAge), occupation: job });
        const mum = add({ name: unique(() => `${firstName('Female')} ${famName || surname('Female', pick(C.M))}`), race, gender: 'Female', age: String(Math.max(16, fAge + Math.round(r() * 10 - 5))), occupation: pick(JOBS[kind]), spouse: dad });
        const kids = Math.min(left - 2, 1 + Math.floor(r() * 2));
        for (let k = 0; k < kids; k++) {
          const g = r() < 0.5 ? 'Male' : 'Female';
          const kAge = Math.max(1, Math.round(fAge * (0.15 + r() * 0.3)));
          add({ name: unique(() => `${firstName(g)} ${famName || surname(g, fatherFirst)}`), race, gender: g, age: String(kAge),
            occupation: kAge < 12 ? 'Child' : `Apprentice ${job.toLowerCase()}`, parents: [dad, mum] });
        }
        left -= 2 + kids;
      }
      const traders = noTraders.has(L.key) ? 0 : (L.type === 'City' ? 2 : L.type === 'Town' ? 1 : (L.type === 'Village' ? 1 : 0));
      for (let i = 0; i < left; i++) {
        const g = r() < 0.5 ? 'Male' : 'Female', race = pick(C.races);
        const isTrader = i < traders;
        const name = unique(() => `${firstName(g)} ${C.family ? (r() < 0.4 ? pick(C.bynames) : surname(g, pick(C.M))) : pick(C.surnames)}`);
        const key = add({ name, race, gender: g, age: String(ageOf(race, (AGE[race] || AGE.Human)[0] + 2)), occupation: isTrader ? TRADER_JOBS[cultureKey] : pick(JOBS[kind]) });
        if (isTrader && W.roads) {
          const near = reachable(W.roads, L.key, 6).filter(k => !noTraders.has(k));
          if (near.length) {
            const stops = [L.key, ...near.slice(0, 1 + Math.floor(r() * 3))];
            W.movers[key] = { kind: 'trader', route: stops };
          }
        }
      }
    }
    return W;
  };
})();
