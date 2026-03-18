# Shipyard Material Lifecycle System (SMLS)

Production-grade material lifecycle management for shipyard operations.

## Tech Stack
- **Next.js 15** (App Router)
- **React 19** + **TypeScript 5**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (Auth, PostgreSQL, Storage, Edge Functions)
- **AI**: Gemini / Grok via provider router
- **Zod** for runtime validation

## Quick Start

```bash
# Clone
git clone https://github.com/research-ctrl/inventory-app.git
cd inventory-app

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Fill in .env.local with your Supabase and API keys

# Set up database
supabase link --project-ref <your-ref>
supabase db push

# Run dev server
npm run dev
```

## Folder Structure
```
app/          — Next.js App Router pages and API routes
components/   — UI and feature components
lib/          — Core utilities (Supabase, auth, AI, validations, workflow)
actions/      — Next.js Server Actions
types/        — TypeScript domain and DB types
hooks/        — React hooks
scripts/      — CLI utilities (seed, import, smoke test)
supabase/     — Migrations, seed, edge functions
docs/         — Documentation
tests/        — Unit, integration, e2e tests
```

## Modules
| Module | Path |
|--------|------|
| Requirements | `/requirements` |
| Approvals | `/approvals` |
| Vendors | `/vendors` |
| Procurement | `/procurement` |
| Receiving | `/receiving` |
| Quality Control | `/qc` |
| Inventory | `/inventory` |
| Material Issues | `/issues` |
| Recovery | `/recovery` |
| AI Chatbot | `/chatbot` |
| Reports | `/reports` |

## Documentation
- [Architecture](docs/architecture.md)
- [Workflow Map](docs/workflow-map.md)
- [Module Specs](docs/module-specs.md)
- [User Guide](docs/user-guide.md)
- [Admin Guide](docs/admin-guide.md)
- [AI Chatbot Guide](docs/ai-chatbot-guide.md)
- [Deployment](docs/deployment.md)
- [Environment Setup](docs/env-setup.md)
- [Role Permissions](docs/role-permissions.md)

## License
Private — Shipyard Internal Use Only
