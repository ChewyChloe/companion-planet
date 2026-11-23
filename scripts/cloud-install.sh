#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export npm_config_cache=/tmp/companion-npm-cache
export XDG_CACHE_HOME=/tmp/companion-cache
export electron_config_cache=/tmp/companion-electron-cache
export ELECTRON_GET_USE_PROXY=1
export GLOBAL_AGENT_HTTPS_PROXY="${HTTPS_PROXY:-}"
export GLOBAL_AGENT_HTTP_PROXY="${HTTP_PROXY:-}"
npm ci --no-audit --no-fund
npm run check
