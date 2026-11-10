# madingo Gemini proxy

Tiny server that holds the Gemini API key as a **server-side secret only** and
exposes one endpoint the public madingo app calls — so **every app user gets
AI extraction with no key of their own**, and the key never appears in the app
code, the repo, the GitHub Pages bundle, or any log.

## What it does

- `GET /health` → `{ ok, service, models, dailyUsed, dailyCap }`
- `POST /extract` with `{ pageText?, pageImageBase64?, topic?, teacherInstructions?, questionCount? }`
  → `{ ok: true, text, model }` (raw JSON array text from Gemini, which the
  app parses with its existing `parseExerciseFromAIText`) or
  `{ ok: false, error: { code, message } }` with `code` in
  `invalid_key | quota | no_questions | network | unknown`.

Models tried in order: `gemini-3.8-flash` (Google's current free-tier model),
then `gemini-3-flash-preview` as fallback. Each attempt has a 45 s timeout and
one retry on 503/timeout — verified 2026-11-09: `gemini-3.8-flash` hangs /
503s at peak times while `gemini-3-flash-preview` answers the same extraction
prompt in ~11 s with 4/4 questions parsed.

## Abuse protection

- Per-IP: **20 extractions/hour**
- Global: **500 extractions/day** (resets at UTC midnight)
- Body limit 10 MB; page text truncated to 20 000 chars
- CORS allowlist: `https://bskkek.github.io` + localhost (extend via
  `ALLOWED_ORIGINS`, comma-separated)
- Logs contain only method/path/status/ms — never bodies, never the key.

Change the limits with env vars `DAILY_CAP` / `HOURLY_PER_IP`.

## Deploy — option A: Replit (first choice)

The user's Replit account (`billelaniss1@gmail.com`) already hosts his
Instagram bot. Replit free tier sleeps after inactivity, so the **first**
extraction after idle can take ~30–60 s to wake the Repl (the app retries
once and then falls back to the user's own key if one is saved).

1. In Replit: **Create Repl → Import from GitHub** (or upload this folder).
2. Set the secret: **Tools → Secrets → `GEMINI_API_KEY`** = the Gemini key
   (get a fresh one at https://aistudio.google.com/apikey — never paste it
   into code, chat logs, or the repo).
3. Press **Run**. Note the public URL, e.g.
   `https://madingo-gemini-proxy.<username>.repl.co`.
4. Check `https://<that-url>/health` returns `ok: true`.
5. Point the app at it (see "Point the app at the proxy").

## Deploy — option B: Cloudflare Workers (always-on, free)

Best fit for this proxy: no sleeping, 100 000 requests/day free. Needs a
free Cloudflare account (no card).

1. `npm install -g wrangler` (or `npx wrangler`).
2. `wrangler login` (authorise in the browser once).
3. In this folder: `wrangler secret put GEMINI_API_KEY` → paste the key.
4. `wrangler deploy` → note the URL, e.g.
   `https://madingo-gemini-proxy.<subdomain>.workers.dev`.
5. Check `https://<that-url>/health`.

Caveat: Workers isolates keep rate-limit counters per-isolate, so the
per-IP hourly limit and daily cap are approximate on Workers. For a hard
cap, add one free Cloudflare Rate Limiting rule on `/extract`.

## Point the app at the proxy

The app reads the proxy URL at **build time** from `VITE_GEMINI_PROXY_URL`:

```bash
cd ~/workspace/madingo/source
VITE_GEMINI_PROXY_URL=https://<proxy-host>/extract PAGES=1 bun run build
# then copy dist/ into the gh-pages worktree and push (see DEPLOY-v2.md)
```

Until the proxy is live, the app builds without that variable and keeps the
old behaviour: extraction works only after the user pastes their own free
key in Create Room (stored only on their device).

## Rotating the key if it ever leaks

1. In Google AI Studio, delete/revoke the old key and create a new one.
2. Update the server secret **only**:
   - Replit: Tools → Secrets → edit `GEMINI_API_KEY`.
   - Workers: `wrangler secret put GEMINI_API_KEY`.
3. Restart the Repl (Replit) — nothing else. **No app redeploy needed**,
   no code change, and the app's users notice nothing.

## Local test

```bash
GEMINI_API_KEY=<key> node server.mjs   # :8787
curl -s localhost:8787/health
curl -s -X POST localhost:8787/extract -H 'Content-Type: application/json' \
  -d '{"pageText":"Упражнение 1. Студенты едут в (университет / университете).","topic":"Падежи","questionCount":2}'
```
