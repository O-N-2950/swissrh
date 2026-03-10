#!/bin/bash
set -e

echo "=== SwissRH Start ==="
echo "Node: $(node --version)"
echo "Working dir: $(pwd)"
ls -la dist/ 2>/dev/null || echo "No dist/ found"

if [ ! -f "dist/index.js" ]; then
  echo "dist/index.js not found — building..."
  cd client && npm ci && npx vite build && cd ..
  npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
  echo "Build complete."
fi

echo "Starting server..."
exec node dist/index.js
