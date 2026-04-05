import { useBattleStore } from '../battle/useBattleStore'
import { LocalBattleRoom } from './LocalBattleRoom'

export class BattleManager {
  private room: LocalBattleRoom | null = null

  connect() { /* no-op for local */ }
  disconnect() { this.room?.abort() }

  async startBattleWithTeams(config: {
    formatId: string
    p1AI: string
    p2AI: string
    p1Name: string
    p2Name: string
    p1PackedTeam: string
    p2PackedTeam: string
  }) {
    const store = useBattleStore.getState()
    store.reset()
    store.setStatus('running')

    this.room = new LocalBattleRoom(
      (event) => { store.addEvent(event); store.addVisibleEvent(event) },
      (request, side) => { store.setHumanRequest({ ...request, side }) },
      (winner) => {
        store.setHumanRequest(null)
        store.setWinner(winner)
        store.setStatus('finished')
      },
      (msg) => { store.addWarning(msg) },
    )

    // Don't await — start() resolves only when the battle ends.
    // The battle runs in the background, communicating via store callbacks.
    void this.room.start({
      formatId: config.formatId,
      p1AI: config.p1AI,
      p2AI: config.p2AI,
      p1Name: config.p1Name,
      p2Name: config.p2Name,
      p1Team: config.p1PackedTeam,
      p2Team: config.p2PackedTeam,
    })
  }

  submitHumanChoice(choice: string) {
    useBattleStore.getState().setHumanRequest(null)
    this.room?.submitHumanChoice(choice)
  }

  abort() {
    this.room?.abort()
    const store = useBattleStore.getState()
    store.setHumanRequest(null)
    store.setStatus('idle')
  }

  get isConnected() { return true }
}

export const battleManager = new BattleManager()
