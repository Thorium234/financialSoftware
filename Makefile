# ── SchoolLedger Kenya — local dev shortcuts ──────────────────────────────────
# Requires: Node.js ≥22, pnpm ≥10, PostgreSQL 16

.PHONY: install db-push dev-api dev-ui codegen typecheck build help

## Install all workspace dependencies
install:
	pnpm install

## Push Drizzle schema to the local database (requires DATABASE_URL in .env)
db-push:
	pnpm --filter @workspace/db run push

## Start the API server with live reload (tsx watch)
dev-api:
	pnpm --filter @workspace/api-server run dev:watch

## Start the Vite frontend (proxies /api → localhost:8080)
dev-ui:
	pnpm --filter @workspace/school-ledger run dev

## Regenerate API hooks and Zod schemas from openapi.yaml
codegen:
	pnpm --filter @workspace/api-spec run codegen

## Full TypeScript typecheck across all packages
typecheck:
	pnpm run typecheck

## Build all packages for production
build:
	pnpm run build

help:
	@echo ""
	@echo "  make install     Install dependencies"
	@echo "  make db-push     Push Drizzle schema to DB"
	@echo "  make dev-api     API server with live reload (port 8080)"
	@echo "  make dev-ui      Vite frontend (port 5173)"
	@echo "  make codegen     Regenerate API client from OpenAPI spec"
	@echo "  make typecheck   Full TS typecheck"
	@echo "  make build       Production build"
	@echo ""
