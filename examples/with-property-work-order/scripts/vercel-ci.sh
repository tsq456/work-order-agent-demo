#!/usr/bin/env bash
# Short entrypoints for Vercel (Install Command max 256 chars).
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

case "${1:-}" in
  install)
    pnpm install --ignore-scripts "${FILTERS[@]}"
    ;;
  build)
    pnpm dlx turbo@2.10.13 build --concurrency=1 \
      --filter=@assistant-ui/react \
      --filter=@assistant-ui/react-markdown \
      --filter=@assistant-ui/next
    pnpm --filter with-property-work-order run build
    ;;
  *)
    echo "usage: $0 install|build" >&2
    exit 1
    ;;
esac
