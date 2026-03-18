# Architecture

## Overview
The Shipyard Material Lifecycle System (SMLS) is a Next.js 15 application using the App Router, backed by Supabase (PostgreSQL + Auth + Storage + Edge Functions).

## Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS, shadcn/ui
- **Backend**: Next.js Server Actions + API Routes
- **Database**: Supabase / PostgreSQL with RLS
- **Auth**: Supabase Auth (JWT)
- **AI**: Gemini / Grok via provider router
- **Deployment**: Vercel (frontend), Supabase Cloud (backend)

## Key Design Decisions
- Server Components by default, Client Components only where interactivity is needed
- Role-based access control enforced at server action and middleware layers
- Workflow state machine for lifecycle management
- AI provider router allows swapping AI backends without UI changes

## Module Boundaries
```
Requirements → Approvals → Vendors → Purchase Orders
  → Deliveries → Receiving → QC → Inventory
  → Issues → Recovery
```

## TODO
- [ ] Add sequence diagrams per module
- [ ] Document Supabase schema ERD
