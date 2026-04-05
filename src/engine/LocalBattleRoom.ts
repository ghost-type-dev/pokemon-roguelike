import { BattleStreams, Teams, Streams } from '@pkmn/sim'
import { TeamGenerators } from '@pkmn/randoms'
import type { BattleEvent } from './types'
import { RandomAI, HeuristicAI, type LocalAI } from './local-ai'

Teams.setGeneratorFactory(TeamGenerators)

export interface BattleConfig {
  formatId: string
  p1AI: string
  p2AI: string
  p1Name: string
  p2Name: string
  p1Team: string
  p2Team: string
}

type EventCallback = (event: BattleEvent) => void
type RequestCallback = (request: any, side: any) => void
type FinishedCallback = (winner: string | null) => void
type WarningCallback = (message: string) => void

function createAI(aiId: string): LocalAI | null {
  if (aiId === 'human') return null
  if (aiId === 'heuristic') return new HeuristicAI()
  return new RandomAI()
}

function generateRandomTeam(formatId: string): string {
  const gen = TeamGenerators.getTeamGenerator(formatId)
  const team = gen.getTeam()
  for (const set of team) set.level = 50
  return Teams.pack(team)
}

export class LocalBattleRoom {
  private battleStream: InstanceType<typeof BattleStreams.BattleStream> | null = null
  private humanResolve: ((choice: string) => void) | null = null
  private aborted = false
  private p1AI: LocalAI | null = null
  private p2AI: LocalAI | null = null
  private onEvent: EventCallback
  private onRequest: RequestCallback
  private onFinished: FinishedCallback
  private onWarning: WarningCallback

  constructor(
    onEvent: EventCallback,
    onRequest: RequestCallback,
    onFinished: FinishedCallback,
    onWarning: WarningCallback,
  ) {
    this.onEvent = onEvent
    this.onRequest = onRequest
    this.onFinished = onFinished
    this.onWarning = onWarning
  }

  async start(config: BattleConfig) {
    this.aborted = false

    // Create AIs
    this.p1AI = createAI(config.p1AI)
    this.p2AI = createAI(config.p2AI)
    if (this.p1AI) this.p1AI.initialize('p1')
    if (this.p2AI) this.p2AI.initialize('p2')

    const p1IsHuman = config.p1AI === 'human'
    const p2IsHuman = config.p2AI === 'human'

    // Generate teams for random formats
    const isRandom = config.formatId.includes('random')
    const p1Team = isRandom ? generateRandomTeam(config.formatId) : config.p1Team
    const p2Team = isRandom ? generateRandomTeam(config.formatId) : config.p2Team

    // Create battle stream
    const stream = new BattleStreams.BattleStream()
    this.battleStream = stream
    const streams = BattleStreams.getPlayerStreams(stream)

    // Start player drivers
    const p1Done = this.runPlayer(streams.p1, 'p1', this.p1AI, p1IsHuman)
    const p2Done = this.runPlayer(streams.p2, 'p2', this.p2AI, p2IsHuman)

    // Collect and stream events from omniscient stream
    let currentTurn = 0
    let winner: string | null = null

    const collectDone = (async () => {
      for await (const chunk of streams.omniscient) {
        for (const line of chunk.split('\n')) {
          if (!line) continue

          const event: BattleEvent = {
            type: 'protocol',
            data: line,
            turn: currentTurn,
          }

          if (line.startsWith('|turn|')) {
            currentTurn = parseInt(line.split('|')[2])
            event.type = 'turn'
            event.turn = currentTurn
          } else if (line.startsWith('|win|')) {
            event.type = 'win'
            winner = line.split('|')[2]
          }

          this.onEvent(event)

          // Forward to AIs for tracking
          if (this.p1AI) this.p1AI.receiveUpdate(line)
          if (this.p2AI) this.p2AI.receiveUpdate(line)
        }
      }
    })()

    // Start the battle
    const seed = Array.from({ length: 4 }, () => Math.floor(Math.random() * 0x10000))
    const startCmd = [
      `>start ${JSON.stringify({ formatid: config.formatId, seed })}`,
      `>player p1 ${JSON.stringify({ name: config.p1Name, team: p1Team || undefined })}`,
      `>player p2 ${JSON.stringify({ name: config.p2Name, team: p2Team || undefined })}`,
    ].join('\n')

    void streams.omniscient.write(startCmd)

    // Wait for battle to complete
    await collectDone.catch(() => {})
    await Promise.allSettled([p1Done, p2Done])

    this.onFinished(winner)
  }

  submitHumanChoice(choice: string) {
    if (this.humanResolve) {
      const resolve = this.humanResolve
      this.humanResolve = null
      resolve(choice)
    }
  }

  abort() {
    this.aborted = true
    if (this.humanResolve) {
      this.humanResolve('default')
      this.humanResolve = null
    }
    if (this.battleStream) {
      this.battleStream.destroy()
      this.battleStream = null
    }
  }

  private async runPlayer(
    playerStream: Streams.ObjectReadWriteStream<string>,
    playerId: string,
    ai: LocalAI | null,
    isHuman: boolean,
  ) {
    try {
      for await (const chunk of playerStream) {
        if (this.aborted) return
        for (const line of chunk.split('\n')) {
          if (this.aborted) return
          if (!line.startsWith('|')) continue

          const pipeIndex = line.indexOf('|', 1)
          const cmd = pipeIndex >= 0 ? line.slice(1, pipeIndex) : line.slice(1)
          const rest = pipeIndex >= 0 ? line.slice(pipeIndex + 1) : ''

          if (cmd === 'error') {
            if (rest.startsWith('[Unavailable choice]')) continue
            if (rest.startsWith('[Invalid choice]')) {
              this.onWarning(`[${playerId}] Invalid choice, retrying with default`)
              try { playerStream.write('default') } catch { /* stream closed */ }
              continue
            }
            console.error(`[LocalBattleRoom] ${playerId} error:`, rest)
            continue
          }

          if (cmd === 'request') {
            if (!rest) continue
            try {
              const request = JSON.parse(rest)
              if (request.wait) continue

              let choice: string
              if (isHuman) {
                this.onRequest(request, request.side)
                choice = await this.waitForHumanChoice()
              } else {
                choice = ai!.chooseAction(request)
              }
              if (this.aborted) return
              playerStream.write(choice)
            } catch (e) {
              if (this.aborted) return
              console.error(`[LocalBattleRoom] ${playerId} request error:`, e)
              try { playerStream.write('default') } catch { /* stream closed */ }
            }
          }
        }
      }
    } catch {
      // Stream destroyed during iteration — expected on abort
    }
  }

  private waitForHumanChoice(): Promise<string> {
    return new Promise((resolve) => {
      this.humanResolve = resolve
      setTimeout(() => {
        if (this.humanResolve === resolve) {
          this.humanResolve = null
          resolve('default')
        }
      }, 5 * 60 * 1000)
    })
  }
}
