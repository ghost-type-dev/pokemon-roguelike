export function formatLine(line: string): { text: string; className: string } | null {
  if (!line || line === '|') return null

  const parts = line.split('|').filter(Boolean)
  if (!parts.length) return null

  const type = parts[0]

  switch (type) {
    case 'move':
      return {
        text: `${parts[1]} used ${parts[2]}!`,
        className: 'text-blue-300',
      }
    case '-damage':
    case '-hurt': {
      const hp = parts[2]?.split(' ')[0] || ''
      const source = parts[3] ? ` (${formatEffect(parts[3])})` : ''
      return {
        text: `${parts[1]} took damage! (${hp})${source}`,
        className: 'text-red-400',
      }
    }
    case '-heal': {
      const hp = parts[2]?.split(' ')[0] || ''
      const source = parts[3] ? ` (${formatEffect(parts[3])})` : ''
      return {
        text: `${parts[1]} restored HP! (${hp})${source}`,
        className: 'text-green-400',
      }
    }
    case 'faint':
      return {
        text: `${parts[1]} fainted!`,
        className: 'text-red-500 font-bold',
      }
    case 'switch':
    case 'drag':
      return {
        text: `${parts[1]} sent out ${parts[2]?.split(',')[0]}!`,
        className: 'text-yellow-300',
      }
    case 'turn':
      return {
        text: `--- Turn ${parts[1]} ---`,
        className: 'text-white font-bold text-center border-t border-gray-600 pt-1 mt-1',
      }
    case 'win':
      return {
        text: `${parts[1]} won the battle!`,
        className: 'text-yellow-400 font-bold text-lg text-center',
      }
    case 'tie':
      return {
        text: 'The battle ended in a tie!',
        className: 'text-gray-300 font-bold text-lg text-center',
      }
    case '-supereffective':
      return { text: "It's super effective!", className: 'text-orange-400' }
    case '-resisted':
      return { text: "It's not very effective...", className: 'text-gray-400' }
    case '-crit':
      return { text: 'A critical hit!', className: 'text-yellow-500' }
    case '-miss':
      return { text: `${parts[1]}'s attack missed!`, className: 'text-gray-500' }
    case '-immune':
      return { text: `It doesn't affect ${parts[1]}...`, className: 'text-gray-500' }
    case '-fail':
      return { text: `But it failed!`, className: 'text-gray-500' }
    case '-notarget':
      return { text: `But there was no target...`, className: 'text-gray-500' }
    case '-ohko':
      return { text: "It's a one-hit KO!", className: 'text-red-500 font-bold' }
    case '-hitcount':
      return { text: `Hit ${parts[2]} time(s)!`, className: 'text-blue-300' }
    case '-status':
      return {
        text: `${parts[1]} was ${formatStatus(parts[2])}!`,
        className: 'text-purple-400',
      }
    case '-curestatus':
      return {
        text: `${parts[1]} was cured of its ${formatStatus(parts[2])}!`,
        className: 'text-green-300',
      }
    case 'cant': {
      const reason = parts[2] || ''
      if (reason === 'flinch') return { text: `${parts[1]} flinched and couldn't move!`, className: 'text-orange-300' }
      if (reason === 'par') return { text: `${parts[1]} is paralyzed! It can't move!`, className: 'text-yellow-500' }
      if (reason === 'slp') return { text: `${parts[1]} is fast asleep.`, className: 'text-gray-400' }
      if (reason === 'frz') return { text: `${parts[1]} is frozen solid!`, className: 'text-cyan-400' }
      if (reason === 'recharge') return { text: `${parts[1]} must recharge!`, className: 'text-gray-400' }
      return { text: `${parts[1]} couldn't move!`, className: 'text-orange-300' }
    }
    case '-boost': {
      const amount = parseInt(parts[3] || '1')
      const word = amount >= 3 ? ' drastically' : amount === 2 ? ' sharply' : ''
      return {
        text: `${parts[1]}'s ${formatStat(parts[2])} rose${word}!`,
        className: 'text-cyan-400',
      }
    }
    case '-unboost': {
      const amount = parseInt(parts[3] || '1')
      const word = amount >= 3 ? ' drastically' : amount === 2 ? ' harshly' : ''
      return {
        text: `${parts[1]}'s ${formatStat(parts[2])} fell${word}!`,
        className: 'text-pink-400',
      }
    }
    case '-setboost':
      return {
        text: `${parts[1]}'s ${formatStat(parts[2])} was set to ${parts[3]}!`,
        className: 'text-cyan-400',
      }
    case '-clearboost':
    case '-clearallboost':
      return { text: `${parts[1]}'s stat changes were removed!`, className: 'text-gray-300' }
    case '-weather':
      if (parts[1] === 'none') return { text: 'The weather cleared.', className: 'text-gray-300' }
      if (parts[2] === '[upkeep]') return { text: `${formatWeather(parts[1])} continues.`, className: 'text-cyan-300' }
      return { text: `${formatWeather(parts[1])}`, className: 'text-cyan-300' }
    case '-fieldstart': {
      const field = formatEffect(parts[1])
      return { text: `${field} started!`, className: 'text-indigo-300' }
    }
    case '-fieldend': {
      const field = formatEffect(parts[1])
      return { text: `${field} ended.`, className: 'text-gray-300' }
    }
    case '-sidestart': {
      const side = parts[1]
      const effect = formatEffect(parts[2])
      return { text: `${effect} was set on ${side}'s side!`, className: 'text-indigo-300' }
    }
    case '-sideend': {
      const side = parts[1]
      const effect = formatEffect(parts[2])
      return { text: `${effect} ended on ${side}'s side.`, className: 'text-gray-300' }
    }
    case '-start': {
      const effect = formatEffect(parts[2])
      if (effect === 'confusion') return { text: `${parts[1]} became confused!`, className: 'text-purple-400' }
      if (effect.includes('Leech Seed')) return { text: `${parts[1]} was seeded!`, className: 'text-green-500' }
      if (effect.includes('Substitute')) return { text: `${parts[1]} put up a Substitute!`, className: 'text-green-300' }
      if (effect.includes('Encore')) return { text: `${parts[1]} received an Encore!`, className: 'text-pink-300' }
      if (effect.includes('Taunt')) return { text: `${parts[1]} fell for the Taunt!`, className: 'text-pink-300' }
      if (effect.includes('Disable')) return { text: `${parts[1]}'s move was Disabled!`, className: 'text-pink-300' }
      if (effect.includes('Yawn')) return { text: `${parts[1]} grew drowsy!`, className: 'text-gray-400' }
      if (effect.includes('Perish')) return { text: `All Pokemon hearing the song will faint in 3 turns!`, className: 'text-red-400' }
      if (effect.includes('Curse')) return { text: `${parts[1]} was afflicted by a Curse!`, className: 'text-purple-500' }
      if (effect.includes('Nightmare')) return { text: `${parts[1]} began having a Nightmare!`, className: 'text-purple-500' }
      if (effect.includes('Torment')) return { text: `${parts[1]} was subjected to Torment!`, className: 'text-pink-300' }
      return { text: `${parts[1]} started ${effect}!`, className: 'text-indigo-300' }
    }
    case '-end': {
      const effect = formatEffect(parts[2])
      if (effect === 'confusion') return { text: `${parts[1]} snapped out of confusion!`, className: 'text-green-300' }
      if (effect.includes('Substitute')) return { text: `${parts[1]}'s Substitute faded!`, className: 'text-gray-400' }
      return { text: `${parts[1]}'s ${effect} ended.`, className: 'text-gray-300' }
    }
    case '-activate': {
      const effect = formatEffect(parts[2])
      if (effect.includes('Protect') || effect.includes('Detect')) return { text: `${parts[1]} protected itself!`, className: 'text-green-300' }
      if (effect.includes('Sturdy')) return { text: `${parts[1]} endured the hit with Sturdy!`, className: 'text-yellow-300' }
      if (effect.includes('Substitute')) return { text: `The substitute took damage for ${parts[1]}!`, className: 'text-gray-400' }
      if (effect.includes('Destiny Bond')) return { text: `${parts[1]} took its attacker down with it!`, className: 'text-purple-500 font-bold' }
      return { text: `${parts[1]}'s ${effect} activated!`, className: 'text-indigo-300' }
    }
    case '-prepare':
      return { text: `${parts[1]} is preparing ${parts[2]}!`, className: 'text-blue-200' }
    case '-mustrecharge':
      return { text: `${parts[1]} must recharge!`, className: 'text-gray-400' }
    case '-ability':
      return { text: `${parts[1]}'s ${parts[2]}!`, className: 'text-indigo-300' }
    case '-item':
      return { text: `${parts[1]}'s ${parts[2]}!`, className: 'text-amber-300' }
    case '-enditem':
      return { text: `${parts[1]} lost its ${parts[2]}!`, className: 'text-amber-300' }
    case '-transform':
      return { text: `${parts[1]} transformed into ${parts[2]}!`, className: 'text-indigo-400' }
    case '-mega':
      return { text: `${parts[1]} Mega Evolved into Mega ${parts[2]}!`, className: 'text-pink-400 font-bold' }
    case '-terastallize':
      return { text: `${parts[1]} terastallized into ${parts[2]} type!`, className: 'text-yellow-300 font-bold' }
    case '-sethp': {
      const hp = parts[2]?.split(' ')[0] || ''
      return { text: `${parts[1]}'s HP was set to ${hp}!`, className: 'text-gray-300' }
    }
    case '-copyboost':
      return { text: `${parts[1]} copied ${parts[2]}'s stat changes!`, className: 'text-cyan-300' }
    case '-swapboost':
      return { text: `${parts[1]} swapped stat changes with ${parts[2]}!`, className: 'text-cyan-300' }
    case 'replace':
      return { text: `${parts[2]?.split(',')[0]}'s illusion wore off!`, className: 'text-purple-300' }
    case '-singleturn':
    case '-singlemove': {
      const effect = formatEffect(parts[2])
      if (effect.includes('Protect') || effect.includes('Detect')) return { text: `${parts[1]} protected itself!`, className: 'text-green-300' }
      if (effect.includes('Endure')) return { text: `${parts[1]} braced itself!`, className: 'text-yellow-300' }
      if (effect.includes('Focus Punch')) return { text: `${parts[1]} is tightening its focus!`, className: 'text-red-300' }
      if (effect.includes('Destiny Bond')) return { text: `${parts[1]} is trying to take its foe down with it!`, className: 'text-purple-400' }
      return { text: `${parts[1]} used ${effect}!`, className: 'text-blue-200' }
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

function formatStat(stat: string): string {
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

function formatWeather(weather: string): string {
  const names: Record<string, string> = {
    RainDance: 'It started to rain!',
    Sandstorm: 'A sandstorm kicked up!',
    SunnyDay: 'The sunlight turned harsh!',
    Snow: 'It started to snow!',
    Hail: 'It started to hail!',
  }
  return names[weather] || `${weather} started!`
}

export function formatStatus(status: string): string {
  const statusNames: Record<string, string> = {
    brn: 'burned',
    par: 'paralyzed',
    slp: 'put to sleep',
    frz: 'frozen',
    psn: 'poisoned',
    tox: 'badly poisoned',
  }
  return statusNames[status] || status
}
