# Shipyard Material Lifecycle System (SMLS)

A GitHub-ready prototype for end-to-end shipyard material lifecycle management:

- requirements → approvals → purchase orders → deliveries
- receiving → QC → vendor returns / replacement loop
- inventory intake → PIN generation → stock ledger
- issue / distribution → usage outcome capture
- recovery assessment → derived PIN genealogy → scrap / hold
- grounded AI operations assistant for operational questions

## Prototype principles

This prototype is intentionally **directly usable without login**.

- No sign-in / sign-up / sign-out flows are required for day-to-day use.
- Operator identity is stored in `localStorage` and used only for attribution.
- Database access happens only on the server through Next.js server actions, route handlers, and server-side service modules.
- AI provider keys remain server-side only.
- The inventory ledger is append-only in practice and remains the source of truth for stock movement visibility.

Full constraints: [`docs/prototype-constraints.md`](docs/prototype-constraints.md).

## Features

### Core operational modules
- Receiving and QC with exact **pass / partial pass / fail** handling.
- Vendor return / replacement loop that feeds back into delivery tracking.
- Inventory intake with generated sequence-based PINs such as `PIN-000001`.
- Issue / distribution into shipbuilder operations.
- Usage outcome capture for **not used**, **leftover**, and **scrap** quantities.
- Recovery assessment with reusable vs non-reusable routing.
- Derived PIN creation with genealogy links for reusable / repaired materials.
- Traceability screens from requirement/PO/delivery context through issue and recovery.

### AI operations assistant
- Chat UI at `/chatbot`.
- API route at `/api/chat`.
- Provider router with Gemini / Grok adapters and env-driven default selection.
- Grounded server-side tools for stock, status, location, genealogy, and recovery queries.
- Guardrails to avoid invented operational facts.
- Chat history and audit logging.

## Repository layout

```text
app/            Next.js routes and API handlers
components/     UI and feature-specific client/server components
actions/        Next.js server actions
lib/            server modules, AI, workflow helpers, docs helpers
supabase/       migrations, seed data, functions
scripts/        seed, smoke, and developer utilities
docs/           operator, architecture, workflow, deployment, and prototype docs
tests/          test scaffolding and unit tests
```

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

If package installation is blocked in your environment, see [`docs/env-setup.md`](docs/env-setup.md) and [`docs/deployment.md`](docs/deployment.md).

## Useful routes

- `/dashboard`
- `/receiving`
- `/qc`
- `/qc/returns`
- `/inventory`
- `/inventory/pins`
- `/issues`
- `/recovery`
- `/chatbot`
- `/help`

## Documentation index

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/workflow-map.md`](docs/workflow-map.md)
- [`docs/module-specs.md`](docs/module-specs.md)
- [`docs/user-guide.md`](docs/user-guide.md)
- [`docs/operator-guide.md`](docs/operator-guide.md)
- [`docs/ai-chatbot-guide.md`](docs/ai-chatbot-guide.md)
- [`docs/deployment.md`](docs/deployment.md)
- [`docs/env-setup.md`](docs/env-setup.md)
- [`docs/prototype-constraints.md`](docs/prototype-constraints.md)
- [`docs/implementation-notes.md`](docs/implementation-notes.md)

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run type-check
npm run test
npm run smoke
npm run seed
```

## CI

GitHub Actions runs lint, type-check, unit tests, smoke tests, and build validation with placeholder env values.
