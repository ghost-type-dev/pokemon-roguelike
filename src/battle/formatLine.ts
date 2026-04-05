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
      return {
        text: `${parts[1]} took damage! (${hp})`,
        className: 'text-red-400',
      }
    }
    case '-heal': {
      const hp = parts[2]?.split(' ')[0] || ''
      return {
        text: `${parts[1]} restored HP! (${hp})`,
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
    case '-boost':
      return {
        text: `${parts[1]}'s ${parts[2]} rose${parts[3] === '2' ? ' sharply' : ''}!`,
        className: 'text-cyan-400',
      }
    case '-unboost':
      return {
        text: `${parts[1]}'s ${parts[2]} fell${parts[3] === '2' ? ' harshly' : ''}!`,
        className: 'text-pink-400',
      }
    case '-weather':
      if (parts[1] === 'none') return { text: 'The weather cleared.', className: 'text-gray-300' }
      return { text: `The weather became ${parts[1]}!`, className: 'text-cyan-300' }
    case '-ability':
      return { text: `${parts[1]}'s ${parts[2]}!`, className: 'text-indigo-300' }
    case '-item':
    case '-enditem':
      return { text: `${parts[1]}'s ${parts[2]}!`, className: 'text-amber-300' }
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
