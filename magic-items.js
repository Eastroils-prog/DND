/* =========================================================
   MAGIC ITEMS
   - Items from the Dungeon Master's Guide (DMG), Xanathar's Guide (XGE)
     and Tasha's Cauldron (TCE): name, rarity, type, attunement, source.
     (Rules text is in your books — this is a shop list, not a rulebook.)
   - 30 Frindeval items made for your regions
   - The six Vestiges (artifacts, never for sale)
   - The d100 table that decides what a town's magic shop has today
   Prices follow Xanathar's price ranges per rarity; consumables cost half.
   ========================================================= */
(function () {
  // "Name;rarity;type;attunement(A or -);source"
  const RAW = `
Adamantine Armor;uncommon;Armor;-;DMG
Alchemy Jug;uncommon;Wondrous;-;DMG
Ammunition, +1;uncommon;Weapon;-;DMG
Ammunition, +2;rare;Weapon;-;DMG
Ammunition, +3;very rare;Weapon;-;DMG
Amulet of Health;rare;Wondrous;A;DMG
Amulet of Proof against Detection and Location;uncommon;Wondrous;A;DMG
Amulet of the Planes;very rare;Wondrous;A;DMG
Animated Shield;very rare;Armor;A;DMG
Apparatus of Kwalish;legendary;Wondrous;-;DMG
Armor of Invulnerability;legendary;Armor;A;DMG
Armor of Resistance;rare;Armor;A;DMG
Armor of Vulnerability;rare;Armor;A;DMG
Armor, +1;rare;Armor;-;DMG
Armor, +2;very rare;Armor;-;DMG
Armor, +3;legendary;Armor;-;DMG
Arrow-Catching Shield;rare;Armor;A;DMG
Arrow of Slaying;very rare;Weapon;-;DMG
Bag of Beans;rare;Wondrous;-;DMG
Bag of Holding;uncommon;Wondrous;-;DMG
Bag of Tricks;uncommon;Wondrous;-;DMG
Bead of Force;rare;Wondrous;-;DMG
Belt of Dwarvenkind;rare;Wondrous;A;DMG
Belt of Hill Giant Strength;rare;Wondrous;A;DMG
Belt of Frost Giant Strength;very rare;Wondrous;A;DMG
Belt of Fire Giant Strength;very rare;Wondrous;A;DMG
Belt of Cloud Giant Strength;legendary;Wondrous;A;DMG
Belt of Storm Giant Strength;legendary;Wondrous;A;DMG
Berserker Axe;rare;Weapon;A;DMG
Boots of Elvenkind;uncommon;Wondrous;-;DMG
Boots of Levitation;rare;Wondrous;A;DMG
Boots of Speed;rare;Wondrous;A;DMG
Boots of Striding and Springing;uncommon;Wondrous;A;DMG
Boots of the Winterlands;uncommon;Wondrous;A;DMG
Bowl of Commanding Water Elementals;rare;Wondrous;-;DMG
Bracers of Archery;uncommon;Wondrous;A;DMG
Bracers of Defense;rare;Wondrous;A;DMG
Brazier of Commanding Fire Elementals;rare;Wondrous;-;DMG
Brooch of Shielding;uncommon;Wondrous;A;DMG
Broom of Flying;uncommon;Wondrous;-;DMG
Candle of Invocation;very rare;Wondrous;A;DMG
Cape of the Mountebank;rare;Wondrous;-;DMG
Carpet of Flying;very rare;Wondrous;-;DMG
Censer of Controlling Air Elementals;rare;Wondrous;-;DMG
Chime of Opening;rare;Wondrous;-;DMG
Circlet of Blasting;uncommon;Wondrous;-;DMG
Cloak of Displacement;rare;Wondrous;A;DMG
Cloak of Elvenkind;uncommon;Wondrous;A;DMG
Cloak of Protection;uncommon;Wondrous;A;DMG
Cloak of the Bat;rare;Wondrous;A;DMG
Cloak of the Manta Ray;uncommon;Wondrous;-;DMG
Crystal Ball;very rare;Wondrous;A;DMG
Cube of Force;rare;Wondrous;A;DMG
Cubic Gate;legendary;Wondrous;-;DMG
Dagger of Venom;rare;Weapon;-;DMG
Decanter of Endless Water;uncommon;Wondrous;-;DMG
Deck of Illusions;uncommon;Wondrous;-;DMG
Deck of Many Things;legendary;Wondrous;-;DMG
Defender;legendary;Weapon;A;DMG
Demon Armor;very rare;Armor;A;DMG
Dimensional Shackles;rare;Wondrous;-;DMG
Dragon Scale Mail;very rare;Armor;A;DMG
Dragon Slayer;rare;Weapon;-;DMG
Dust of Disappearance;uncommon;Wondrous;-;DMG
Dust of Dryness;uncommon;Wondrous;-;DMG
Dwarven Plate;very rare;Armor;-;DMG
Dwarven Thrower;very rare;Weapon;A;DMG
Efreeti Bottle;very rare;Wondrous;-;DMG
Elemental Gem;uncommon;Wondrous;-;DMG
Elven Chain;rare;Armor;-;DMG
Eversmoking Bottle;uncommon;Wondrous;-;DMG
Eyes of Charming;uncommon;Wondrous;A;DMG
Eyes of the Eagle;uncommon;Wondrous;A;DMG
Figurine of Wondrous Power (Silver Raven);uncommon;Wondrous;-;DMG
Figurine of Wondrous Power (Ebony Fly);rare;Wondrous;-;DMG
Figurine of Wondrous Power (Obsidian Steed);very rare;Wondrous;-;DMG
Flame Tongue;rare;Weapon;A;DMG
Folding Boat;rare;Wondrous;-;DMG
Frost Brand;very rare;Weapon;A;DMG
Gauntlets of Ogre Power;uncommon;Wondrous;A;DMG
Gem of Brightness;uncommon;Wondrous;-;DMG
Gem of Seeing;rare;Wondrous;A;DMG
Giant Slayer;rare;Weapon;-;DMG
Glamoured Studded Leather;rare;Armor;-;DMG
Gloves of Missile Snaring;uncommon;Wondrous;A;DMG
Gloves of Swimming and Climbing;uncommon;Wondrous;A;DMG
Goggles of Night;uncommon;Wondrous;-;DMG
Hammer of Thunderbolts;legendary;Weapon;A;DMG
Handy Haversack;rare;Wondrous;-;DMG
Hat of Disguise;uncommon;Wondrous;A;DMG
Headband of Intellect;uncommon;Wondrous;A;DMG
Helm of Brilliance;very rare;Wondrous;A;DMG
Helm of Comprehending Languages;uncommon;Wondrous;-;DMG
Helm of Telepathy;uncommon;Wondrous;A;DMG
Helm of Teleportation;rare;Wondrous;A;DMG
Holy Avenger;legendary;Weapon;A;DMG
Horn of Blasting;rare;Wondrous;-;DMG
Horn of Valhalla (Silver);rare;Wondrous;-;DMG
Horseshoes of Speed;rare;Wondrous;-;DMG
Horseshoes of a Zephyr;very rare;Wondrous;-;DMG
Immovable Rod;uncommon;Rod;-;DMG
Instant Fortress;rare;Wondrous;-;DMG
Ioun Stone (Protection);rare;Wondrous;A;DMG
Ioun Stone (Mastery);legendary;Wondrous;A;DMG
Iron Bands of Bilarro;rare;Wondrous;-;DMG
Iron Flask;legendary;Wondrous;-;DMG
Javelin of Lightning;uncommon;Weapon;-;DMG
Lantern of Revealing;uncommon;Wondrous;-;DMG
Luck Blade;legendary;Weapon;A;DMG
Mace of Disruption;rare;Weapon;A;DMG
Mace of Smiting;rare;Weapon;-;DMG
Mace of Terror;rare;Weapon;A;DMG
Mantle of Spell Resistance;rare;Wondrous;A;DMG
Manual of Bodily Health;very rare;Wondrous;-;DMG
Mariner's Armor;uncommon;Armor;-;DMG
Medallion of Thoughts;uncommon;Wondrous;A;DMG
Mirror of Life Trapping;very rare;Wondrous;-;DMG
Mithral Armor;uncommon;Armor;-;DMG
Necklace of Adaptation;uncommon;Wondrous;A;DMG
Necklace of Fireballs;rare;Wondrous;-;DMG
Necklace of Prayer Beads;rare;Wondrous;A;DMG
Nine Lives Stealer;very rare;Weapon;A;DMG
Oathbow;very rare;Weapon;A;DMG
Oil of Etherealness;rare;Potion;-;DMG
Oil of Sharpness;very rare;Potion;-;DMG
Oil of Slipperiness;uncommon;Potion;-;DMG
Pearl of Power;uncommon;Wondrous;A;DMG
Periapt of Health;uncommon;Wondrous;-;DMG
Periapt of Proof against Poison;rare;Wondrous;-;DMG
Periapt of Wound Closure;uncommon;Wondrous;A;DMG
Philter of Love;uncommon;Potion;-;DMG
Pipes of Haunting;uncommon;Wondrous;-;DMG
Pipes of the Sewers;uncommon;Wondrous;A;DMG
Portable Hole;rare;Wondrous;-;DMG
Potion of Animal Friendship;uncommon;Potion;-;DMG
Potion of Climbing;common;Potion;-;DMG
Potion of Fire Breath;uncommon;Potion;-;DMG
Potion of Flying;very rare;Potion;-;DMG
Potion of Hill Giant Strength;uncommon;Potion;-;DMG
Potion of Healing;common;Potion;-;DMG
Potion of Greater Healing;uncommon;Potion;-;DMG
Potion of Superior Healing;rare;Potion;-;DMG
Potion of Supreme Healing;very rare;Potion;-;DMG
Potion of Heroism;rare;Potion;-;DMG
Potion of Invisibility;very rare;Potion;-;DMG
Potion of Mind Reading;rare;Potion;-;DMG
Potion of Poison;uncommon;Potion;-;DMG
Potion of Resistance;uncommon;Potion;-;DMG
Potion of Speed;very rare;Potion;-;DMG
Potion of Water Breathing;uncommon;Potion;-;DMG
Restorative Ointment;uncommon;Wondrous;-;DMG
Ring of Animal Influence;rare;Ring;-;DMG
Ring of Djinni Summoning;legendary;Ring;A;DMG
Ring of Evasion;rare;Ring;A;DMG
Ring of Feather Falling;rare;Ring;A;DMG
Ring of Free Action;rare;Ring;A;DMG
Ring of Invisibility;legendary;Ring;A;DMG
Ring of Jumping;uncommon;Ring;A;DMG
Ring of Mind Shielding;uncommon;Ring;A;DMG
Ring of Protection;rare;Ring;A;DMG
Ring of Regeneration;very rare;Ring;A;DMG
Ring of Resistance;rare;Ring;A;DMG
Ring of Spell Storing;rare;Ring;A;DMG
Ring of Swimming;uncommon;Ring;-;DMG
Ring of Telekinesis;very rare;Ring;A;DMG
Ring of the Ram;rare;Ring;A;DMG
Ring of Three Wishes;legendary;Ring;-;DMG
Ring of Warmth;uncommon;Ring;A;DMG
Ring of Water Walking;uncommon;Ring;-;DMG
Ring of X-ray Vision;rare;Ring;A;DMG
Robe of Eyes;rare;Wondrous;A;DMG
Robe of Stars;very rare;Wondrous;A;DMG
Robe of the Archmagi;legendary;Wondrous;A;DMG
Robe of Useful Items;uncommon;Wondrous;-;DMG
Rod of Absorption;very rare;Rod;A;DMG
Rod of Alertness;very rare;Rod;A;DMG
Rod of Lordly Might;legendary;Rod;A;DMG
Rod of Rulership;rare;Rod;A;DMG
Rod of Security;very rare;Rod;-;DMG
Rod of the Pact Keeper, +1;uncommon;Rod;A;DMG
Rope of Climbing;uncommon;Wondrous;-;DMG
Rope of Entanglement;rare;Wondrous;-;DMG
Scarab of Protection;legendary;Wondrous;A;DMG
Scimitar of Speed;very rare;Weapon;A;DMG
Sending Stones;uncommon;Wondrous;-;DMG
Sentinel Shield;uncommon;Armor;-;DMG
Shield, +1;uncommon;Armor;-;DMG
Shield, +2;rare;Armor;-;DMG
Shield, +3;very rare;Armor;-;DMG
Shield of Missile Attraction;rare;Armor;A;DMG
Slippers of Spider Climbing;uncommon;Wondrous;A;DMG
Sovereign Glue;legendary;Wondrous;-;DMG
Spell Scroll (Cantrip);common;Scroll;-;DMG
Spell Scroll (1st level);common;Scroll;-;DMG
Spell Scroll (2nd level);uncommon;Scroll;-;DMG
Spell Scroll (3rd level);uncommon;Scroll;-;DMG
Spell Scroll (4th level);rare;Scroll;-;DMG
Spell Scroll (5th level);rare;Scroll;-;DMG
Spell Scroll (6th level);very rare;Scroll;-;DMG
Spell Scroll (7th level);very rare;Scroll;-;DMG
Spell Scroll (8th level);very rare;Scroll;-;DMG
Spell Scroll (9th level);legendary;Scroll;-;DMG
Spellguard Shield;very rare;Armor;A;DMG
Sphere of Annihilation;legendary;Wondrous;-;DMG
Staff of Charming;rare;Staff;A;DMG
Staff of Fire;very rare;Staff;A;DMG
Staff of Frost;very rare;Staff;A;DMG
Staff of Healing;rare;Staff;A;DMG
Staff of Power;very rare;Staff;A;DMG
Staff of Striking;very rare;Staff;A;DMG
Staff of Swarming Insects;rare;Staff;A;DMG
Staff of the Magi;legendary;Staff;A;DMG
Staff of the Python;uncommon;Staff;A;DMG
Staff of the Woodlands;rare;Staff;A;DMG
Staff of Thunder and Lightning;very rare;Staff;A;DMG
Staff of Withering;rare;Staff;A;DMG
Stone of Controlling Earth Elementals;rare;Wondrous;-;DMG
Stone of Good Luck (Luckstone);uncommon;Wondrous;A;DMG
Sun Blade;rare;Weapon;A;DMG
Sword of Life Stealing;rare;Weapon;A;DMG
Sword of Sharpness;very rare;Weapon;A;DMG
Sword of Wounding;rare;Weapon;A;DMG
Talisman of Pure Good;legendary;Wondrous;A;DMG
Talisman of Ultimate Evil;legendary;Wondrous;A;DMG
Tome of Clear Thought;very rare;Wondrous;-;DMG
Trident of Fish Command;uncommon;Weapon;A;DMG
Universal Solvent;legendary;Wondrous;-;DMG
Vicious Weapon;rare;Weapon;-;DMG
Vorpal Sword;legendary;Weapon;A;DMG
Wand of Binding;rare;Wand;A;DMG
Wand of Enemy Detection;rare;Wand;A;DMG
Wand of Fear;rare;Wand;A;DMG
Wand of Fireballs;rare;Wand;A;DMG
Wand of Lightning Bolts;rare;Wand;A;DMG
Wand of Magic Detection;uncommon;Wand;-;DMG
Wand of Magic Missiles;uncommon;Wand;-;DMG
Wand of Paralysis;rare;Wand;A;DMG
Wand of Polymorph;very rare;Wand;A;DMG
Wand of Secrets;uncommon;Wand;-;DMG
Wand of the War Mage, +1;uncommon;Wand;A;DMG
Wand of the War Mage, +2;rare;Wand;A;DMG
Wand of the War Mage, +3;very rare;Wand;A;DMG
Wand of Web;uncommon;Wand;A;DMG
Wand of Wonder;rare;Wand;A;DMG
Weapon, +1;uncommon;Weapon;-;DMG
Weapon, +2;rare;Weapon;-;DMG
Weapon, +3;very rare;Weapon;-;DMG
Well of Many Worlds;legendary;Wondrous;-;DMG
Wind Fan;uncommon;Wondrous;-;DMG
Winged Boots;uncommon;Wondrous;A;DMG
Wings of Flying;rare;Wondrous;A;DMG
Armor of Gleaming;common;Armor;-;XGE
Bead of Nourishment;common;Wondrous;-;XGE
Bead of Refreshment;common;Wondrous;-;XGE
Boots of False Tracks;common;Wondrous;-;XGE
Candle of the Deep;common;Wondrous;-;XGE
Cast-Off Armor;common;Armor;-;XGE
Charlatan's Die;common;Wondrous;A;XGE
Cloak of Billowing;common;Wondrous;-;XGE
Cloak of Many Fashions;common;Wondrous;-;XGE
Clockwork Amulet;common;Wondrous;-;XGE
Clothes of Mending;common;Wondrous;-;XGE
Dark Shard Amulet;common;Wondrous;A;XGE
Dread Helm;common;Wondrous;-;XGE
Ear Horn of Hearing;common;Wondrous;-;XGE
Enduring Spellbook;common;Wondrous;-;XGE
Ersatz Eye;common;Wondrous;A;XGE
Hat of Vermin;common;Wondrous;-;XGE
Hat of Wizardry;common;Wondrous;A;XGE
Heward's Handy Spice Pouch;common;Wondrous;-;XGE
Horn of Silent Alarm;common;Wondrous;-;XGE
Instrument of Illusions;common;Wondrous;A;XGE
Instrument of Scribing;common;Wondrous;A;XGE
Lock of Trickery;common;Wondrous;-;XGE
Moon-Touched Sword;common;Weapon;-;XGE
Mystery Key;common;Wondrous;-;XGE
Orb of Direction;common;Wondrous;-;XGE
Orb of Time;common;Wondrous;-;XGE
Perfume of Bewitching;common;Potion;-;XGE
Pipe of Smoke Monsters;common;Wondrous;-;XGE
Pole of Angling;common;Wondrous;-;XGE
Pole of Collapsing;common;Wondrous;-;XGE
Pot of Awakening;common;Wondrous;-;XGE
Rope of Mending;common;Wondrous;-;XGE
Ruby of the War Mage;common;Wondrous;A;XGE
Shield of Expression;common;Armor;-;XGE
Smoldering Armor;common;Armor;-;XGE
Staff of Adornment;common;Staff;-;XGE
Staff of Birdcalls;common;Staff;-;XGE
Staff of Flowers;common;Staff;-;XGE
Talking Doll;common;Wondrous;A;XGE
Tankard of Sobriety;common;Wondrous;-;XGE
Unbreakable Arrow;common;Weapon;-;XGE
Veteran's Cane;common;Wondrous;-;XGE
Walloping Ammunition;common;Weapon;-;XGE
Wand of Conducting;common;Wand;-;XGE
Wand of Pyrotechnics;common;Wand;-;XGE
Wand of Scowls;common;Wand;-;XGE
Wand of Smiles;common;Wand;-;XGE
All-Purpose Tool, +1;uncommon;Wondrous;A;TCE
All-Purpose Tool, +2;rare;Wondrous;A;TCE
Amulet of the Devout, +1;uncommon;Wondrous;A;TCE
Amulet of the Devout, +2;rare;Wondrous;A;TCE
Arcane Grimoire, +1;uncommon;Wondrous;A;TCE
Arcane Grimoire, +2;rare;Wondrous;A;TCE
Astral Shard;rare;Wondrous;A;TCE
Astromancy Archive;uncommon;Wondrous;A;TCE
Atlas of Endless Horizons;uncommon;Wondrous;A;TCE
Bloodwell Vial, +1;uncommon;Wondrous;A;TCE
Bloodwell Vial, +2;rare;Wondrous;A;TCE
Cauldron of Rebirth;very rare;Wondrous;A;TCE
Crystalline Chronicle;very rare;Wondrous;A;TCE
Dragonhide Belt, +1;uncommon;Wondrous;A;TCE
Dragonhide Belt, +2;rare;Wondrous;A;TCE
Duplicitous Manuscript;rare;Wondrous;A;TCE
Elemental Essence Shard;rare;Wondrous;A;TCE
Feywild Shard;uncommon;Wondrous;A;TCE
Fulminating Treatise;rare;Wondrous;A;TCE
Guardian Emblem;uncommon;Wondrous;A;TCE
Heart Weaver's Primer;very rare;Wondrous;A;TCE
Libram of Souls and Flesh;uncommon;Wondrous;A;TCE
Lyre of Building;uncommon;Wondrous;A;TCE
Moon Sickle, +1;uncommon;Weapon;A;TCE
Moon Sickle, +2;rare;Weapon;A;TCE
Nature's Mantle;uncommon;Wondrous;A;TCE
Outer Essence Shard;rare;Wondrous;A;TCE
Planecaller's Codex;very rare;Wondrous;A;TCE
Protective Verses;rare;Wondrous;A;TCE
Rhythm-Maker's Drum, +1;uncommon;Wondrous;A;TCE
Rhythm-Maker's Drum, +2;rare;Wondrous;A;TCE
Shadowfell Brand Tattoo;very rare;Wondrous;A;TCE
Shadowfell Shard;rare;Wondrous;A;TCE
Spellwrought Tattoo (1st level);common;Wondrous;-;TCE
Spellwrought Tattoo (3rd level);uncommon;Wondrous;-;TCE
Spellwrought Tattoo (5th level);rare;Wondrous;-;TCE
Absorbing Tattoo;very rare;Wondrous;A;TCE
Barrier Tattoo;uncommon;Wondrous;A;TCE
Blood Fury Tattoo;legendary;Wondrous;A;TCE
Coiling Grasp Tattoo;uncommon;Wondrous;A;TCE
Eldritch Claw Tattoo;uncommon;Wondrous;A;TCE
Ghost Step Tattoo;very rare;Wondrous;A;TCE
Illuminator's Tattoo;common;Wondrous;A;TCE
Lifewell Tattoo;uncommon;Wondrous;A;TCE
Masquerade Tattoo;common;Wondrous;A;TCE`;

  // ---------- 30 items of Frindeval (region = where they are made / sold) ----------
  const FRINDEVAL = [
    // Clan Veyra & the north
    ['Wolfbound Torc', 'uncommon', 'Wondrous', 'A', 'The Fields', 'An Ulfgarðr silver torc. Once per long rest, when casting would give you a level of exhaustion or force a concentration save, a wolf bound to the torc takes the strain instead — and howls far away. (DM: the wolf ages a year each time.)'],
    ['Wolfguard Mantle', 'rare', 'Wondrous', 'A', 'Northeast Frindeval — Clan Veyra', 'Grey wolf-pelt cloak of the Jarl\'s guard. Advantage on Perception checks that rely on smell; once per day call two wolves (use wolf stats) that fight beside you for 1 hour.'],
    ['Falk Feather-Cloak', 'rare', 'Wondrous', 'A', 'Falk Forests', 'Woven from giant falcon down. You never take falling damage and can glide 2 feet forward for every 1 foot you fall. Once per week, whistle to call a giant falcon who carries one message 50 miles.'],
    ['Storm-Compass of Kaldgeirr', 'uncommon', 'Wondrous', '-', 'Otherside', 'A brass sea-compass. Its needle points to the nearest safe harbour within 50 miles; advantage on checks to navigate ships through storms.'],
    ['Iceforge Rune-Pick', 'uncommon', 'Weapon', '-', 'Otherside', '+1 war pick. As an action, it digs through 1 foot of solid stone; the runes glow when ore is within 30 feet.'],
    ['Frost-Tempered Axe', 'rare', 'Weapon', 'A', 'Otherside', '+1 battleaxe forged in the cold furnaces of Iceforge. Hits deal an extra 1d6 cold damage, and the target\'s speed drops by 10 feet until your next turn.'],
    ['Quill of Echoes', 'uncommon', 'Wondrous', 'A', 'Otherside', 'A Tavlar heron-feather quill. Copying a spell into your spellbook takes half the time and gold. Anything it writes can be made to read itself aloud once.'],
    ['Library Lantern', 'common', 'Wondrous', '-', 'Otherside', 'A small lantern from Tavlar. Its light makes hidden, invisible or magically erased writing visible, but lights nothing else.'],
    ['Skald\'s Mead', 'uncommon', 'Potion', '-', 'Vinland', 'Valheim honey-mead. Drink it: gain 2d8 temporary hit points and advantage on Performance and Intimidation checks for 1 hour.'],
    ['Well-Water of Valheim', 'rare', 'Potion', '-', 'Vinland', 'A flask from the well beneath Valheim. For 1 minute you gain resistance to bludgeoning, piercing and slashing damage and your melee hits deal +1d6 damage. (DM: the well is drying up.)'],
    ['Red Oar of the Basin', 'uncommon', 'Wondrous', '-', 'Dead Basin', 'A raider\'s oar painted blood-red. A boat rowed with it makes no sound and moves 10 feet faster.'],
    ['Netmender\'s Net', 'uncommon', 'Weapon', '-', 'Dead Basin', 'A net that can never tear. A creature caught in it is restrained; escaping needs a DC 15 Strength check.'],
    ['Eel-Skin Boots', 'common', 'Wondrous', '-', 'Dead Basin', 'Slick black boots. You have advantage on checks to escape a grapple while in water, and never slip on wet surfaces.'],
    ['Blackbark Charm', 'uncommon', 'Wondrous', 'A', 'Dark Forest coast', 'A knot of black bark from Vilts. You cannot become lost in any forest, and the Dark Forest always lets you find the path home.'],
    ['Blood Shore Salt', 'uncommon', 'Potion', '-', 'Dark Forest coast', 'A pouch of red salt from the Blood Shore. Rub it on a weapon: your next three hits deal +2d6 necrotic damage to fey or undead.'],
    ['Milkbowl Token', 'common', 'Wondrous', '-', 'Dark Forest coast', 'A clay token from Mizuts. Leave it out with a bowl of milk, and forest spirits leave you alone until dawn.'],
    ['Jurija Furcloak', 'uncommon', 'Wondrous', '-', 'Dark Forest coast', 'Layered fox and wolf fur. You are comfortable down to −50 °F and have advantage on saves against cold.'],
    ['Wartorn Banner', 'rare', 'Wondrous', '-', 'The War Front (north)', 'A scorched battle standard. Allies within 30 feet have +1 to saving throws against being frightened; once per day, raise it to give up to 6 allies 2d6 temporary hit points.'],
    ['Titan\'s Ember', 'very rare', 'Wondrous', 'A', 'The War Front (north)', 'A shard of the never-dying fire of Titan\'s Gate, warm in the hand. Cast fireball once per day (save DC 15). You never suffer from natural cold.'],
    // The Sultanate of Tuvar
    ['Sultan\'s Water Seal', 'rare', 'Wondrous', 'A', 'The Wastelands', 'A ring-seal of the Sultanate. Every guarded well of the Wastelands opens to you; once per day it fills a waterskin from thin air. Officials treat its wearer as the Sultan\'s agent.'],
    ['Sandstrider Sandals', 'uncommon', 'Wondrous', 'A', 'The Wastelands', 'You walk on sand and dunes at full speed and leave no footprints.'],
    ['Mirage Veil', 'rare', 'Wondrous', 'A', 'The Wastelands', 'A shimmering silk veil. Three times per day cast disguise self or mirror image.'],
    ['Corsair\'s Red Sailcloth', 'uncommon', 'Wondrous', '-', 'The Wastelands', 'A ship flying this red sail moves 2 miles per hour faster — and every honest captain recognises it.'],
    ['Sun Priest\'s Disc', 'rare', 'Wondrous', 'A', 'The Wastelands', 'A golden disc from the Step Pyramid. +1 to your spell save DC; once per day it sheds true sunlight in a 30-foot radius for 1 minute.'],
    ['Glass Orb of Tuvar', 'uncommon', 'Wondrous', '-', 'The Wastelands', 'Desert glass that holds a memory. Once per day it shows the last scene reflected in any oasis or well you name.'],
    ['Bazaar Bone Dice', 'common', 'Wondrous', '-', 'The Wastelands', 'Camel-bone dice. You always know when anyone at your table is cheating.'],
    ['Djinn-Smoke Lamp', 'very rare', 'Wondrous', 'A', 'The Wastelands', 'An old brass lamp. Once per week, a minor air spirit appears to carry a spoken message up to 100 miles, or to raise a sandstorm 100 feet wide for 10 minutes.'],
    ['Pearl of the Jungle Coast', 'uncommon', 'Wondrous', 'A', 'The Wastelands', 'Breathe water for 1 hour per day. The jungle folk of Wolve greet its bearer as a friend.'],
    ['Calendar Stone of the Pyramid', 'rare', 'Wondrous', '-', 'The Wastelands', 'A carved stone disc. You always know the exact time and date; advantage on one check made at dawn or dusk each day. (DM: it is one of the keys to the sealed chambers.)'],
    ['Vizier\'s Ink', 'rare', 'Potion', '-', 'The Wastelands', 'Writing made with this ink can only be read by the person it is addressed to; anyone trying to forge or change it sees the letters burn.'],
  ];

  // ---------- The six Vestiges ----------
  const VESTIGES = [
    { n: 'I', name: 'Oathbreaker', type: 'Weapon (Greatsword), Artifact (requires attunement)', cr: 5, place: 'The Drowned Chapel',
      lore: 'Forged from the remains of a fallen god\'s weapon, Oathbreaker was wielded by humanity\'s greatest champion during the First Holy War. Its blade was designed to cut through divine protections and wound immortals. Legends claim that its first wielder forced a god to kneel before a mortal king.',
      dungeon: 'A chapel that sank into the sea off Odeila in the Holy War. At low tide its bell tower breaks the water. Drowned templars still guard the nave, and the Red Isle Corsairs have been trying to dive it for years.' },
    { n: 'II', name: 'The Forsaken Aegis', type: 'Armor (Plate), Artifact (requires attunement)', cr: 7, place: 'The Sealed Chambers',
      lore: 'Created to protect humanity\'s final defenders, this armor was blessed by the Forgotten God himself. It is said that its original wearer survived the combined judgment of three deities, becoming the last warrior standing when an entire kingdom fell.',
      dungeon: 'The chambers beneath the Step Pyramid, sealed before the Sultanate existed. The knocking High Priestess Ishara hears every night comes from here. The Calendar Stone is one of the keys.' },
    { n: 'III', name: 'Starpiercer', type: 'Weapon (Longbow), Artifact (requires attunement)', cr: 9, place: 'The Eye of the Storm',
      lore: 'Crafted to strike enemies beyond mortal reach, Starpiercer was entrusted to an archer whose name was deliberately erased from history. According to legend, its arrows could cross entire battlefields and pierce the heavens, striking gods who believed themselves untouchable.',
      dungeon: 'A storm-wrapped peak in the middle of the Isles. The huge thing Captain Erling\'s crew saw under the water is its guardian. The storms never stop because the bow is still "aimed" at the sky.' },
    { n: 'IV', name: 'Crown of the Unbound', type: 'Wondrous Item (Crown), Artifact (requires attunement)', cr: 11, place: 'The Hall of the First King',
      lore: 'Worn by the first king who rejected divine rule, this crown symbolizes humanity\'s independence. Its power protects the wearer\'s will from supernatural domination and can free entire armies from divine commands. The crown disappeared after its kingdom was destroyed.',
      dungeon: 'The ancient sealed hall that Iceforge\'s deepest tunnel broke into. Thane Brokkr closed it after miners vanished. The first king\'s court still sits on their thrones down there.' },
    { n: 'V', name: 'Worldbreaker', type: 'Staff, Artifact (requires attunement by a spellcaster)', cr: 13, place: 'The Ninefold Spire',
      lore: 'Forged by nine archmages under the Forgotten God\'s guidance, Worldbreaker was humanity\'s answer to divine magic. Its wielder could unravel powerful enchantments and destroy magical constructs thought indestructible. Following the Holy War, the staff vanished along with the last surviving archmage.',
      dungeon: 'A tower of nine floors hidden at the heart of the Dark Forest, where the last archmage fled. The forest grew around it to hide it. The Grey Hermit knows the way — the forest let him in once.' },
    { n: 'VI', name: 'The Ninth Testament', type: 'Weapon (Spear), Artifact (requires attunement)', cr: 15, place: 'The Testament Forge',
      lore: 'The greatest creation of the Forgotten God and humanity, the Ninth Testament was forged to permanently sever divine influence over the mortal world. Fearing its overwhelming power, its creators separated it into nine fragments and scattered them across the world. All nine fragments have now been recovered, but the restoration requires two years of preparation before the final ritual can begin.\n\nThe Forgotten God\'s Final Safeguard: although the Ninth Testament surpasses any other Vestige individually, the combined power of the other five can destroy it. This safeguard, the Fivefold Judgment, prevents any mortal ruler, divine being or future tyrant from using the Sixth Vestige to establish absolute dominion.\n\n"Six were forged to end the reign of heaven. Five were entrusted with the power to end the Sixth."',
      dungeon: 'An ancient forge beneath Titan\'s Gate. The war began there two weeks ago — whoever took the fortress did it to begin the two-year ritual. (DM: who is restoring it?) The heroes must gather the other five Vestiges before the ritual ends.' },
  ];

  // ---------- d100: what does a magic shop have today? ----------
  // roll d100 + place modifier. Dice like "1d4" are rolled for the number of items of each rarity.
  const D100 = [
    { max: 20, text: 'Nothing magical for sale — only rumours and fakes.', stock: {} },
    { max: 45, text: '1d4 common items', stock: { common: '1d4' } },
    { max: 65, text: '1d4 common, 1d2 uncommon', stock: { common: '1d4', uncommon: '1d2' } },
    { max: 80, text: '1d4 common, 1d4 uncommon', stock: { common: '1d4', uncommon: '1d4' } },
    { max: 90, text: '1d4 uncommon, 1 rare', stock: { uncommon: '1d4', rare: '1' } },
    { max: 97, text: '1d4 uncommon, 1d2 rare', stock: { uncommon: '1d4', rare: '1d2' } },
    { max: 105, text: '1d2 rare, 1 very rare', stock: { rare: '1d2', 'very rare': '1' } },
    { max: 999, text: '1d3 rare, 1d2 very rare — and a rumour of a legendary item at a secret auction', stock: { rare: '1d3', 'very rare': '1d2' } },
  ];
  const PLACE_MOD = { Village: -20, Town: 0, City: 10, 'Castle / Keep': 0, 'Tavern / Inn': -10, Temple: 0, Shop: 0, Wilderness: -40, Dungeon: -100, Other: -10 };
  const SPECIAL_MOD = { Kentia: 10, Tuvar: 10, Tavlar: 15, Antvere: 5, Odeila: 5, Iceforge: 5 };
  const RARITY_RANGE = { common: [50, 100], uncommon: [101, 500], rare: [501, 5000], 'very rare': [5001, 50000], legendary: [50001, 200000] };
  const RARITY_ORDER = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];
  const WHERE = {
    common: 'Any village, town or city', uncommon: 'Towns and cities', rare: 'Cities (good d100 roll)',
    'very rare': 'Only big cities on a 98+ roll', legendary: 'Never in shops — quests, hoards, secret auctions', artifact: 'Never for sale',
  };

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function niceRound(v) { return v < 200 ? Math.round(v / 5) * 5 : v < 2000 ? Math.round(v / 10) * 10 : v < 20000 ? Math.round(v / 100) * 100 : Math.round(v / 1000) * 1000; }
  function basePrice(name, rarity, type) {
    const [lo, hi] = RARITY_RANGE[rarity] || [0, 0];
    const f = (hash(name) % 1000) / 1000;
    let p = lo + (hi - lo) * Math.pow(f, 1.6); // most items sit in the lower part of the range
    if (type === 'Potion' || type === 'Scroll') p *= 0.5;   // consumables cost half (Xanathar's)
    if (name === 'Potion of Healing') p = 50;
    return niceRound(p);
  }

  const ITEMS = RAW.trim().split('\n').map(line => {
    const [name, rarity, type, att, source] = line.split(';');
    return { name, rarity, type, attune: att === 'A', source, price: basePrice(name, rarity, type) };
  });
  FRINDEVAL.forEach(([name, rarity, type, att, region, text]) => {
    ITEMS.push({ name, rarity, type, attune: att === 'A', source: 'Frindeval', region, text, price: basePrice(name, rarity, type) });
  });

  window.MAGIC = { ITEMS, VESTIGES, D100, PLACE_MOD, SPECIAL_MOD, RARITY_ORDER, WHERE, hash, rng };
})();
