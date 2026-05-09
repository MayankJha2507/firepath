# Deployment checklist

## Before deploying
- [ ] `BYPASS_PRO_GATE=false` in production env
- [ ] `BYPASS_AUTH=false` (or unset) in production env
- [ ] All `console.log` statements removed
- [ ] Error boundaries added to dashboard, portfolio, analysis pages
- [ ] 404 and error pages exist
- [ ] SEBI disclaimer visible on all financial output pages
- [ ] Delete account flow tested end to end
- [ ] RLS policies verified — test with two different user accounts
- [ ] Run `supabase/migrations/0002_phase35.sql` in Supabase SQL editor
- [ ] Run cascade FK SQL from `supabase/migrations/0003_cascade_fk.sql`

## Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
AI_PROVIDER=gemini
NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
BYPASS_PRO_GATE=false
```

## Vercel setup
1. Push repo to GitHub
2. Go to vercel.com → New project → Import from GitHub
3. Framework: Next.js (auto-detected)
4. Add all env vars above in Vercel dashboard → Settings → Environment Variables
5. Deploy
6. Go to Supabase → Authentication → URL Configuration  
   Add `https://yourapp.vercel.app` to allowed redirect URLs
7. Add `https://yourapp.vercel.app/auth/callback` to allowed redirect URLs

## Post-deploy smoke test
- [ ] Sign up new account → Quick Start → dashboard loads
- [ ] FIRE status banner displays correct state
- [ ] Portfolio page → add holdings via paste → snapshot saves
- [ ] Analysis page → Gemini call returns → renders correctly
- [ ] History page → shows snapshot
- [ ] Delete account → all data wiped → redirected to home
- [ ] Light mode → dark mode toggle works
- [ ] Avatar menu → theme toggle applies immediately
- [ ] Mobile responsive check on real phone
