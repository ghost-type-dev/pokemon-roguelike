# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pokemon Roguelike is a browser-based roguelike game built with React, TypeScript, and Vite. The game runs entirely client-side using `@pkmn/sim` for battle simulation. Players draft a weak starting roster, survive progressively harder opponents over 40 rounds, and improve their team through rewards (items, TMs, stat boosts, new team members).

## Development Commands

### Build & Dev
- `npm install` — Install dependencies
- `npm run dev` — Start Vite dev server (default: http://localhost:5173)
- `npm run build` — Compile TypeScript and bundle for production (output: `dist/`)
- `npm run preview` — Preview production build locally

### Useful Patterns
- Dev server hot-reloads on file changes
- TypeScript is strict with `noUnusedLocals` and `noUnusedParameters` enabled
- All source code is in `src/`; built output in `dist/` is not tracked in Git

## Architecture

The codebase is organized into focused domains:

### Core Systems

**`/src/roguelike/`** — Game state and progression
- `useRoguelikeStore.ts` — Zustand store managing game phases, roster, inventory, rounds, rewards, draft picks, save/load logic
- Phases: `idle` → `draft-pick` → `prepare` → `battle` → `reward` → `game-over`
- Inventory tracks collected items and unlocked TMs per Pokémon species
- Persists to localStorage; supports JSON export/import for run sharing

**`/src/battle/`** — Battle UI and interaction
- `BattleScene.tsx` — Main battle UI container
- `useBattleStore.ts` — Zustand store for battle state (events, visible log, current request, winner)
- `MovePanel.tsx`, `TeamPanel.tsx`, `HPBar.tsx`, `PokemonSprite.tsx` — UI components
- `BattleLog.tsx`, `formatLine.ts` — Battle event formatting and display

**`/src/engine/`** — Battle simulation layer
- `LocalBattleRoom.ts` — Wraps `@pkmn/sim` to run a full battle simulation in-browser
- `BattleManager.ts` — Orchestrates battle lifecycle (start, submit moves, finish)
- `local-ai.ts` — AI decision logic for opponent moves
- Battle runs asynchronously in the background; UI updates via store callbacks

**`/src/teambuilder/`** — Pokémon roster management
- `useTeamBuilder.ts` — Utilities for building/validating team JSON sets
- `dex-helpers.ts` — Pokédex lookups using `@pkmn/dex` and `@pkmn/data`
- `SearchSelect.tsx` — Searchable Pokémon/move/item picker UI

**`/src/roguelike/` stages** — Game phase UIs
- `RoguelikePage.tsx` — Phase router
- `DraftPick.tsx` — Select 3 Pokémon from 6 random draft options
- `PrepareStage.tsx` — Manage roster, items, moves, evolutions before battle
- `BattleStage.tsx` — Display active battle
- `RewardStage.tsx` — Choose reward after win (items, TMs, EVs, nature, new team member)
- `GameOverScreen.tsx` — Display loss and retry/abandon options

### Data & Helpers

**`roguelike-helpers.ts`** — Game logic
- `createStarterSet()` — Generate weak starting Pokémon for draft
- `generateRewardOptions()` — Create available rewards based on progress
- `fillAIMoves()` — Assign legal moves to opponent team
- `getEvolutionProgress()` — Calculate evolution eligibility

**`constants.ts`** — Game balance
- Opponent team scaling (BST per round)
- Reward rarities and values
- Move/item restrictions

### External Dependencies

- **`@pkmn/sim`** — Battle engine (imported with Node.js polyfills in `main.tsx`)
- **`@pkmn/dex`, `@pkmn/data`, `@pkmn/sets`** — Pokémon info, moves, items, default sets
- **`@smogon/calc`** — Damage calculation
- **`zustand`** — State management (both stores export `create()` + typed store hooks)
- **`react` + `react-dom`** — UI framework
- **`tailwindcss`** — Utility-first CSS (configured in vite plugin)

## State Management

Both `useRoguelikeStore` and `useBattleStore` are Zustand stores:
- Access state: `store.phase`, `store.roster`, etc.
- Dispatch actions: `store.pickDraft()`, `store.applyReward()`, etc.
- Get state outside React: `useRoguelikeStore.getState()`
- Subscribe to updates: `useRoguelikeStore.subscribe()`

Battle store is reset at the start of each battle to clear previous events; roguelike store persists across the full run.

## TypeScript & Build

- Target: ES2023
- Strict mode enabled (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- Build includes TypeScript checking: `npm run build` runs `tsc -b` before Vite bundling
- JSX: React 19 with automatic runtime

## Deployment

See `README.md` for deployment flow using Docker + nginx. Key files:
- `Dockerfile`, `nginx.conf`, `.dockerignore` — Build & serve config
- `scripts/deploy.sh` — Remote build and container replacement
- `.env.deploy` — Server credentials (not tracked in Git)

## Key Implementation Notes

1. **Save/Load system** — Roguelike state is stringified to localStorage and JSON. This includes full roster stats, inventory, round progress, and reward history.

2. **Battle simulation is async** — `LocalBattleRoom.start()` is not awaited. Battle events are emitted via callbacks to the store; the UI subscribes and re-renders.

3. **AI difficulty** — Toggled via store; 'smart' uses `local-ai.ts` logic; 'random' picks any legal move.

4. **Move legality** — Moves are validated against `@pkmn/dex`; illegal moves are stripped during prepare phase and opponent team generation.

5. **Evolution** — Calculated in `PrepareStage` based on species and round threshold. Evolutions change base stats and move pools.

6. **Opponent scaling** — Each round increases opponent BST target (base stat total). Balanced teams are generated using `@pkmn/sets`.

7. **Pokémon image sprites** — Sourced from `@pkmn/img` CDN; components cache URLs.
