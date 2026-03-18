# Environment Setup

## Local Development

1. Copy example env:
```bash
cp .env.example .env.local
```

2. Fill in values:

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: From Supabase project → Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (keep secret!)
- `SUPABASE_JWT_SECRET`: JWT secret from Supabase settings

### AI Providers
- `GEMINI_API_KEY`: Google AI Studio API key
- `GROK_API_KEY`: xAI Grok API key

### Webhook
- `WEBHOOK_SECRET`: Generate with `openssl rand -hex 32`

## Validation
The app validates all required environment variables at startup via `lib/env.ts` (Zod schema).
Missing or invalid vars will throw an error with clear messages.
