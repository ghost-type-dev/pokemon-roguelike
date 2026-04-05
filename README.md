# Pokemon Roguelike

A browser-based Pokemon roguelike game. Draft a team of low-BST Pokemon, battle through increasingly difficult rounds, earn rewards (new moves, nature changes, evolutions), and see how far you can go.

Built with React, TypeScript, and [@pkmn/sim](https://github.com/pkmn/ps) — all battles run entirely in your browser, no server required.

## Play (no install)

Download the `dist/` folder, then open `dist/index.html` in your browser. That's it.

## Development

Requires [Node.js](https://nodejs.org/) (v18+).

```bash
npm install
npm run dev
```

Opens a dev server at `http://localhost:5173`.

## Build

```bash
npm run build
```

Produces a standalone `dist/` folder. The build is designed to work when opened directly from the filesystem (`file://` protocol) — no web server needed.

## How It Works

- **Draft phase**: Pick 3 Pokemon from 6 random candidates (BST < 330)
- **Prepare phase**: Review your team, manage moves, evolve Pokemon when eligible
- **Battle phase**: Fight AI opponents with increasing difficulty
- **Reward phase**: After each win, choose a reward — learn a new move, change a nature, or add a new team member
- **Progression**: Opponents scale in strength; your Pokemon can evolve once the next opponent's average BST exceeds the evolved form's BST
- Save/load your run as a JSON file at any time
