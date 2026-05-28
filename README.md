# Ops Cases — Tech Lead Assessment

Case management API with a **status-transition engine + audit log**, plus a React UI integrated via REST.

## What's built

- **Backend** (`apps/api`): Express + MongoDB — JWT auth, case list/detail, `POST /cases/:id/transitions`, audit trail
- **Frontend** (`apps/web`): React + Vite — login, case list, workflow actions, audit timeline
- **Shared** (`packages/shared`): Status/action enums used by API and UI

## Prerequisites

- Node.js 20+
- MongoDB running locally **or** Atlas URI in `apps/api/.env`

## Quick start

```bash
# Install dependencies
npm install

# Configure API (copy and edit if needed)
cp .env.example apps/api/.env

# Seed demo data
npm run seed

# Run API + UI together
npm run dev:all
```

| Service | URL |
|---------|-----|
| API | http://localhost:4000 |
| Swagger UI | http://localhost:4000/api-docs |
| OpenAPI JSON | http://localhost:4000/api-docs/openapi.json |
| UI | http://localhost:5173 |

**Demo logins** (password `demo1234`):

- `agent@demo.ops` — Cases: start work, submit for review
- `manager@demo.ops` — **Overview** dashboard (KPI tiles, pipeline, workload), **Reports** (4 types + CSV export), **Cases** workflow

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API only |
| `npm run dev:web` | UI only (proxies `/api` → `:4000`) |
| `npm run dev:all` | API + UI |
| `npm test` | API tests |
| `npm run seed` | Reset and seed demo users + case |

## API examples

```bash
# Health
curl http://localhost:4000/health

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@demo.ops","password":"demo1234"}'

# Transition (replace TOKEN and CASE_ID)
curl -X POST http://localhost:4000/cases/CASE_ID/transitions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"start_work"}'
```

## Docs

See [`docs/system-design.md`](docs/system-design.md) for full system design (Parts A–C).

## Deploy

- **API**: Render + MongoDB Atlas — see `render.yaml`
- **UI**: Vercel/Netlify with `VITE_API_URL` pointing at deployed API
