#!/usr/bin/env bash
# Minimal CI install+build for EdgeOne Pages (/dev/shm is tiny — never install the whole monorepo).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

FILTERS=(
  --filter=with-property-work-order
  --filter=@assistant-ui/react
  --filter=@assistant-ui/react-markdown
  --filter=@assistant-ui/next
  --filter=@assistant-ui/core
  --filter=@assistant-ui/store
  --filter=@assistant-ui/tap
  --filter=@assistant-ui/x-buildutils
  --filter=@assistant-ui/x-generative-compiler
  --filter=@assistant-ui/vite
  --filter=assistant-stream
  --filter=assistant-cloud
  --filter=safe-content-frame
)

echo "[edgeone-ci] installing filtered packages only…"
pnpm install --ignore-scripts "${FILTERS[@]}"

echo "[edgeone-ci] building workspace packages…"
pnpm dlx turbo@2.10.13 build --concurrency=1 \
  --filter=@assistant-ui/react \
  --filter=@assistant-ui/react-markdown \
  --filter=@assistant-ui/next

echo "[edgeone-ci] building Next app…"
pnpm --filter with-property-work-order run build

echo "[edgeone-ci] done"
