---
name: deploy-check
description: Check the live Railway deployment of the bookstore — deploy status, crash logs, which variables are set, service build/start settings, and whether the live API returns data. Use when the user says the app is down, crashing, empty, or asks if a deploy worked. Read-only; it never changes Railway.
---

# Check the Railway deployment

Everything here only reads. If something needs changing (variables, settings, networking, redeploys, seeding), tell the user the exact command and let them run it. See "Deployment" in CLAUDE.md for how the project is set up.

Run from the repo root. Railway CLI output ends with a deprecation warning about config-as-code; ignore it.

## 1. Logged in and linked?

```bash
railway whoami && railway status
```

Expect project `tewshi`, environment `production`. If not logged in, ask the user to run `! railway login`.

## 2. Latest deploy

```bash
railway service status --service bookstore-assessment
railway logs --service bookstore-assessment --deployment | tail -30
```

For a crash loop, count the distinct errors:

```bash
railway logs --service bookstore-assessment --deployment | grep -E "Error|is not set" | sort | uniq -c
```

## 3. Variables (names only, never print values)

```bash
railway variable list --service bookstore-assessment --kv | sed 's/=.*/=…/'
```

The app needs `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.

## 4. Build / pre-deploy / start settings

These live on Railway, not in the repo.

```bash
railway api 'query($s:String!,$e:String!){ serviceInstance(serviceId:$s, environmentId:$e){ buildCommand preDeployCommand startCommand railwayConfigFile } }' \
  --variables '{"s":"e86538bd-e17f-4fc1-8fc8-441eb4f14c43","e":"df1a94dd-3f14-4c0d-ba98-c3feb91c87e3"}'
```

Expected: build `npm run build`, pre-deploy `["npm run migrate -w server"]`, start `npm start`, config file `null`.

## 5. Live endpoints

```bash
B=https://mayerfeld-bookstore-assessment.up.railway.app
curl -s -o /dev/null -w "page %{http_code}\n" $B/
curl -s $B/api/books | head -c 120; echo
curl -s $B/api/events | head -c 120; echo
curl -s $B/api/auth/get-session; echo     # null when signed out
```

`[]` from books or events means the tables exist but were never seeded. The user seeds from the Railway service shell with `npm run seed -w server`.

## Report

Give a short summary: deploy status, the cause if it's broken (quote the log line), and the command the user should run to fix it.
