import { zhPokemonId, zhMove, zhPokemon } from '../i18n/zh-helpers'
import { getLanguage, type Language } from '../i18n/useLanguage'

type FormattedLine = { text: string; className: string } | null

/**
 * Format a single battle protocol line for display.
 *
 * @param line  The protocol line, e.g. "|move|p1a: Pikachu|Thunderbolt|p2a: Charizard"
 * @param lang  Optional language override. Defaults to the current store language.
 *
 * Note: zhPokemon/zhMove/etc. read the same store, so passing `lang` is mostly
 * for explicit control — when callers re-render via `useLanguage()`, the
 * helpers automatically pick up the right language.
 */
export function formatLine(line: string, lang: Language = getLanguage()): FormattedLine {
  if (!line || line === '|') return null

  const parts = line.split('|').filter(Boolean)
  if (!parts.length) return null

  const type = parts[0]
  const en = lang === 'en'

  switch (type) {
    case 'move':
      return {
        text: en
          ? `${zhPokemonId(parts[1])} used ${zhMove(parts[2])}!`
          : `${zhPokemonId(parts[1])} 使用了 ${zhMove(parts[2])}！`,
        className: 'text-blue-300',
      }
    case '-damage':
    case '-hurt': {
      const hp = parts[2]?.split(' ')[0] || ''
      const source = parts[3] ? ` (${formatEffect(parts[3])})` : ''
      return {
        text: en
          ? `${zhPokemonId(parts[1])} took damage! (${hp})${source}`
          : `${zhPokemonId(parts[1])} 受到了伤害！(${hp})${source}`,
        className: 'text-red-400',
      }
    }
    case '-heal': {
      const hp = parts[2]?.split(' ')[0] || ''
      const source = parts[3] ? ` (${formatEffect(parts[3])})` : ''
      return {
        text: en
          ? `${zhPokemonId(parts[1])} restored HP! (${hp})${source}`
          : `${zhPokemonId(parts[1])} 回复了HP！(${hp})${source}`,
        className: 'text-green-400',
      }
    }
    case 'faint':
      return {
        text: en
          ? `${zhPokemonId(parts[1])} fainted!`
          : `${zhPokemonId(parts[1])} 倒下了！`,
        className: 'text-red-500 font-bold',
      }
    case 'switch':
    case 'drag':
      return {
        text: en
          ? `${zhPokemonId(parts[1])} sent out ${zhPokemon(parts[2]?.split(',')[0] ?? '')}!`
          : `${zhPokemonId(parts[1])} 派出了 ${zhPokemon(parts[2]?.split(',')[0] ?? '')}！`,
        className: 'text-yellow-300',
      }
    case 'turn':
      return {
        text: en ? `--- Turn ${parts[1]} ---` : `--- 第 ${parts[1]} 回合 ---`,
        className: 'text-white font-bold text-center border-t border-gray-600 pt-1 mt-1',
      }
    case 'win':
      return {
        text: en ? `${parts[1]} won the battle!` : `${parts[1]} 赢得了战斗！`,
        className: 'text-yellow-400 font-bold text-lg text-center',
      }
    case 'tie':
      return {
        text: en ? 'The battle ended in a tie!' : '战斗以平局结束！',
        className: 'text-gray-300 font-bold text-lg text-center',
      }
    case '-supereffective':
      return { text: en ? "It's super effective!" : '效果拔群！', className: 'text-orange-400' }
    case '-resisted':
      return { text: en ? "It's not very effective…" : '效果不太好……', className: 'text-gray-400' }
    case '-crit':
      return { text: en ? 'A critical hit!' : '要害一击！', className: 'text-yellow-500' }
    case '-miss':
      return {
        text: en
          ? `${zhPokemonId(parts[1])}'s attack missed!`
          : `${zhPokemonId(parts[1])} 的攻击没有命中！`,
        className: 'text-gray-500',
      }
    case '-immune':
      return {
        text: en
          ? `It had no effect on ${zhPokemonId(parts[1])}…`
          : `对 ${zhPokemonId(parts[1])} 没有效果……`,
        className: 'text-gray-500',
      }
    case '-fail':
      return { text: en ? 'But it failed!' : `但是失败了！`, className: 'text-gray-500' }
    case '-notarget':
      return { text: en ? 'But there was no target…' : `但是没有目标……`, className: 'text-gray-500' }
    case '-ohko':
      return { text: en ? 'One-hit KO!' : '一击必杀！', className: 'text-red-500 font-bold' }
    case '-hitcount':
      return {
        text: en ? `Hit ${parts[2]} time(s)!` : `命中了 ${parts[2]} 次！`,
        className: 'text-blue-300',
      }
    case '-status':
      return {
        text: en
          ? `${zhPokemonId(parts[1])} was ${formatStatus(parts[2], lang)}!`
          : `${zhPokemonId(parts[1])} ${formatStatus(parts[2], lang)}！`,
        className: 'text-purple-400',
      }
    case '-curestatus':
      return {
        text: en
          ? `${zhPokemonId(parts[1])} recovered from ${formatStatus(parts[2], lang)}!`
          : `${zhPokemonId(parts[1])} 的 ${formatStatus(parts[2], lang)} 状态恢复了！`,
        className: 'text-green-300',
      }
    case 'cant': {
      const reason = parts[2] || ''
      const name = zhPokemonId(parts[1])
      if (en) {
        if (reason === 'flinch') return { text: `${name} flinched and couldn't move!`, className: 'text-orange-300' }
        if (reason === 'par') return { text: `${name} is paralyzed! It can't move!`, className: 'text-yellow-500' }
        if (reason === 'slp') return { text: `${name} is fast asleep.`, className: 'text-gray-400' }
        if (reason === 'frz') return { text: `${name} is frozen solid!`, className: 'text-cyan-400' }
        if (reason === 'recharge') return { text: `${name} must recharge!`, className: 'text-gray-400' }
        return { text: `${name} can't move!`, className: 'text-orange-300' }
      }
      if (reason === 'flinch') return { text: `${name} 因畏缩而无法行动！`, className: 'text-orange-300' }
      if (reason === 'par') return { text: `${name} 麻痹了！无法行动！`, className: 'text-yellow-500' }
      if (reason === 'slp') return { text: `${name} 正在熟睡。`, className: 'text-gray-400' }
      if (reason === 'frz') return { text: `${name} 被冻住了！`, className: 'text-cyan-400' }
      if (reason === 'recharge') return { text: `${name} 需要恢复！`, className: 'text-gray-400' }
      return { text: `${name} 无法行动！`, className: 'text-orange-300' }
    }
    case '-boost': {
      const amount = parseInt(parts[3] || '1')
      if (en) {
        const word = amount >= 3 ? ' drastically' : amount === 2 ? ' sharply' : ''
        return {
          text: `${zhPokemonId(parts[1])}'s ${formatStat(parts[2], lang)}${word} rose!`,
          className: 'text-cyan-400',
        }
      }
      const word = amount >= 3 ? '急剧' : amount === 2 ? '大幅' : ''
      return {
        text: `${zhPokemonId(parts[1])} 的 ${formatStat(parts[2], lang)} ${word}提升了！`,
        className: 'text-cyan-400',
      }
    }
    case '-unboost': {
      const amount = parseInt(parts[3] || '1')
      if (en) {
        const word = amount >= 3 ? ' severely' : amount === 2 ? ' harshly' : ''
        return {
          text: `${zhPokemonId(parts[1])}'s ${formatStat(parts[2], lang)}${word} fell!`,
          className: 'text-pink-400',
        }
      }
      const word = amount >= 3 ? '急剧' : amount === 2 ? '大幅' : ''
      return {
        text: `${zhPokemonId(parts[1])} 的 ${formatStat(parts[2], lang)} ${word}降低了！`,
        className: 'text-pink-400',
      }
    }
    case '-setboost':
      return {
        text: en
          ? `${zhPokemonId(parts[1])}'s ${formatStat(parts[2], lang)} was set to ${parts[3]}!`
          : `${zhPokemonId(parts[1])} 的 ${formatStat(parts[2], lang)} 被设为 ${parts[3]}！`,
        className: 'text-cyan-400',
      }
    case '-clearboost':
    case '-clearallboost':
      return {
        text: en
          ? `${zhPokemonId(parts[1])}'s stat changes were cleared!`
          : `${zhPokemonId(parts[1])} 的能力变化被消除了！`,
        className: 'text-gray-300',
      }
    case '-weather':
      if (parts[1] === 'none') return { text: en ? 'The weather cleared.' : '天气恢复正常。', className: 'text-gray-300' }
      if (parts[2] === '[upkeep]') return {
        text: en ? `${formatWeather(parts[1], lang)} continues.` : `${formatWeather(parts[1], lang)}仍在持续。`,
        className: 'text-cyan-300',
      }
      return { text: formatWeather(parts[1], lang), className: 'text-cyan-300' }
    case '-fieldstart': {
      const field = formatEffect(parts[1])
      return {
        text: en ? `${field} started!` : `${field} 开始了！`,
        className: 'text-indigo-300',
      }
    }
    case '-fieldend': {
      const field = formatEffect(parts[1])
      return {
        text: en ? `${field} ended.` : `${field} 结束了。`,
        className: 'text-gray-300',
      }
    }
    case '-sidestart': {
      const side = parts[1]
      const effect = formatEffect(parts[2])
      return {
        text: en
          ? `${effect} was set on ${side}'s side!`
          : `${effect} 布置在了 ${side} 的场地！`,
        className: 'text-indigo-300',
      }
    }
    case '-sideend': {
      const side = parts[1]
      const effect = formatEffect(parts[2])
      return {
        text: en
          ? `${effect} on ${side}'s side ended.`
          : `${side} 场地的 ${effect} 结束了。`,
        className: 'text-gray-300',
      }
    }
    case '-start': {
      const effect = formatEffect(parts[2])
      const name = zhPokemonId(parts[1])
      if (en) {
        if (effect === 'confusion') return { text: `${name} became confused!`, className: 'text-purple-400' }
        if (effect.includes('Leech Seed')) return { text: `${name} was seeded!`, className: 'text-green-500' }
        if (effect.includes('Substitute')) return { text: `${name} put up a substitute!`, className: 'text-green-300' }
        if (effect.includes('Encore')) return { text: `${name} got an encore!`, className: 'text-pink-300' }
        if (effect.includes('Taunt')) return { text: `${name} fell for the taunt!`, className: 'text-pink-300' }
        if (effect.includes('Disable')) return { text: `${name}'s move was disabled!`, className: 'text-pink-300' }
        if (effect.includes('Yawn')) return { text: `${name} grew drowsy!`, className: 'text-gray-400' }
        if (effect.includes('Perish')) return { text: `All Pokemon hearing the song will faint in 3 turns!`, className: 'text-red-400' }
        if (effect.includes('Curse')) return { text: `${name} was cursed!`, className: 'text-purple-500' }
        if (effect.includes('Nightmare')) return { text: `${name} began having a nightmare!`, className: 'text-purple-500' }
        if (effect.includes('Torment')) return { text: `${name} was tormented!`, className: 'text-pink-300' }
        return { text: `${name}'s ${effect} began!`, className: 'text-indigo-300' }
      }
      if (effect === 'confusion') return { text: `${name} 陷入混乱了！`, className: 'text-purple-400' }
      if (effect.includes('Leech Seed')) return { text: `${name} 被种下了寄生种子！`, className: 'text-green-500' }
      if (effect.includes('Substitute')) return { text: `${name} 制造了替身！`, className: 'text-green-300' }
      if (effect.includes('Encore')) return { text: `${name} 被迫继续使用同样的招式！`, className: 'text-pink-300' }
      if (effect.includes('Taunt')) return { text: `${name} 中了挑衅！`, className: 'text-pink-300' }
      if (effect.includes('Disable')) return { text: `${name} 的招式被封印了！`, className: 'text-pink-300' }
      if (effect.includes('Yawn')) return { text: `${name} 打了个哈欠！`, className: 'text-gray-400' }
      if (effect.includes('Perish')) return { text: `听到灭亡之歌的宝可梦将在3回合后倒下！`, className: 'text-red-400' }
      if (effect.includes('Curse')) return { text: `${name} 被诅咒了！`, className: 'text-purple-500' }
      if (effect.includes('Nightmare')) return { text: `${name} 陷入噩梦！`, className: 'text-purple-500' }
      if (effect.includes('Torment')) return { text: `${name} 被折磨了！`, className: 'text-pink-300' }
      return { text: `${name} 开始 ${effect}！`, className: 'text-indigo-300' }
    }
    case '-end': {
      const effect = formatEffect(parts[2])
      const name = zhPokemonId(parts[1])
      if (en) {
        if (effect === 'confusion') return { text: `${name} snapped out of its confusion!`, className: 'text-green-300' }
        if (effect.includes('Substitute')) return { text: `${name}'s substitute faded!`, className: 'text-gray-400' }
        return { text: `${name}'s ${effect} ended.`, className: 'text-gray-300' }
      }
      if (effect === 'confusion') return { text: `${name} 从混乱中恢复了！`, className: 'text-green-300' }
      if (effect.includes('Substitute')) return { text: `${name} 的替身消失了！`, className: 'text-gray-400' }
      return { text: `${name} 的 ${effect} 结束了。`, className: 'text-gray-300' }
    }
    case '-activate': {
      const effect = formatEffect(parts[2])
      const name = zhPokemonId(parts[1])
      if (en) {
        if (effect.includes('Protect') || effect.includes('Detect')) return { text: `${name} protected itself!`, className: 'text-green-300' }
        if (effect.includes('Sturdy')) return { text: `${name} held on with Sturdy!`, className: 'text-yellow-300' }
        if (effect.includes('Substitute')) return { text: `${name}'s substitute took the hit!`, className: 'text-gray-400' }
        if (effect.includes('Destiny Bond')) return { text: `${name} took its attacker down with it!`, className: 'text-purple-500 font-bold' }
        return { text: `${name}'s ${effect} activated!`, className: 'text-indigo-300' }
      }
      if (effect.includes('Protect') || effect.includes('Detect')) return { text: `${name} 保护了自己！`, className: 'text-green-300' }
      if (effect.includes('Sturdy')) return { text: `${name} 用结实特性撑住了攻击！`, className: 'text-yellow-300' }
      if (effect.includes('Substitute')) return { text: `${name} 的替身承受了伤害！`, className: 'text-gray-400' }
      if (effect.includes('Destiny Bond')) return { text: `${name} 与对手同归于尽！`, className: 'text-purple-500 font-bold' }
      return { text: `${name} 的 ${effect} 发动了！`, className: 'text-indigo-300' }
    }
    case '-prepare':
      return {
        text: en
          ? `${zhPokemonId(parts[1])} is charging ${zhMove(parts[2])}!`
          : `${zhPokemonId(parts[1])} 正在蓄力 ${zhMove(parts[2])}！`,
        className: 'text-blue-200',
      }
    case '-mustrecharge':
      return {
        text: en ? `${zhPokemonId(parts[1])} must recharge!` : `${zhPokemonId(parts[1])} 需要恢复！`,
        className: 'text-gray-400',
      }
    case '-ability':
      return {
        text: en
          ? `${zhPokemonId(parts[1])}'s ${parts[2]} activated!`
          : `${zhPokemonId(parts[1])} 的 ${parts[2]} 发动了！`,
        className: 'text-indigo-300',
      }
    case '-item':
      return {
        text: en
          ? `${zhPokemonId(parts[1])}'s ${parts[2]} activated!`
          : `${zhPokemonId(parts[1])} 的 ${parts[2]} 发动了！`,
        className: 'text-amber-300',
      }
    case '-enditem':
      return {
        text: en
          ? `${zhPokemonId(parts[1])} lost its ${parts[2]}!`
          : `${zhPokemonId(parts[1])} 失去了 ${parts[2]}！`,
        className: 'text-amber-300',
      }
    case '-transform':
      return {
        text: en
          ? `${zhPokemonId(parts[1])} transformed into ${zhPokemon(parts[2] ?? '')}!`
          : `${zhPokemonId(parts[1])} 变身为 ${zhPokemon(parts[2] ?? '')}！`,
        className: 'text-indigo-400',
      }
    case '-mega':
      return {
        text: en
          ? `${zhPokemonId(parts[1])} mega-evolved into Mega ${zhPokemon(parts[2] ?? '')}!`
          : `${zhPokemonId(parts[1])} 超级进化为超级 ${zhPokemon(parts[2] ?? '')}！`,
        className: 'text-pink-400 font-bold',
      }
    case '-terastallize':
      return {
        text: en
          ? `${zhPokemonId(parts[1])} terastallized into ${parts[2]} type!`
          : `${zhPokemonId(parts[1])} 太晶化为 ${parts[2]} 属性！`,
        className: 'text-yellow-300 font-bold',
      }
    case '-sethp': {
      const hp = parts[2]?.split(' ')[0] || ''
      return {
        text: en
          ? `${zhPokemonId(parts[1])}'s HP became ${hp}!`
          : `${zhPokemonId(parts[1])} 的HP变为 ${hp}！`,
        className: 'text-gray-300',
      }
    }
    case '-copyboost':
      return {
        text: en
          ? `${zhPokemonId(parts[1])} copied ${zhPokemonId(parts[2] ?? '')}'s stat changes!`
          : `${zhPokemonId(parts[1])} 复制了 ${zhPokemonId(parts[2] ?? '')} 的能力变化！`,
        className: 'text-cyan-300',
      }
    case '-swapboost':
      return {
        text: en
          ? `${zhPokemonId(parts[1])} swapped stat changes with ${zhPokemonId(parts[2] ?? '')}!`
          : `${zhPokemonId(parts[1])} 与 ${zhPokemonId(parts[2] ?? '')} 交换了能力变化！`,
        className: 'text-cyan-300',
      }
    case 'replace':
      return {
        text: en
          ? `${zhPokemon(parts[2]?.split(',')[0] ?? '')}'s illusion was broken!`
          : `${zhPokemon(parts[2]?.split(',')[0] ?? '')} 的幻象被揭穿了！`,
        className: 'text-purple-300',
      }
    case '-singleturn':
    case '-singlemove': {
      const effect = formatEffect(parts[2])
      const name = zhPokemonId(parts[1])
      if (en) {
        if (effect.includes('Protect') || effect.includes('Detect')) return { text: `${name} protected itself!`, className: 'text-green-300' }
        if (effect.includes('Endure')) return { text: `${name} braced itself!`, className: 'text-yellow-300' }
        if (effect.includes('Focus Punch')) return { text: `${name} is tightening its focus!`, className: 'text-red-300' }
        if (effect.includes('Destiny Bond')) return { text: `${name} is hoping to take its attacker down with it!`, className: 'text-purple-400' }
        return { text: `${name} used ${zhMove(effect)}!`, className: 'text-blue-200' }
      }
      if (effect.includes('Protect') || effect.includes('Detect')) return { text: `${name} 保护了自己！`, className: 'text-green-300' }
      if (effect.includes('Endure')) return { text: `${name} 咬牙撑住了！`, className: 'text-yellow-300' }
      if (effect.includes('Focus Punch')) return { text: `${name} 正在聚集力量！`, className: 'text-red-300' }
      if (effect.includes('Destiny Bond')) return { text: `${name} 打算与对手同归于尽！`, className: 'text-purple-400' }
      return { text: `${name} 使用了 ${zhMove(effect)}！`, className: 'text-blue-200' }
    }
    case '-center':
      return null
    case 'player':
    case 'teamsize':
    case 'gametype':
    case 'gen':
    case 'tier':
    case 'rule':
    case 'start':
    case 'upkeep':
    case 'clearpoke':
    case 'poke':
    case 'teampreview':
    case '':
    case 'request':
    case 'split':
    case 't:':
      return null // Hide meta messages
    default:
      // Show other messages with dimmed styling
      if (line.startsWith('|')) {
        return { text: line.slice(1), className: 'text-gray-500 text-xs' }
      }
      return null
  }
}

function formatEffect(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/^move:\s*/i, '')
    .replace(/^ability:\s*/i, '')
    .replace(/^item:\s*/i, '')
    .trim()
}

function formatStat(stat: string, lang: Language): string {
  if (lang === 'en') {
    const statNames: Record<string, string> = {
      atk: 'Attack',
      def: 'Defense',
      spa: 'Sp. Atk',
      spd: 'Sp. Def',
      spe: 'Speed',
      accuracy: 'accuracy',
      evasion: 'evasiveness',
    }
    return statNames[stat] || stat
  }
  const statNames: Record<string, string> = {
    atk: '攻击',
    def: '防御',
    spa: '特攻',
    spd: '特防',
    spe: '速度',
    accuracy: '命中率',
    evasion: '回避率',
  }
  return statNames[stat] || stat
}

function formatWeather(weather: string, lang: Language): string {
  if (lang === 'en') {
    const names: Record<string, string> = {
      RainDance: 'It started raining!',
      Sandstorm: 'A sandstorm kicked up!',
      SunnyDay: 'The sunlight grew harsh!',
      Snow: 'It started snowing!',
      Hail: 'It started to hail!',
    }
    return names[weather] || `${weather} started!`
  }
  const names: Record<string, string> = {
    RainDance: '开始下雨了！',
    Sandstorm: '掀起了沙暴！',
    SunnyDay: '阳光变得强烈！',
    Snow: '开始下雪了！',
    Hail: '开始降雹了！',
  }
  return names[weather] || `${weather} 开始了！`
}

export function formatStatus(status: string, lang: Language = getLanguage()): string {
  if (lang === 'en') {
    const statusNames: Record<string, string> = {
      brn: 'burned',
      par: 'paralyzed',
      slp: 'asleep',
      frz: 'frozen',
      psn: 'poisoned',
      tox: 'badly poisoned',
    }
    return statusNames[status] || status
  }
  const statusNames: Record<string, string> = {
    brn: '灼伤',
    par: '麻痹',
    slp: '睡眠',
    frz: '冰冻',
    psn: '中毒',
    tox: '剧毒',
  }
  return statusNames[status] || status
}
