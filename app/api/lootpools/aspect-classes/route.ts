import { NextResponse } from 'next/server';

// Aspect class mapping - based on the Discord bot's aspect_class_map.json
export const aspectClassMap: { [className: string]: string[] } = {
  "mage": [
    "Aspect of the Apprentice's Bolt",
    "Aspect of the Comet",
    "Aspect of the Cone of Cold",
    "Aspect of the Dimension's Door",
    "Aspect of the Magic Missile",
    "Aspect of the Ray of Frost",
    "Aspect of the Savior",
    "Aspect of a Scorching Sun",
    "Aspect of a Thousand Hours",
    "Aspect of Wind Walking",
    "Aspect of Burning Providence",
    "Aspect of Fatal Fulguration",
    "Aspect of Flickering Transmission",
    "Aspect of Mystic Transfer",
    "Aspect of Runic Extravagance",
    "Aspect of Shining Status",
    "Riftwalker's Embodiment of Chronal Control",
    "Light Bender's Embodiment of Celestial Brilliance",
    "Arcanist's Embodiment of Total Obliteration"
  ],
  "archer": [
    "Aspect of Battlement Fortification",
    "Aspect of Bullet Hell",
    "Aspect of Clinging Lichen",
    "Aspect of Dynamic Entry",
    "Aspect of Extreme Firepower",
    "Aspect of Further Horizons",
    "Aspect of Illegal Explosives",
    "Aspect of the North Wind",
    "Aspect of Chaotic Demolition",
    "Aspect of Extreme Current",
    "Aspect of Fragmentation Rounds",
    "Aspect of the Great Escape",
    "Aspect of the Inexhaustible Quiver",
    "Aspect of the Poltergeist",
    "Aspect of a Thunderbolt",
    "Aspect of Undercrank",
    "Aspect of the Beastmaster",
    "Boltslinger's Embodiment of Rended Skies",
    "Trapper's Embodiment of Persistence Predation",
    "Sharpshooter's Embodiment of Laser Precision"
  ],
  "warrior": [
    "Aspect of the Anvil Drop",
    "Aspect of Bovine Inspiration",
    "Aspect of Deafening Echoes",
    "Aspect of Earthshaking",
    "Aspect of Maniacal Frisson",
    "Aspect of the Megaphone",
    "Aspect of Overflowing Hope",
    "Aspect of the Returning Javelin",
    "Aspect of Skyward Strikes",
    "Aspect of Steel Chords",
    "Aspect of Turbulence",
    "Aspect of the Berserker",
    "Aspect of Empowering Fantasy",
    "Aspect of Hyper-Perception",
    "Aspect of Rallying Fervor",
    "Aspect of Rekindling",
    "Aspect of Searing Friction",
    "Aspect of Seeing Stars",
    "Aspect of the Tightrope Walk",
    "Aspect of Unquenching Flames",
    "Fallen's Embodiment of Blind Fury",
    "Battle Monk's Embodiment of Complete Synchrony",
    "Paladin's Embodiment of Undying Determination"
  ],
  "assassin": [
    "Aspect of Athleticism",
    "Aspect of the Chain Knife",
    "Aspect of Enduring Illusions",
    "Aspect of Flamboyance",
    "Aspect of the Fog Machine",
    "Aspect of the Pinwheel",
    "Aspect of Redoublement",
    "Aspect of Shadow Armor",
    "Aspect of the Stellar Fury",
    "Aspect of the Agile Blade",
    "Aspect of the Airborne",
    "Aspect of the Calling Card",
    "Aspect of Clouded Vision",
    "Aspect of the Dagger's Silhouette",
    "Aspect of the Disappearing Act",
    "Aspect of False Coercing",
    "Aspect of Seeking Stars",
    "Aspect of Sleight-of-Hand",
    "Aspect of Unstoppable Force",
    "Aspect of Unyielding Fate",
    "Aspect of Foul Play",
    "Aspect of the Stellar Flurry",
    "Shadestepper's Embodiment of Unseen Execution",
    "Trickster's Embodiment of the Ultimate Show",
    "Acrobat's Embodiment of Gravity Defiance"
  ],
  "shaman": [
    "Aspect of Acceleration",
    "Aspect of the Alraune's Roots",
    "Aspect of Emanant Force",
    "Aspect of Lashing Fire",
    "Aspect of the Monolith",
    "Aspect of Motivation",
    "Aspect of Reverberation",
    "Aspect of Surging Presence",
    "Aspect of the Amphibian",
    "Aspect of the Beckoned Legion",
    "Aspect of the Channeler",
    "Aspect of Exsanguination",
    "Aspect of Seismic Sense",
    "Aspect of Stances",
    "Summoner's Embodiment of the Omnipotent Overseer",
    "Ritualist's Embodiment of the Ancestral Avatar",
    "Acolyte's Embodiment of Unwavering Adherence"
  ]
}

// Invert the mapping to get aspect name -> class
export const getClassForAspect = (aspectName: string): string | null => {
  for (const [className, aspects] of Object.entries(aspectClassMap)) {
    if (aspects.includes(aspectName)) {
      return className;
    }
  }
  return null;
};

export async function GET() {
  return NextResponse.json({
    aspectClassMap,
    invertedMap: Object.fromEntries(
      Object.entries(aspectClassMap).flatMap(([className, aspects]) =>
        aspects.map(aspect => [aspect, className])
      )
    )
  });
}
