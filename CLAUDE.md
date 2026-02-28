# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ezBookkeeping is a lightweight, self-hosted personal finance application. Full-stack with a Go backend (Gin framework) and Vue 3 + TypeScript frontend that serves dual UIs (desktop via Vuetify, mobile via Framework7).

## Build & Development Commands

### Frontend
```bash
npm install                    # Install dependencies
npm run serve                  # Dev server on :8081 (proxies /api to :8080)
npm run build                  # Production build to dist/
npm run lint                   # vue-tsc --noEmit && eslint . --fix
npm run test                   # Jest tests (ts-jest)
```

### Backend
```bash
go vet -v ./...                # Lint
go test ./... -v               # All tests
go test ./pkg/utils/... -v     # Single package test
go test ./... -v -skip "TestPattern"  # Skip specific tests
CGO_ENABLED=1 go build -o ezbookkeeping ezbookkeeping.go  # Build binary
```

### Full Build (build.sh)
```bash
./build.sh backend             # Build Go binary (vet + test + build)
./build.sh frontend            # Build Vue frontend (install + lint + test + build)
./build.sh package             # Build both + tar.gz archive
./build.sh backend --no-lint --no-test  # Skip checks for faster iteration
```

### Running the App
```bash
./ezbookkeeping server run     # Start web server (default :8080)
./ezbookkeeping database update  # Manual DB migration
```

## Architecture

### Backend (Go) — 3-Layer Pattern

```
cmd/                    CLI commands (webserver, database, user_data, cron_jobs)
pkg/
  api/                  HTTP handlers — receive requests, validate, call services, return JSON
  services/             Business logic — compose database operations with domain rules
  datastore/            Database abstraction via XORM (SQLite3/MySQL/PostgreSQL)
  models/               DB models (XORM tags) + request/response DTOs in same package
  middlewares/           Gin middlewares (JWT auth, rate limiting, CORS, request ID)
  settings/             Config loading from INI file + env vars (EBK_ prefix)
  converters/           Import/export format handlers (CSV, OFX, QIF, Beancount, GnuCash, etc.)
  exchangerates/        15+ central bank data sources
  llm/                  LLM providers (OpenAI, Anthropic, Google AI, Ollama, etc.)
  mcp/                  Model Context Protocol server implementation
  errs/                 Centralized error definitions with error codes
```

Key patterns:
- Composition via struct embedding: `ServiceUsingDB`, `ServiceUsingConfig`, `ApiUsingDuplicateChecker`
- Singleton containers: `DataStoreContainer`, `StorageContainer`, `DuplicateCheckerContainer`
- All API routes registered in `cmd/webserver.go`
- API base path: `/api`, versioned endpoints under `/api/v1/`
- Database auto-migration via XORM `SyncStructs()` on startup

### Frontend (Vue 3 + TypeScript) — Dual-Platform SPA

```
src/
  index-main.ts         Entry: detects mobile/desktop via user agent, redirects
  desktop-main.ts       Desktop entry (Vuetify + ECharts + vue-router hash history)
  mobile-main.ts        Mobile entry (Framework7-Vue)
  stores/               18 Pinia stores (one per domain: account, transaction, etc.)
  models/               TypeScript model/DTO types
  core/                 Core logic and constants
  lib/
    services.ts         Axios-based API client — all backend communication goes through here
  views/
    base/               Shared page logic as TypeScript classes (both platforms extend these)
    desktop/            Desktop-specific page components
    mobile/             Mobile-specific page components
  components/
    common/             Shared components (both platforms)
    desktop/            Desktop-only components
    mobile/             Mobile-only components
  locales/              i18n JSON files (19 languages, LTR + RTL support)
```

Key patterns:
- Desktop and mobile share: stores, models, core logic, lib utilities, locales, base views
- Path alias: `@/` maps to `src/`
- Vite dev server proxies `/api`, `/oauth2`, `/avatar`, `/pictures`, `/proxy`, `/mcp` to `:8080`
- PWA support via vite-plugin-pwa with Workbox

## Configuration

- INI config file: `conf/ezbookkeeping.ini` (sections: database, server, security, auth, mail, storage, llm, etc.)
- Environment variables: `EBK_` prefix for config values, `EBKCFP_` for file paths
- `.env` file loading supported

## Code Style

- **Go**: Tabs for indentation, standard Go conventions
- **TypeScript/Vue**: 4 spaces indentation, ESLint with vue-essential + TypeScript strict
- **package.json**: 2 spaces indentation
- Frontend tests: `src/lib/__tests__/`, Jest with ts-jest
- Backend tests: `*_test.go` alongside source files in each package
