#!/usr/bin/env bash
set -euo pipefail
echo "Installing pnpm@10.26.1 to match project lockfile..."
npm install -g pnpm@10.26.1
echo "pnpm version: $(pnpm --version)"
