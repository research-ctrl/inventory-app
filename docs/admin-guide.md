# Admin Guide

## User Management
- Admin and Super Admin can manage users via Settings → Users
- Assign roles: viewer, engineer, store_keeper, qc_inspector, approver, etc.

## Vendor Setup
- Add vendors in the Vendors module before creating POs
- Mark vendors as approved before they can receive orders

## System Configuration
- Environment variables: see `.env.example` and `docs/env-setup.md`
- Feature flags: `NEXT_PUBLIC_ENABLE_CHATBOT`, `NEXT_PUBLIC_ENABLE_RECOVERY_MODULE`

## Database Migrations
```bash
supabase db push
```

## Backups
- Supabase handles automated daily backups
- On-demand: Supabase Dashboard → Database → Backups
