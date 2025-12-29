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

# Start serve
echo "Starting serve on port ${PORT:-3000}..."
echo "Serving from: $(pwd)/dist"
serve -s dist -l ${PORT:-3000}

