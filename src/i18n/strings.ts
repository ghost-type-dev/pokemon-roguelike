import type { StatID } from '@pkmn/data'
import { useLanguage } from './useLanguage'

/**
 * UI string dictionaries for English and Chinese.
 *
 * Both objects must have identical keys. Parameterized strings are functions.
 * Use via `const t = useT()` in components.
 */

const en = {
  // Home / run header
  appTitle: 'Pokemon Roguelike',
  introBlurb: 'Take a starter Pokemon team and challenge increasingly powerful opponents. Earn rewards between battles to strengthen your team.',
  introBullets: [
    'Pick 3 starters from 6 candidates to begin your adventure',
    'Team size grows with rounds: 3 (1–10), 4 (11–20), 5 (21–30), 6 (31–40)',
    'All Pokemon are level 50 with perfect IVs',
    'Rewards include items, TMs, EVs, and new Pokemon',
    'Opponents grow stronger each round — 40 rounds total',
    'Defeated? Retry from the previous reward screen',
    'Clear all 40 rounds to become Champion!',
  ],
  aiDifficulty: 'AI Difficulty',
  aiDifficultyEasy: 'Easy (Random AI)',
  aiDifficultyHard: 'Hard (Heuristic AI)',
  startNewGame: 'Start New Game',
  loadFromFile: 'Load Save File',
  autoLoadedHint: 'Your previous run has been loaded automatically.',
  saveToFile: 'Save to File',
  abandonRun: 'Abandon Run',
  itemsHeld: (n: number) => `${n} item${n !== 1 ? 's' : ''}`,
  roundCounter: (cur: number, total: number) => `Round ${cur}/${total}`,

  // Draft pick
  draftTitle: 'Draft Your Team',
  draftPickRemaining: (n: number) => `Pick ${n} more Pokemon to start your run.`,
  draftBstHint: '(BST < 330)',
  draftPicked: 'Picked!',
  generatingCandidates: 'Generating draft candidates...',
  loadingMoves: 'Loading moves...',
  baseStatsLine: (bst: number) => `Base Stats (BST: ${bst})`,
  abilityLabel: 'Ability:',
  natureLabel: 'Nature:',
  movesLabel: 'Moves',
  neutralNature: 'Neutral',
  catPhys: 'Phys',
  catSpec: 'Spec',
  catStat: 'Stat',

  // Prepare stage
  prepareTitle: (round: number) => `Prepare for Round ${round}`,
  readyForBattle: 'Ready for Battle',
  yourTeam: 'Your Team',
  topNBattle: (n: number) => `(top ${n} battle)`,
  inventory: 'Inventory',
  selectPokemonHint: 'Select a Pokemon to configure',
  evolutionLabel: 'Evolution',
  bstShort: (bst: number) => `BST ${bst}`,
  evolveToFmt: (name: string) => `Evolve to ${name}`,
  abilityField: 'Ability',
  natureField: 'Nature',
  heldItemField: 'Held Item',
  movesField: 'Moves',
  movePlaceholder: (n: number) => `Move ${n}`,
  noItemPlaceholder: 'No item (pick from inventory)',
  catPhysical: 'Physical',
  catSpecial: 'Special',
  catStatus: 'Status',
  catPhysicalIcon: '⚔ Physical',
  catSpecialIcon: '✦ Special',
  catStatusIcon: '◎ Status',
  accSuffix: (n: number) => `${n}% acc`,
  ppSuffix: (n: number) => `${n} PP`,
  prioritySuffix: (n: number) => `Priority ${n > 0 ? '+' : ''}${n}`,
  statsHeader: 'Stats',
  evTotalLabel: (cur: number, max: number) => `EVs: ${cur} / ${max}`,
  saveBtn: 'Save',
  colStat: 'Stat',
  colBase: 'Base',
  colIv: 'IV',
  colEv: 'EV',
  colTotal: 'Total',
  noMoves: 'No moves',
  evShort: 'EV',

  // Reward stage
  teamDrafted: 'Team Drafted!',
  victoryRoundCleared: (n: number) => `Victory! Round ${n} cleared!`,
  chooseReward: 'Choose a reward.',
  hideTeam: 'Hide Team',
  reviewTeam: 'Review Team',
  pickPokemonForMove: 'Pick a Pokemon to learn a new move',
  newMoveForFmt: (name: string) => `New Move for ${name}`,
  noUnlearnedMovesFmt: (name: string) => `No unlearned moves available for ${name}. Reward skipped.`,
  continueBtn: 'Continue',
  pickMoveLabel: 'Pick a move to learn',
  learnMoveBtn: 'Learn Move',
  teamFullReplaceHint: 'Team is full — choose a Pokemon to replace:',
  backBtn: 'Back',
  claimReward: 'Claim Reward',
  replaceAndRecruit: 'Replace & Recruit',
  rewardItemLabel: (item: string) => `Item: ${item}`,
  rewardTmLabel: 'Learn New Move',
  rewardAbilityLabel: (ability: string) => `Ability: ${ability}`,
  rewardEvLabel: (stat: string) => `+80 ${stat} EVs`,
  rewardNatureLabel: (nature: string) => `Nature: ${nature}`,
  rewardRecruitLabel: (name: string) => `Recruit: ${name}`,
  rewardItemDesc: (item: string) => `Add ${item} to your inventory.`,
  rewardTmDesc: 'Pick a Pokemon and teach it a new move.',
  rewardAbilityDesc: (name: string, ability: string) => `Change ${name}'s ability to ${ability}.`,
  rewardEvDesc: (name: string, stat: string) => `Add 80 EVs to ${name}'s ${stat}.`,
  rewardNatureNeutral: '(Neutral)',
  rewardNaturePlusMinus: (plus: string, minus: string) => `(+${plus}, -${minus})`,
  rewardNatureDesc: (name: string, nature: string, effect: string) => `Change ${name}'s nature to ${nature} ${effect}.`,
  rewardRecruitReplaceDesc: (name: string) => `Replace a teammate with ${name} from the defeated team.`,
  rewardRecruitJoinDesc: (name: string) => `Add ${name} from the defeated team to your roster.`,

  // Game over
  championTitle: 'Champion!',
  championBlurb: 'You conquered all 40 rounds!',
  gameOverTitle: 'Game Over',
  roundsClearedFmt: (n: number) => `You made it through ${n} round${n !== 1 ? 's' : ''} of 40.`,
  finalTeam: 'Final Team',
  noItem: 'No item',
  runStats: 'Run Stats',
  roundsWon: 'Rounds Won',
  finalTeamSize: 'Final Team Size',
  itemsCollected: 'Items Collected',
  tmsUnlocked: 'TMs Unlocked',
  startNewRunBtn: 'Start New Run',

  // Move panel / battle panels
  whatWillDoFmt: (name: string) => `What will ${name} do?`,
  switchTo: 'Switch to:',
  fainted: 'Fainted',
  active: 'Active',
  hpPctFmt: (n: number) => `${n}% HP`,
  forceSwitchPrompt: 'Choose a Pokemon to send out!',
  switchPrompt: 'Switch to which Pokemon?',

  // Battle stage header
  generatingOpponent: 'Generating opponent team...',
  roundBattleFmt: (round: number) => `Round ${round} Battle`,
  turnFmt: (turn: number) => `Turn ${turn}`,
  yourTurnLabel: 'Your turn',
  victoryLabel: 'Victory!',
  defeatedLabel: 'Defeated...',
  battleLogHeading: 'Battle Log',
  playerName: 'Player',
  bossNameFmt: (round: number) => `Round ${round} Boss`,

  // Team panel
  itemColon: 'Item:',
  abilityColon: 'Ability:',
  statsColon: 'Stats:',
  movesColon: 'Moves:',
  noneItem: 'None',
  bpSuffix: 'BP',

  // Search
  searchMoves: 'Search moves...',
  searchGeneric: 'Search...',
  noResults: 'No results',
  selectPlaceholder: 'Select...',

  // Stat full names
  statFull: { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' } as Record<StatID, string>,
  // Stat short names — used in tables; same as STAT_LABELS in constants
  statShort: { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' } as Record<StatID, string>,
  // Nature names
  nature: {
    Hardy: 'Hardy', Lonely: 'Lonely', Brave: 'Brave', Adamant: 'Adamant', Naughty: 'Naughty',
    Bold: 'Bold', Docile: 'Docile', Relaxed: 'Relaxed', Impish: 'Impish', Lax: 'Lax',
    Timid: 'Timid', Hasty: 'Hasty', Serious: 'Serious', Jolly: 'Jolly', Naive: 'Naive',
    Modest: 'Modest', Mild: 'Mild', Quiet: 'Quiet', Bashful: 'Bashful', Rash: 'Rash',
    Calm: 'Calm', Gentle: 'Gentle', Sassy: 'Sassy', Careful: 'Careful', Quirky: 'Quirky',
  } as Record<string, string>,

  // Language toggle
  langToggleEn: 'EN',
  langToggleZh: '中',
}

const zh: typeof en = {
  // Home / run header
  appTitle: '宝可梦 Roguelike',
  introBlurb: '用初始宝可梦挑战逐渐强大的对手，在每轮战斗之间获得奖励来强化队伍。',
  introBullets: [
    '从 6 只候选宝可梦中选 3 只开始冒险',
    '队伍规模随轮次增长：3（第1-10轮）、4（第11-20轮）、5（第21-30轮）、6（第31-40轮）',
    '所有宝可梦均为 50 级且 IV 全满',
    '通关奖励包括道具、TM、努力值和新宝可梦',
    '对手强度随轮次递增，共 40 轮',
    '战败？可从上一个奖励界面重试',
    '通关全部 40 轮，成为冠军！',
  ],
  aiDifficulty: 'AI 难度',
  aiDifficultyEasy: '简单（随机 AI）',
  aiDifficultyHard: '困难（启发式 AI）',
  startNewGame: '开始新游戏',
  loadFromFile: '从文件读取存档',
  autoLoadedHint: '已自动加载上次的存档。',
  saveToFile: '保存到文件',
  abandonRun: '放弃本局',
  itemsHeld: (n: number) => `${n} 件道具`,
  roundCounter: (cur: number, total: number) => `第 ${cur}/${total} 轮`,

  // Draft pick
  draftTitle: '选择你的队伍',
  draftPickRemaining: (n: number) => `还需选择 ${n} 只宝可梦开始冒险。`,
  draftBstHint: '（种族值 < 330）',
  draftPicked: '已选！',
  generatingCandidates: '正在生成候选宝可梦……',
  loadingMoves: '加载招式中……',
  baseStatsLine: (bst: number) => `能力值（种族值：${bst}）`,
  abilityLabel: '特性：',
  natureLabel: '性格：',
  movesLabel: '招式',
  neutralNature: '中性',
  catPhys: '物理',
  catSpec: '特殊',
  catStat: '变化',

  // Prepare stage
  prepareTitle: (round: number) => `第 ${round} 轮准备`,
  readyForBattle: '准备战斗',
  yourTeam: '你的队伍',
  topNBattle: (n: number) => `（前 ${n} 只参战）`,
  inventory: '道具栏',
  selectPokemonHint: '选择一只宝可梦进行配置',
  evolutionLabel: '进化',
  bstShort: (bst: number) => `种族值 ${bst}`,
  evolveToFmt: (name: string) => `进化为 ${name}`,
  abilityField: '特性',
  natureField: '性格',
  heldItemField: '携带道具',
  movesField: '招式',
  movePlaceholder: (n: number) => `招式 ${n}`,
  noItemPlaceholder: '无道具（从背包中选择）',
  catPhysical: '物理',
  catSpecial: '特殊',
  catStatus: '变化',
  catPhysicalIcon: '⚔ 物理',
  catSpecialIcon: '✦ 特殊',
  catStatusIcon: '◎ 变化',
  accSuffix: (n: number) => `命中 ${n}%`,
  ppSuffix: (n: number) => `PP ${n}`,
  prioritySuffix: (n: number) => `优先度 ${n > 0 ? '+' : ''}${n}`,
  statsHeader: '能力值',
  evTotalLabel: (cur: number, max: number) => `努力值: ${cur} / ${max}`,
  saveBtn: '保存',
  colStat: '能力',
  colBase: '种族值',
  colIv: '个体值',
  colEv: '努力值',
  colTotal: '实数值',
  noMoves: '无招式',
  evShort: '努',

  // Reward stage
  teamDrafted: '队伍组建完成！',
  victoryRoundCleared: (n: number) => `胜利！通过第 ${n} 轮！`,
  chooseReward: '选择一项奖励。',
  hideTeam: '隐藏队伍',
  reviewTeam: '查看队伍',
  pickPokemonForMove: '选择一只宝可梦学习新招式',
  newMoveForFmt: (name: string) => `${name} 的新招式`,
  noUnlearnedMovesFmt: (name: string) => `${name} 没有可学习的新招式。奖励已跳过。`,
  continueBtn: '继续',
  pickMoveLabel: '选择要学习的招式',
  learnMoveBtn: '学习招式',
  teamFullReplaceHint: '队伍已满 — 请选择要替换的宝可梦：',
  backBtn: '返回',
  claimReward: '领取奖励',
  replaceAndRecruit: '替换并招募',
  rewardItemLabel: (item: string) => `道具：${item}`,
  rewardTmLabel: '学习新技能',
  rewardAbilityLabel: (ability: string) => `特性：${ability}`,
  rewardEvLabel: (stat: string) => `+80 ${stat}努力值`,
  rewardNatureLabel: (nature: string) => `性格：${nature}`,
  rewardRecruitLabel: (name: string) => `招募：${name}`,
  rewardItemDesc: (item: string) => `将 ${item} 加入道具栏。`,
  rewardTmDesc: '选择一只精灵并教它一个新技能。',
  rewardAbilityDesc: (name: string, ability: string) => `将 ${name} 的特性改为${ability}。`,
  rewardEvDesc: (name: string, stat: string) => `为 ${name} 的${stat}增加 80 努力值。`,
  rewardNatureNeutral: '（中性）',
  rewardNaturePlusMinus: (plus: string, minus: string) => `（+${plus}，-${minus}）`,
  rewardNatureDesc: (name: string, nature: string, effect: string) => `将 ${name} 的性格改为${nature}${effect}。`,
  rewardRecruitReplaceDesc: (name: string) => `用击败队伍中的 ${name} 替换一名队员。`,
  rewardRecruitJoinDesc: (name: string) => `将击败队伍中的 ${name} 加入队伍。`,

  // Game over
  championTitle: '冠军！',
  championBlurb: '你通关了全部 40 轮！',
  gameOverTitle: '游戏结束',
  roundsClearedFmt: (n: number) => `你通过了 40 轮中的 ${n} 轮。`,
  finalTeam: '最终队伍',
  noItem: '无道具',
  runStats: '本局统计',
  roundsWon: '通过轮数',
  finalTeamSize: '最终队伍规模',
  itemsCollected: '收集道具',
  tmsUnlocked: '解锁 TM',
  startNewRunBtn: '开始新一局',

  // Move panel / battle panels
  whatWillDoFmt: (name: string) => `${name} 要做什么？`,
  switchTo: '切换到：',
  fainted: '濒死',
  active: '上场中',
  hpPctFmt: (n: number) => `HP ${n}%`,
  forceSwitchPrompt: '请派出下一只宝可梦！',
  switchPrompt: '要切换到哪只宝可梦？',

  // Battle stage header
  generatingOpponent: '正在生成对手队伍……',
  roundBattleFmt: (round: number) => `第 ${round} 轮战斗`,
  turnFmt: (turn: number) => `第 ${turn} 回合`,
  yourTurnLabel: '你的回合',
  victoryLabel: '胜利！',
  defeatedLabel: '败北……',
  battleLogHeading: '战斗日志',
  playerName: '玩家',
  bossNameFmt: (round: number) => `第 ${round} 轮 Boss`,

  // Team panel
  itemColon: '道具：',
  abilityColon: '特性：',
  statsColon: '能力：',
  movesColon: '招式：',
  noneItem: '无',
  bpSuffix: '威力',

  // Search
  searchMoves: '搜索招式……',
  searchGeneric: '搜索……',
  noResults: '无结果',
  selectPlaceholder: '选择……',

  // Stat full names
  statFull: { hp: 'HP', atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度' },
  statShort: { hp: 'HP', atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度' },

  // Nature names
  nature: {
    Hardy: '勤奋', Lonely: '孤独', Brave: '勇敢', Adamant: '固执', Naughty: '顽皮',
    Bold: '大胆', Docile: '坦率', Relaxed: '悠闲', Impish: '淘气', Lax: '乐天',
    Timid: '胆小', Hasty: '急躁', Serious: '认真', Jolly: '爽朗', Naive: '天真',
    Modest: '内敛', Mild: '温和', Quiet: '冷静', Bashful: '害羞', Rash: '马虎',
    Calm: '温顺', Gentle: '温柔', Sassy: '自大', Careful: '慎重', Quirky: '浮躁',
  },

  // Language toggle
  langToggleEn: 'EN',
  langToggleZh: '中',
}

export const STRINGS = { en, zh } as const

export type Strings = typeof en

/** React hook — returns the current language's string dictionary and re-renders on language change. */
export function useT(): Strings {
  const language = useLanguage()
  return STRINGS[language]
}
