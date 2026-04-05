#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.deploy}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_PASSWORD="${DEPLOY_PASSWORD:-}"
REMOTE_DIR="${REMOTE_DIR:-/root/pokemon-roguelike-deploy}"
IMAGE_NAME="${IMAGE_NAME:-pokemon-roguelike:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-pokemon-roguelike}"
HOST_PORT="${HOST_PORT:-80}"
CONTAINER_PORT="${CONTAINER_PORT:-80}"

if [[ -z "$DEPLOY_HOST" ]]; then
  echo "DEPLOY_HOST is required." >&2
  exit 1
fi

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need_cmd npm
need_cmd ssh
need_cmd scp

SSH_OPTS=(-o StrictHostKeyChecking=no -p "$DEPLOY_PORT")
SCP_OPTS=(-o StrictHostKeyChecking=no -P "$DEPLOY_PORT")
SSH_CMD=(ssh "${SSH_OPTS[@]}")
SCP_CMD=(scp "${SCP_OPTS[@]}")

if [[ -n "$DEPLOY_PASSWORD" ]]; then
  need_cmd sshpass
  SSH_CMD=(sshpass -p "$DEPLOY_PASSWORD" ssh "${SSH_OPTS[@]}")
  SCP_CMD=(sshpass -p "$DEPLOY_PASSWORD" scp "${SCP_OPTS[@]}")
fi

echo "Building frontend..."
(cd "$ROOT_DIR" && npm run build)

echo "Preparing remote directory..."
"${SSH_CMD[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p '$REMOTE_DIR'"

echo "Copying deployment context..."
"${SCP_CMD[@]}" -r \
  "$ROOT_DIR/Dockerfile" \
  "$ROOT_DIR/nginx.conf" \
  "$ROOT_DIR/.dockerignore" \
  "$ROOT_DIR/dist" \
  "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_DIR/"

echo "Building image and restarting container..."
"${SSH_CMD[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "
  set -euo pipefail
  cd '$REMOTE_DIR'
  docker build -t '$IMAGE_NAME' .
  docker rm -f '$CONTAINER_NAME' >/dev/null 2>&1 || true
  docker run -d \
    --name '$CONTAINER_NAME' \
    --restart unless-stopped \
    -p '$HOST_PORT:$CONTAINER_PORT' \
    '$IMAGE_NAME' >/dev/null
  docker ps --filter name='$CONTAINER_NAME' --format '{{.Names}} {{.Image}} {{.Ports}}'
"

echo "Deployment complete: http://$DEPLOY_HOST:$HOST_PORT"
