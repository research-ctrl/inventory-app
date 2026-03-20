# Architecture

## Overview

SMLS is a Next.js App Router application structured as a **server-first operational prototype**.

### Architectural intent
- Keep operational workflows faithful to the shipyard material lifecycle.
- Keep database CRUD on the server only.
- Keep AI provider keys on the server only.
- Make the prototype usable without authentication while still preserving attribution.

## Runtime model

### Web layer
- **Server Components** for most data-heavy routes.
- **Client Components** only for local interaction such as the operator identity modal and chatbot message composer.
- **Route Handlers** for API endpoints such as `/api/chat`.
- **Server Actions** for workflow mutations.

### Data layer
- Supabase PostgreSQL stores transactional workflow data.
- Lifecycle queries compose views and tables for dashboard, traceability, and AI tool access.
- Inventory quantities are derived from the transaction ledger.

### AI layer
- Provider router selects Gemini or Grok using env configuration with optional runtime override.
- Tool calls execute on the server against live prototype data and docs.
- Responses are grounded by tool output first; provider calls are optional rewrite/summarisation steps.
- Chat history is logged to `chat_sessions` and `chat_messages`, with audit entries in `audit_log`.

## Main modules

```text
Requirements
  -> Approvals
  -> Purchase Orders
  -> Deliveries / Receiving
  -> QC
  -> Vendor Return / Replacement Loop
  -> Inventory Intake / PIN Generation
  -> Issue / Distribution
  -> Usage Outcome Capture
  -> Recovery Assessment
  -> Derived PINs / Scrap / Hold
```

## Prototype operator identity

The prototype deliberately avoids auth gates for normal usage.

Instead:
- operator name / team / badge are stored in browser `localStorage`
- the identity is submitted with workflow actions for attribution
- fallback profile IDs are resolved server-side for database rows that require a user FK
- this identity is **not** a security boundary

## Key server modules

- `actions/lifecycle.ts`: server-side workflow orchestration
- `lib/db/queries/lifecycle.ts`: operational read models
- `lib/ai/provider-router.ts`: grounded AI tool routing and provider delegation
- `lib/ai/tools/*`: operational AI tools
- `lib/docs/index.ts`: doc loading and placeholder SOP search

## Traceability model

Traceability combines:
- business references (`REQ-*`, `PO-*`, `DLV-*`, `ISS-*`, `REC-*`, `PIN-*`)
- workflow history rows
- inventory transaction ledger rows
- recovery + genealogy links
- prototype audit entries for vendor replacement loops and chat activity

## Deployment view

- Frontend/app runtime: Next.js
- Data platform: Supabase
- Optional AI providers: Gemini and Grok
- CI/CD: GitHub Actions
