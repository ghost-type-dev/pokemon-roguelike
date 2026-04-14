import type { StatID } from '@pkmn/data'

/** All 27 starter Pokemon across 9 generations */
export const STARTERS: string[] = [
  // Gen 1
  'Bulbasaur', 'Charmander', 'Squirtle',
  // Gen 2
  'Chikorita', 'Cyndaquil', 'Totodile',
  // Gen 3
  'Treecko', 'Torchic', 'Mudkip',
  // Gen 4
  'Turtwig', 'Chimchar', 'Piplup',
  // Gen 5
  'Snivy', 'Tepig', 'Oshawott',
  // Gen 6
  'Chespin', 'Fennekin', 'Froakie',
  // Gen 7
  'Rowlet', 'Litten', 'Popplio',
  // Gen 8
  'Grookey', 'Scorbunny', 'Sobble',
  // Gen 9
  'Sprigatito', 'Fuecoco', 'Quaxly',
]

/** Curated list of competitively useful held items for rewards and AI teams */
export const BATTLE_ITEMS: string[] = [
  'Leftovers', 'Life Orb', 'Choice Band', 'Choice Specs', 'Choice Scarf',
  'Focus Sash', 'Assault Vest', 'Rocky Helmet', 'Eviolite',
  'Black Sludge', 'Sitrus Berry', 'Lum Berry', 'Heavy-Duty Boots',
  'Expert Belt', 'Muscle Band', 'Wise Glasses', 'Scope Lens',
  'Shell Bell', 'Weakness Policy', 'Air Balloon', 'Safety Goggles',
  'Light Clay', 'Loaded Dice', 'Booster Energy', 'Clear Amulet',
  'Covert Cloak', 'Mirror Herb', 'Protective Pads', 'Throat Spray',
  'Mental Herb', 'Power Herb', 'White Herb', 'Berry Juice',
  'Flame Orb', 'Toxic Orb', 'King\'s Rock', 'Razor Claw',
  'Wide Lens', 'Zoom Lens', 'Bright Powder', 'Quick Claw',
]

export type RewardType = 'item' | 'tm' | 'ability' | 'ev-boost' | 'new-pokemon' | 'nature' | 'tera-shard'

export interface RewardOption {
  type: RewardType
  label: string
  description: string
  itemName?: string
  moveName?: string
  targetSpecies?: string
  stat?: StatID
  /** For tm: pre-selected random moves to choose from */
  tmMoveChoices?: string[]
  /** For new-pokemon: the full PokemonSet from the opponent team */
  pokemonSpecies?: string
  /** For nature: the new nature name */
  natureName?: string
  /** For new-pokemon when roster is full: index of Pokemon to replace */
  replaceIndex?: number
  /** For tera-shard: the new Tera Type */
  teraType?: string
}

export const STAT_LABELS: Record<StatID, string> = {
  hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe',
}
