#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Do not run drizzle-kit push here: the Drizzle schema does not represent all
# existing API-owned tables/columns, so push proposes destructive drops.
# Schema changes must be reviewed and applied without dropping live data.
