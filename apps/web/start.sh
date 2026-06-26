#!/bin/bash
# Start script for Railway frontend service
# This ensures we're in the right directory and dist folder exists

cd apps/web || exit 1

# Check if dist folder exists
if [ ! -d "dist" ]; then
  echo "ERROR: dist folder not found!"
  echo "Current directory: $(pwd)"
  echo "Contents: $(ls -la)"
  exit 1
fi

# Check if index.html exists
if [ ! -f "dist/index.html" ]; then
  echo "ERROR: dist/index.html not found!"
  echo "Dist folder contents:"
  ls -la dist/
  exit 1
fi

# Check dist folder contents
echo "Dist folder contents:"
ls -la dist/ | head -10

# Start serve through pnpm so the workspace package binary is available on PATH.
echo "Starting serve on port ${PORT:-3000}..."
echo "Serving from: $(pwd)/dist"
pnpm exec serve -s dist -l tcp://0.0.0.0:${PORT:-3000}

