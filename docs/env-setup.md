# Environment Setup

## Copy the template

```bash
cp .env.example .env.local
```

## Variables

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(optional in this prototype, still server-side only)*
- `SUPABASE_JWT_SECRET` *(optional depending on deployment setup)*

### App
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`

### AI
- `AI_DEFAULT_PROVIDER` = `gemini` or `grok`
- `GEMINI_API_KEY` *(optional but required to call Gemini)*
- `GROK_API_KEY` *(optional but required to call Grok)*

### Feature flags
- `NEXT_PUBLIC_ENABLE_CHATBOT`
- `NEXT_PUBLIC_ENABLE_RECOVERY_MODULE`

## Notes

- Provider keys must stay server-side only.
- The chatbot still works in grounded/fallback mode if no provider key is configured.
- Invalid env values fail fast via `lib/env.ts`.
