# Pokemon Roguelike

A browser-based Pokemon roguelike built with React, TypeScript, and [`@pkmn/sim`](https://github.com/pkmn/ps). Battles run entirely in the browser. You draft a weak starting roster, survive increasingly stronger rounds, and improve your team through rewards, move unlocks, and evolutions.

## Play Now

You can play the current live build here:

```text
http://8.209.213.246
```

## Features

- Draft 3 Pokemon from 6 random low-BST candidates
- Prepare your roster between rounds
- Battle local AI with no backend game server
- Earn rewards such as items, TMs, nature changes, EV boosts, and new team members
- Save and load runs as JSON

## Requirements

- Node.js 18+
- npm

## Development

Install dependencies and start the Vite dev server:

```bash
npm install
npm run dev
```

Default dev URL:

```text
http://localhost:5173
```

## Production Build

Create a production build:

```bash
npm run build
```

This writes the frontend bundle to `dist/`.

## Deploy

This repo includes a Docker-based deployment flow for a remote server.

Tracked deployment files:

- `Dockerfile`
- `nginx.conf`
- `.dockerignore`
- `scripts/deploy.sh`
- `.env.deploy.example`

### One-time setup

Create a local deploy env file:

```bash
cp .env.deploy.example .env.deploy
```

Then fill in the real server credentials in `.env.deploy`.

` .env.deploy` is ignored by Git and should not be committed.

### Deploy to server

Run:

```bash
./scripts/deploy.sh
```

The script will:

- run `npm run build`
- copy the Docker deploy context and `dist/` to the server
- build the Docker image remotely
- replace the running container

## Game Flow

- Draft phase: pick 3 Pokemon from 6 random candidates
- Prepare phase: review your roster, held items, moves, and evolutions
- Battle phase: fight a stronger opponent team each round
- Reward phase: choose how to improve your run after each win
- Progression: opponent strength scales over 40 rounds

## Notes

- `dist/` is build output and is not tracked in Git
- local secrets such as `.env.deploy` are not tracked in Git
