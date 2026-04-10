import { pokemonzh } from './pokemon-zh'
import { movezh } from './move-zh'
import { itemzh } from './item-zh'
import { abilityzh } from './ability-zh'
import { itemdeschzh } from './item-desc-zh'
import { abilitydeschzh } from './ability-desc-zh'
import { movedeschzh } from './move-desc-zh'
import { itemdeschwikizh } from './item-desc-zh-wiki'
import { abilitydeschwikizh } from './ability-desc-zh-wiki'
import { movedeschwikizh } from './move-desc-zh-wiki'
import { getLanguage } from './useLanguage'

/** Normalize a display name to PokeAPI kebab-case key */
function toKey(name: string): string {
  return name.toLowerCase().replace(/ /g, '-')
}

/**
 * Chinese form-name fragments for Showdown species suffixes.
 * Used to translate forms not present in pokemon-zh.ts (e.g. "pikachu-sinnoh"),
 * by combining base species + form fragment.
 */
const FORM_PREFIXES: Record<string, string> = {
  // Regional forms
  galar: '伽勒尔',
  alola: '阿罗拉',
  hisui: '洗翠',
  paldea: '帕底亚',
  // Mega / Primal
  mega: '超级',
  primal: '原始',
  // Pikachu cap / cosplay forms
  original: '初始',
  hoenn: '丰缘',
  sinnoh: '神奥',
  unova: '合众',
  kalos: '卡洛斯',
  partner: '搭档',
  world: '世界',
  cosplay: '角色扮演',
  'rock-star': '摇滚巨星',
  belle: '贵妇',
  'pop-star': '偶像',
  phd: '博士',
  libre: '拳师',
  starter: '搭档',
  // Therian / Incarnate
  therian: '灵兽',
  incarnate: '化身',
  // Forme variants
  origin: '起源',
  altered: '别种',
  sky: '天空',
  attack: '攻击',
  defense: '防御',
  speed: '速度',
  black: '黑',
  white: '白',
  resolute: '觉悟',
  pirouette: '舞步',
  unbound: '解放',
  blade: '利刃',
  shield: '盾牌',
  ash: '小智',
  busted: '现形',
  school: '群居',
  meteor: '流星',
  zen: '达摩',
  ice: '冰骑',
  shadow: '幽灵骑',
  'rapid-strike': '连击流',
  'single-strike': '一击流',
  'dusk-mane': '黄昏之鬃',
  'dawn-wings': '黎明之翼',
  ultra: '究极',
  dusk: '黄昏',
  midnight: '黑夜',
  midday: '白昼',
  crowned: '无敌',
  eternamax: '极巨化',
  gmax: '极巨',
  hero: '勇者',
  antique: '古老',
  'low-key': '低音',
  amped: '高音',
  female: '母',
  male: '公',
  f: '母',
  m: '公',
  // Ogerpon masks
  hearthflame: '炉灶',
  wellspring: '碧水',
  cornerstone: '基石',
  teal: '碧绿',
  // Tatsugiri
  curly: '卷曲',
  droopy: '下垂',
  stretchy: '伸长',
  // Squawkabilly
  blue: '蓝',
  yellow: '黄',
  green: '绿',
  // Other
  complete: '完全体',
  '10': '10%形态',
  '50': '50%形态',
  totem: '首领',
  battle: '牵绊',
}

const TYPE_ZH: Record<string, string> = {
  Normal: '一般', Fire: '火', Water: '水', Electric: '电', Grass: '草',
  Ice: '冰', Fighting: '格斗', Poison: '毒', Ground: '地面', Flying: '飞行',
  Psychic: '超能力', Bug: '虫', Rock: '岩石', Ghost: '幽灵', Dragon: '龙',
  Dark: '恶', Steel: '钢', Fairy: '妖精',
}

const CATEGORY_ZH: Record<string, string> = {
  Physical: '物理',
  Special: '特殊',
  Status: '变化',
}

/** Translate a Pokemon type name (e.g. "Fire" -> "火"). */
export function zhType(type: string): string {
  if (getLanguage() === 'en') return type
  return TYPE_ZH[type] ?? type
}

/** Translate a move category (Physical / Special / Status). */
export function zhCategory(category: string): string {
  if (getLanguage() === 'en') return category
  return CATEGORY_ZH[category] ?? category
}

/** Translate a Pokemon species name to the active language. */
export function zhPokemon(name: string): string {
  if (getLanguage() === 'en') return name
  const key = toKey(name)
  const direct = pokemonzh[key as keyof typeof pokemonzh]
  if (direct) return direct

  // Fallback for forms like "slowpoke-galar", "pikachu-sinnoh", "charizard-mega-x"
  const dashIdx = key.indexOf('-')
  if (dashIdx > 0) {
    const base = key.slice(0, dashIdx)
    const rest = key.slice(dashIdx + 1) // e.g. "galar", "rock-star", "mega-x"
    const baseZh = pokemonzh[base as keyof typeof pokemonzh]
    if (baseZh) {
      // Try full rest first (handles "rock-star", "dusk-mane"), then first segment
      let prefix = FORM_PREFIXES[rest]
      let trailing = ''
      if (!prefix) {
        const firstSeg = rest.split('-')[0]
        prefix = FORM_PREFIXES[firstSeg]
        if (prefix) {
          // Preserve trailing segments like "x" / "y" for mega-x / mega-y
          trailing = rest.slice(firstSeg.length).toUpperCase().replace(/-/g, '')
        }
      }
      if (prefix) {
        return prefix + baseZh + trailing
      }
      // No form translation — show base + original form suffix in parens
      return `${baseZh}-${rest}`
    }
  }
  return name
}

/** Translate a move name to the active language. */
export function zhMove(name: string): string {
  if (getLanguage() === 'en') return name
  return movezh[toKey(name) as keyof typeof movezh] ?? name
}

/** Translate an item name to the active language. */
export function zhItem(name: string): string {
  if (getLanguage() === 'en') return name
  return itemzh[toKey(name) as keyof typeof itemzh] ?? name
}

/** Translate an ability name to the active language. */
export function zhAbility(name: string): string {
  if (getLanguage() === 'en') return name
  return abilityzh[toKey(name) as keyof typeof abilityzh] ?? name
}

/** Localized flavor text for an item. Returns null if not available (or in English mode — caller falls back to dex). */
export function zhItemDesc(name: string): string | null {
  if (getLanguage() === 'en') return null
  const key = toKey(name)
  return (itemdeschzh[key as keyof typeof itemdeschzh]
    ?? itemdeschwikizh[key as keyof typeof itemdeschwikizh]
    ?? null)
}

/** Localized flavor text for an ability. Returns null if not available. */
export function zhAbilityDesc(name: string): string | null {
  if (getLanguage() === 'en') return null
  const key = toKey(name)
  return (abilitydeschzh[key as keyof typeof abilitydeschzh]
    ?? abilitydeschwikizh[key as keyof typeof abilitydeschwikizh]
    ?? null)
}

/** Localized flavor text for a move. Returns null if not available. */
export function zhMoveDesc(name: string): string | null {
  if (getLanguage() === 'en') return null
  const key = toKey(name)
  return (movedeschzh[key as keyof typeof movedeschzh]
    ?? movedeschwikizh[key as keyof typeof movedeschwikizh]
    ?? null)
}

/**
 * Translate a Pokemon identifier from the battle protocol.
 * These are formatted as "p1a: Pikachu" — translate only the name part.
 */
export function zhPokemonId(id: string): string {
  const colonIdx = id.indexOf(': ')
  if (colonIdx >= 0) {
    const prefix = id.slice(0, colonIdx + 2)
    const name = id.slice(colonIdx + 2)
    return prefix + zhPokemon(name)
  }
  return zhPokemon(id)
}
