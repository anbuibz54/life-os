# Deploy

Vercel + Supabase, both free. Work top to bottom; the ordering matters, because
OAuth cannot be finished until the production domain exists.

**One database.** There is no separate production project — the deployed app
and local development share `fdbgoivddjlipjofyzed`. That is fine for two users
and worth knowing before you run a destructive query at 11pm: there is no
staging to be wrong in. Migrations are already applied there.

---

## 1. Vercel project

Import `anbuibz54/life-os`. Framework detection handles the rest; there is no
`vercel.json` because nothing needs overriding.

Set these four environment variables (Production, Preview, and Development):

| Name | Value |
|---|---|
| `DATABASE_URL` | Session pooler, **port 5432** |
| `DIRECT_URL` | Same as above |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fdbgoivddjlipjofyzed.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` — server only, never `NEXT_PUBLIC_` |

Copy the values from `.env.local`.

> **Port 5432, not 6543.** The transaction pooler hangs under query depth with
> postgres.js — see `src/server/db/index.ts` for the measurements. Using 6543
> here reproduces a page that loads forever.

The build runs `next build`. Migrations do **not** run on deploy, deliberately:
a failed migration mid-deploy is worse than a deploy that does not ship. Run
`pnpm db:migrate` locally, then deploy.

---

## 2. Supabase URL configuration

Authentication → URL Configuration. Every OAuth and email link bounces without
this.

- **Site URL**: the production Vercel domain, `https://<project>.vercel.app`
- **Redirect URLs** — all of:
  - `https://<project>.vercel.app/**`
  - `https://*-<your-team>.vercel.app/**` — preview deployments get their own
    hostnames, and without this every preview's sign-in is broken
  - `http://localhost:3000/**`
  - `http://localhost:3001/**` — the dev server falls back to 3001 when 3000 is
    taken, and the callback is built from the request host

---

## 3. OAuth providers

Already enabled in Supabase with credentials. Two things remain.

**Register the callback on the provider side.** Supabase displaying the URL
does not register it. Add `https://fdbgoivddjlipjofyzed.supabase.co/auth/v1/callback`
as an authorised redirect URI in:

- Google Cloud Console → Credentials → your OAuth client
- Azure Portal → App registrations → your app → Authentication → Web

**Turn two settings off**, both currently on:

- *Allow users without an email* (Google and Azure). This app requires an
  email — `users.email` is `NOT NULL`. The code now refuses such a session
  cleanly, but refusing at the provider is better than catching it downstream.
- *Skip nonce checks* (Google). The dashboard calls it less secure; it exists
  for native ID-token flows, and the web OAuth flow does not need it.

---

## 4. Email

**Not done, and it will bite.** Supabase's built-in SMTP is rate-limited to a
few messages an hour and does not reliably reach arbitrary addresses — a real
account has already been left unconfirmable by it.

Authentication → SMTP Settings, point it at a real sender (Resend's free tier
is enough). Until then:

- new signups need confirming by hand in the dashboard
- password reset cannot be built, because it has nothing to send

Do **not** solve this by turning email confirmation off. Confirmation is what
makes identity linking safe: without it, someone can register an address they
do not control with a password, and a later Google sign-in on that address can
link into their account.

---

## 5. Deploy, then check

```
pnpm db:migrate      # only if there are new migrations
git push             # Vercel builds from main
```

Then, on the deployed URL:

- [ ] `/login` renders
- [ ] email + password sign-in works
- [ ] Google sign-in completes and lands on `/set-password`
- [ ] Microsoft sign-in completes
- [ ] capture a note — it appears immediately
- [ ] file it into a new concept from the picker
- [ ] write a card, then review it and rate it
- [ ] `/design` returns **404** (it must not ship)
- [ ] Settings → create an MCP token, and call the endpoint with it

---

## 6. Install on the phone

- **iOS**: Safari → Share → Add to Home Screen. Safari only; Chrome on iOS
  cannot install.
- **Android**: Chrome → menu → Install app.

`display: standalone` means it opens without browser chrome, and `start_url`
is the capture surface — the app opens where a thought goes.

---

## Still open

- **Sentry.** `CLAUDE.md` asks for it from day one and it is not wired up.
  Structured logging is in (`src/server/logger.ts`, JSON lines with credential
  redaction, and a `timed()` helper that flags slow operations). Sentry needs
  an account and a DSN, so it is yours to start.
- **Password reset.** Blocked on SMTP above. Until both exist, a forgotten
  password means editing the database.
- **Nothing has been visually reviewed** on a phone-sized screen. The capture
  box, the review card, and the concept picker are the three worth looking at
  first.
