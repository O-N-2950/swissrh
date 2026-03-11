#!/bin/bash
set -e

echo "=== SwissRH Start ==="
echo "Node: $(node --version)"
echo "Working dir: $(pwd)"

echo "Building always (no cache)..."
rm -rf dist/
cd client && npm ci && npx vite build && cd ..
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
echo "Build complete."

echo "Starting server..."
exec node dist/index.js
