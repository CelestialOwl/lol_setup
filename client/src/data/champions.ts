// Static champion and summoner spell data mappings
// Sourced from local dragontail dataset: dragontail/16.9.1/data/en_GB/

export const CHAMPIONS: { [key: number]: { name: string; key: string } } = {
  1: { name: "Annie", key: "Annie" },
  2: { name: "Olaf", key: "Olaf" },
  3: { name: "Galio", key: "Galio" },
  4: { name: "Twisted Fate", key: "TwistedFate" },
  5: { name: "Xin Zhao", key: "XinZhao" },
  6: { name: "Urgot", key: "Urgot" },
  7: { name: "LeBlanc", key: "Leblanc" },
  8: { name: "Vladimir", key: "Vladimir" },
  9: { name: "Fiddlesticks", key: "Fiddlesticks" },
  10: { name: "Kayle", key: "Kayle" },
  11: { name: "Master Yi", key: "MasterYi" },
  12: { name: "Alistar", key: "Alistar" },
  13: { name: "Ryze", key: "Ryze" },
  14: { name: "Sion", key: "Sion" },
  15: { name: "Sivir", key: "Sivir" },
  16: { name: "Soraka", key: "Soraka" },
  17: { name: "Teemo", key: "Teemo" },
  18: { name: "Tristana", key: "Tristana" },
  19: { name: "Warwick", key: "Warwick" },
  20: { name: "Nunu & Willump", key: "Nunu" },
  21: { name: "Miss Fortune", key: "MissFortune" },
  22: { name: "Ashe", key: "Ashe" },
  23: { name: "Tryndamere", key: "Tryndamere" },
  24: { name: "Jax", key: "Jax" },
  25: { name: "Morgana", key: "Morgana" },
  26: { name: "Zilean", key: "Zilean" },
  27: { name: "Singed", key: "Singed" },
  28: { name: "Evelynn", key: "Evelynn" },
  29: { name: "Twitch", key: "Twitch" },
  30: { name: "Karthus", key: "Karthus" },
  31: { name: "Cho'Gath", key: "Chogath" },
  32: { name: "Amumu", key: "Amumu" },
  33: { name: "Rammus", key: "Rammus" },
  34: { name: "Anivia", key: "Anivia" },
  35: { name: "Shaco", key: "Shaco" },
  36: { name: "Dr. Mundo", key: "DrMundo" },
  37: { name: "Sona", key: "Sona" },
  38: { name: "Kassadin", key: "Kassadin" },
  39: { name: "Irelia", key: "Irelia" },
  40: { name: "Janna", key: "Janna" },
  41: { name: "Gangplank", key: "Gangplank" },
  42: { name: "Corki", key: "Corki" },
  43: { name: "Karma", key: "Karma" },
  44: { name: "Taric", key: "Taric" },
  45: { name: "Veigar", key: "Veigar" },
  48: { name: "Trundle", key: "Trundle" },
  50: { name: "Swain", key: "Swain" },
  51: { name: "Caitlyn", key: "Caitlyn" },
  53: { name: "Blitzcrank", key: "Blitzcrank" },
  54: { name: "Malphite", key: "Malphite" },
  55: { name: "Katarina", key: "Katarina" },
  56: { name: "Nocturne", key: "Nocturne" },
  57: { name: "Maokai", key: "Maokai" },
  58: { name: "Renekton", key: "Renekton" },
  59: { name: "Jarvan IV", key: "JarvanIV" },
  60: { name: "Elise", key: "Elise" },
  61: { name: "Orianna", key: "Orianna" },
  62: { name: "Wukong", key: "MonkeyKing" },
  63: { name: "Brand", key: "Brand" },
  64: { name: "Lee Sin", key: "LeeSin" },
  67: { name: "Vayne", key: "Vayne" },
  68: { name: "Rumble", key: "Rumble" },
  69: { name: "Cassiopeia", key: "Cassiopeia" },
  72: { name: "Skarner", key: "Skarner" },
  74: { name: "Heimerdinger", key: "Heimerdinger" },
  75: { name: "Nasus", key: "Nasus" },
  76: { name: "Nidalee", key: "Nidalee" },
  77: { name: "Udyr", key: "Udyr" },
  78: { name: "Poppy", key: "Poppy" },
  79: { name: "Gragas", key: "Gragas" },
  80: { name: "Pantheon", key: "Pantheon" },
  81: { name: "Ezreal", key: "Ezreal" },
  82: { name: "Mordekaiser", key: "Mordekaiser" },
  83: { name: "Yorick", key: "Yorick" },
  84: { name: "Akali", key: "Akali" },
  85: { name: "Kennen", key: "Kennen" },
  86: { name: "Garen", key: "Garen" },
  89: { name: "Leona", key: "Leona" },
  90: { name: "Malzahar", key: "Malzahar" },
  91: { name: "Talon", key: "Talon" },
  92: { name: "Riven", key: "Riven" },
  96: { name: "Kog'Maw", key: "KogMaw" },
  98: { name: "Shen", key: "Shen" },
  99: { name: "Lux", key: "Lux" },
  101: { name: "Xerath", key: "Xerath" },
  102: { name: "Shyvana", key: "Shyvana" },
  103: { name: "Ahri", key: "Ahri" },
  104: { name: "Graves", key: "Graves" },
  105: { name: "Fizz", key: "Fizz" },
  106: { name: "Volibear", key: "Volibear" },
  107: { name: "Rengar", key: "Rengar" },
  110: { name: "Varus", key: "Varus" },
  111: { name: "Nautilus", key: "Nautilus" },
  112: { name: "Viktor", key: "Viktor" },
  113: { name: "Sejuani", key: "Sejuani" },
  114: { name: "Fiora", key: "Fiora" },
  115: { name: "Ziggs", key: "Ziggs" },
  117: { name: "Lulu", key: "Lulu" },
  119: { name: "Draven", key: "Draven" },
  120: { name: "Hecarim", key: "Hecarim" },
  121: { name: "Kha'Zix", key: "Khazix" },
  122: { name: "Darius", key: "Darius" },
  126: { name: "Jayce", key: "Jayce" },
  127: { name: "Lissandra", key: "Lissandra" },
  131: { name: "Diana", key: "Diana" },
  133: { name: "Quinn", key: "Quinn" },
  134: { name: "Syndra", key: "Syndra" },
  136: { name: "Aurelion Sol", key: "AurelionSol" },
  141: { name: "Kayn", key: "Kayn" },
  142: { name: "Zoe", key: "Zoe" },
  143: { name: "Zyra", key: "Zyra" },
  145: { name: "Kai'Sa", key: "Kaisa" },
  147: { name: "Seraphine", key: "Seraphine" },
  150: { name: "Gnar", key: "Gnar" },
  154: { name: "Zac", key: "Zac" },
  157: { name: "Yasuo", key: "Yasuo" },
  161: { name: "Vel'Koz", key: "Velkoz" },
  163: { name: "Taliyah", key: "Taliyah" },
  164: { name: "Camille", key: "Camille" },
  166: { name: "Akshan", key: "Akshan" },
  200: { name: "Bel'Veth", key: "Belveth" },
  201: { name: "Braum", key: "Braum" },
  202: { name: "Jhin", key: "Jhin" },
  203: { name: "Kindred", key: "Kindred" },
  221: { name: "Zeri", key: "Zeri" },
  222: { name: "Jinx", key: "Jinx" },
  223: { name: "Tahm Kench", key: "TahmKench" },
  233: { name: "Briar", key: "Briar" },
  234: { name: "Viego", key: "Viego" },
  235: { name: "Senna", key: "Senna" },
  236: { name: "Lucian", key: "Lucian" },
  238: { name: "Zed", key: "Zed" },
  240: { name: "Kled", key: "Kled" },
  245: { name: "Ekko", key: "Ekko" },
  246: { name: "Qiyana", key: "Qiyana" },
  254: { name: "Vi", key: "Vi" },
  266: { name: "Aatrox", key: "Aatrox" },
  267: { name: "Nami", key: "Nami" },
  268: { name: "Azir", key: "Azir" },
  350: { name: "Yuumi", key: "Yuumi" },
  360: { name: "Samira", key: "Samira" },
  412: { name: "Thresh", key: "Thresh" },
  420: { name: "Illaoi", key: "Illaoi" },
  421: { name: "Rek'Sai", key: "RekSai" },
  427: { name: "Ivern", key: "Ivern" },
  429: { name: "Kalista", key: "Kalista" },
  432: { name: "Bard", key: "Bard" },
  497: { name: "Rakan", key: "Rakan" },
  498: { name: "Xayah", key: "Xayah" },
  516: { name: "Ornn", key: "Ornn" },
  517: { name: "Sylas", key: "Sylas" },
  518: { name: "Neeko", key: "Neeko" },
  523: { name: "Aphelios", key: "Aphelios" },
  526: { name: "Rell", key: "Rell" },
  555: { name: "Pyke", key: "Pyke" },
  711: { name: "Vex", key: "Vex" },
  777: { name: "Yone", key: "Yone" },
  799: { name: "Ambessa", key: "Ambessa" },
  800: { name: "Mel", key: "Mel" },
  804: { name: "Yunara", key: "Yunara" },
  875: { name: "Sett", key: "Sett" },
  876: { name: "Lillia", key: "Lillia" },
  887: { name: "Gwen", key: "Gwen" },
  888: { name: "Renata Glasc", key: "Renata" },
  893: { name: "Aurora", key: "Aurora" },
  895: { name: "Nilah", key: "Nilah" },
  897: { name: "K'Sante", key: "KSante" },
  901: { name: "Smolder", key: "Smolder" },
  902: { name: "Milio", key: "Milio" },
  904: { name: "Zaahen", key: "Zaahen" },
  910: { name: "Hwei", key: "Hwei" },
  950: { name: "Naafiri", key: "Naafiri" },
};

export const SUMMONER_SPELLS: { [key: number]: { name: string; key: string } } = {
  1: { name: "Cleanse", key: "SummonerBoost" },
  3: { name: "Exhaust", key: "SummonerExhaust" },
  4: { name: "Flash", key: "SummonerFlash" },
  6: { name: "Ghost", key: "SummonerHaste" },
  7: { name: "Heal", key: "SummonerHeal" },
  11: { name: "Smite", key: "SummonerSmite" },
  12: { name: "Teleport", key: "SummonerTeleport" },
  13: { name: "Clarity", key: "SummonerMana" },
  14: { name: "Ignite", key: "SummonerDot" },
  21: { name: "Barrier", key: "SummonerBarrier" },
  30: { name: "To the King!", key: "SummonerPoroRecall" },
  31: { name: "Poro Toss", key: "SummonerPoroThrow" },
  32: { name: "Mark", key: "SummonerSnowball" },
  39: { name: "Mark", key: "SummonerSnowURFSnowball_Mark" },
  54: { name: "Placeholder", key: "Summoner_UltBookPlaceholder" },
  55: { name: "Placeholder and Attack-Smite", key: "Summoner_UltBookSmitePlaceholder" },
  2201: { name: "Flee", key: "SummonerCherryHold" },
  2202: { name: "Flash", key: "SummonerCherryFlash" },
};

export const getChampionInfo = (championId: number) => {
  const champion = CHAMPIONS[championId];
  if (!champion) {
    return { name: `Champion ${championId}`, key: "Unknown" };
  }
  return champion;
};

export const getSummonerSpellInfo = (spellId: number) => {
  const spell = SUMMONER_SPELLS[spellId];
  if (!spell) {
    return { name: `Spell ${spellId}`, key: "Unknown" };
  }
  return spell;
};

export const getChampionImageUrl = (championKey: string) => {
  if (championKey === "Unknown") return null;
  return `/dragontail/16.11.1/img/champion/${championKey}.png`;
};

export const getSummonerSpellImageUrl = (spellKey: string) => {
  if (spellKey === "Unknown") return null;
  return `/dragontail/16.11.1/img/spell/${spellKey}.png`;
};

export const getItemImageUrl = (itemId: number) => {
  if (!itemId) return null;
  return `/dragontail/16.11.1/img/item/${itemId}.png`;
};

// ── Rune Paths (perkStyle / perkSubStyle IDs) ─────────────────────────────
export const RUNE_PATHS: Record<number, { name: string; icon: string }> = {
  8000: { name: "Precision", icon: "7201_Precision.png" },
  8100: { name: "Domination", icon: "7200_Domination.png" },
  8200: { name: "Sorcery", icon: "7202_Sorcery.png" },
  8300: { name: "Inspiration", icon: "7203_Whimsy.png" },
  8400: { name: "Resolve", icon: "7204_Resolve.png" },
};

// Individual rune icons (perkId → local asset path under /dragontail/img/perk-images/)
export const RUNES: Record<number, { name: string; path: string }> = {
  // ── Precision keystones ──────────────────────────────────────────────────
  8005: { name: "Press the Attack", path: "Styles/Precision/PressTheAttack/PressTheAttack.png" },
  8008: { name: "Lethal Tempo", path: "Styles/Precision/LethalTempo/LethalTempoTemp.png" },
  8021: { name: "Fleet Footwork", path: "Styles/Precision/FleetFootwork/FleetFootwork.png" },
  8010: { name: "Conqueror", path: "Styles/Precision/Conqueror/Conqueror.png" },
  // Precision non-keystones
  9101: { name: "Absorb Life", path: "Styles/Precision/AbsorbLife/AbsorbLife.png" },
  9111: { name: "Triumph", path: "Styles/Precision/Triumph.png" },
  8009: { name: "Presence of Mind", path: "Styles/Precision/PresenceOfMind/PresenceOfMind.png" },
  9104: { name: "Legend: Alacrity", path: "Styles/Precision/LegendAlacrity/LegendAlacrity.png" },
  9105: { name: "Legend: Haste", path: "Styles/Precision/LegendHaste/LegendHaste.png" },
  9103: { name: "Legend: Bloodline", path: "Styles/Precision/LegendBloodline/LegendBloodline.png" },
  8014: { name: "Coup de Grace", path: "Styles/Precision/CoupDeGrace/CoupDeGrace.png" },
  8017: { name: "Cut Down", path: "Styles/Precision/CutDown/CutDown.png" },
  // ── Domination keystones ─────────────────────────────────────────────────
  8112: { name: "Electrocute", path: "Styles/Domination/Electrocute/Electrocute.png" },
  8124: { name: "Predator", path: "Styles/Domination/Predator/Predator.png" },
  8128: { name: "Dark Harvest", path: "Styles/Domination/DarkHarvest/DarkHarvest.png" },
  9923: { name: "Hail of Blades", path: "Styles/Domination/HailOfBlades/HailOfBlades.png" },
  // Domination non-keystones
  8126: { name: "Cheap Shot", path: "Styles/Domination/CheapShot/CheapShot.png" },
  8139: { name: "Taste of Blood", path: "Styles/Domination/TasteOfBlood/GreenTerror_TasteOfBlood.png" },
  8143: { name: "Sudden Impact", path: "Styles/Domination/SuddenImpact/SuddenImpact.png" },
  8136: { name: "Zombie Ward", path: "Styles/Domination/ZombieWard/ZombieWard.png" },
  8120: { name: "Ghost Poro", path: "Styles/Domination/GhostPoro/GhostPoro.png" },
  8138: { name: "Eyeball Collection", path: "Styles/Domination/EyeballCollection/EyeballCollection.png" },
  8135: { name: "Treasure Hunter", path: "Styles/Domination/TreasureHunter/TreasureHunter.png" },
  8134: { name: "Ingenious Hunter", path: "Styles/Domination/IngeniousHunter/IngeniousHunter.png" },
  8105: { name: "Relentless Hunter", path: "Styles/Domination/RelentlessHunter/RelentlessHunter.png" },
  8106: { name: "Ultimate Hunter", path: "Styles/Domination/UltimateHunter/UltimateHunter.png" },
  // ── Sorcery keystones ────────────────────────────────────────────────────
  8214: { name: "Summon Aery", path: "Styles/Sorcery/SummonAery/SummonAery.png" },
  8229: { name: "Arcane Comet", path: "Styles/Sorcery/ArcaneComet/ArcaneComet.png" },
  8230: { name: "Phase Rush", path: "Styles/Sorcery/PhaseRush/StormraidersSurgeRuneIcon2.png" },
  // Sorcery non-keystones
  8224: { name: "Nullifying Orb", path: "Styles/Sorcery/NullifyingOrb/Axiom_Arcanist.png" },
  8226: { name: "Manaflow Band", path: "Styles/Sorcery/ManaflowBand/ManaflowBand.png" },
  8275: { name: "Nimbus Cloak", path: "Styles/Sorcery/NimbusCloak/6361.png" },
  8210: { name: "Transcendence", path: "Styles/Sorcery/Transcendence/Transcendence.png" },
  8234: { name: "Celerity", path: "Styles/Sorcery/Celerity/CelerityTemp.png" },
  8233: { name: "Absolute Focus", path: "Styles/Sorcery/AbsoluteFocus/AbsoluteFocus.png" },
  8237: { name: "Scorch", path: "Styles/Sorcery/Scorch/Scorch.png" },
  8232: { name: "Waterwalking", path: "Styles/Sorcery/Waterwalking/Waterwalking.png" },
  8236: { name: "Gathering Storm", path: "Styles/Sorcery/GatheringStorm/GatheringStorm.png" },
  // ── Inspiration keystones ────────────────────────────────────────────────
  8351: { name: "Glacial Augment", path: "Styles/Inspiration/GlacialAugment/GlacialAugment.png" },
  8360: { name: "Unsealed Spellbook", path: "Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook.png" },
  8369: { name: "First Strike", path: "Styles/Inspiration/FirstStrike/FirstStrike.png" },
  // Inspiration non-keystones
  8306: { name: "Hextech Flashtraption", path: "Styles/Inspiration/HextechFlashtraption/HextechFlashtraption.png" },
  8304: { name: "Magical Footwear", path: "Styles/Inspiration/MagicalFootwear/MagicalFootwear.png" },
  8313: { name: "Cash Back", path: "Styles/Inspiration/CashBack/CashBack2.png" },
  8345: { name: "Perfect Timing", path: "Styles/Inspiration/PerfectTiming/AlchemistCabinet.png" },
  8352: { name: "Time Warp Tonic", path: "Styles/Inspiration/TimeWarpTonic/TimeWarpTonic.png" },
  8321: { name: "Biscuit Delivery", path: "Styles/Inspiration/BiscuitDelivery/BiscuitDelivery.png" },
  8316: { name: "Cosmic Insight", path: "Styles/Inspiration/CosmicInsight/CosmicInsight.png" },
  8347: { name: "Jack of All Trades", path: "Styles/Inspiration/JackOfAllTrades/JackofAllTrades2.png" },
  // ── Resolve keystones ────────────────────────────────────────────────────
  8437: { name: "Grasp of the Undying", path: "Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png" },
  8439: { name: "Aftershock", path: "Styles/Resolve/VeteranAftershock/VeteranAftershock.png" },
  8465: { name: "Guardian", path: "Styles/Resolve/Guardian/Guardian.png" },
  // Resolve non-keystones
  8446: { name: "Demolish", path: "Styles/Resolve/Demolish/Demolish.png" },
  8463: { name: "Font of Life", path: "Styles/Resolve/FontOfLife/FontOfLife.png" },
  8429: { name: "Conditioning", path: "Styles/Resolve/Conditioning/Conditioning.png" },
  8444: { name: "Second Wind", path: "Styles/Resolve/SecondWind/SecondWind.png" },
  8473: { name: "Bone Plating", path: "Styles/Resolve/BonePlating/BonePlating.png" },
  8451: { name: "Overgrowth", path: "Styles/Resolve/Overgrowth/Overgrowth.png" },
  8453: { name: "Revitalize", path: "Styles/Resolve/Revitalize/Revitalize.png" },
  8242: { name: "Unflinching", path: "Styles/Sorcery/Unflinching/Unflinching.png" },
  // ── Stat shards ─────────────────────────────────────────────────────────
  5001: { name: "Scaling Health", path: "StatMods/StatModsHealthScalingIcon.png" },
  5002: { name: "Armor", path: "StatMods/StatModsArmorIcon.png" },
  5003: { name: "Magic Resistance", path: "StatMods/StatModsMagicResIcon.png" },
  5005: { name: "Attack Speed", path: "StatMods/StatModsAttackSpeedIcon.png" },
  5007: { name: "CDR", path: "StatMods/StatModsCDRScalingIcon.png" },
  5008: { name: "Adaptive Force", path: "StatMods/StatModsAdaptiveForceIcon.png" },
  5010: { name: "Move Speed", path: "StatMods/StatModsMovementSpeedIcon.png" },
  5011: { name: "Health", path: "StatMods/StatModsHealthPlusIcon.png" },
  5013: { name: "Tenacity", path: "StatMods/StatModsTenacityIcon.png" },
};

/** Returns the local URL for a rune tree/path icon (used for primary and secondary style). */
export function getRunePathIconUrl(styleId: number): string | null {
  const p = RUNE_PATHS[styleId];
  if (!p) return null;
  return `/dragontail/img/perk-images/Styles/${p.icon}`;
}

/** Returns the local URL for a specific keystone/rune icon. Falls back to the path icon on miss. */
export function getRuneIconUrl(runeId: number): string | null {
  const r = RUNES[runeId];
  if (!r) return null;
  return `/dragontail/img/perk-images/${r.path}`;
}
