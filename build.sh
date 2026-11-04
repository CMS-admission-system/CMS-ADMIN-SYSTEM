#!/usr/bin/env bash
set -o errexit

echo "=========================================="
echo "Step 1: Building Frontend (React + Vite)"
echo "=========================================="
if command -v npm &> /dev/null; then
  cd cms-admission-Frontend
  npm install
  npm run build
  cd ..
else
  echo "npm not found in build environment; proceeding with committed production dist."
fi

# Ensure pre-built dist is synchronized into backend app/dist
mkdir -p cms-admission-backend/cms-admission-backend/app/dist
if [ -d "cms-admission-Frontend/dist" ]; then
  cp -r cms-admission-Frontend/dist/* cms-admission-backend/cms-admission-backend/app/dist/ 2>/dev/null || true
fi

echo "=========================================="
echo "Step 2: Installing Backend Dependencies"
echo "=========================================="
cd cms-admission-backend/cms-admission-backend
python -m pip install --upgrade pip
pip install -r requirements.txt
cd ../..

echo "=========================================="
echo "Build Completed Successfully!"
echo "=========================================="
