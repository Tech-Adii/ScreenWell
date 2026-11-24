#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This build script requires macOS."
  exit 1
fi
if ! command -v node >/dev/null 2>&1 || ! node -e 'if (Number(process.versions.node.split(".")[0]) < 24) process.exit(1)'; then
  echo "Install Node.js 24 LTS or newer from https://nodejs.org, then reopen this file."
  read -r -p "Press Return to close. "
  exit 1
fi
npm ci
npm run assets
npm test
npm run dist:mac:preview
node scripts/verify-mac.mjs
node scripts/mac-smoke.mjs
open release
echo "Built local preview DMG/ZIP files for Apple Silicon (arm64) and Intel (x64)."
echo "These are ad-hoc signed previews, not Apple-notarized releases."
read -r -p "Press Return to close. "
