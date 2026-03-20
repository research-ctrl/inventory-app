# Deployment Guide

## Target shape

This prototype is designed for:
- Next.js application hosting (for example Vercel)
- Supabase-hosted PostgreSQL
- optional Gemini / Grok API access from the server only

## Prerequisites

- Supabase project with migrations applied
- environment variables configured
- Node.js 20+

## Database setup

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Optional seed:

```bash
npm run seed
```

## App deployment

```bash
npm ci
npm run build
npm run start
```

or deploy using your preferred Next.js host.

## Required checks

```bash
npm run lint
npm run type-check
npm test
npm run smoke
```

## Post-deploy validation

- confirm `/dashboard` loads without login
- confirm operator identity modal opens on a clean browser
- verify `/qc`, `/inventory`, `/issues`, `/recovery`, `/chatbot`, and `/help`
- verify `/api/health`
- verify `/api/chat` using a grounded question
