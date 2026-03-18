# Deployment Guide

## Prerequisites
- Vercel account
- Supabase project (Cloud)
- Environment variables configured

## Supabase Setup
```bash
# Install CLI
brew install supabase/tap/supabase

# Login
supabase login

# Link project
supabase link --project-ref <your-project-ref>

# Push migrations
supabase db push

# Deploy edge functions
supabase functions deploy inventory-recalc
supabase functions deploy delivery-status-sync
supabase functions deploy embeddings-sync
```

## Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Environment Variables
Set all variables from `.env.example` in Vercel project settings.

## Post-Deploy Checklist
- [ ] Run smoke test: `npm run smoke`
- [ ] Verify auth flow (sign up / sign in)
- [ ] Test API health: `GET /api/health`
- [ ] Seed initial admin user
