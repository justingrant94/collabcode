# Deploy Guide

This project is deployed as:
- Frontend on Vercel
- Backend on Render
- Postgres on Neon
- Redis on Upstash

The backend is a long-running Node + Socket.io process, so it should not be deployed as a Vercel serverless function.

## 1. Preflight

1. Push latest code to GitHub.
2. Confirm local frontend production build:

```bash
npm --prefix frontend run build
```

## 2. Create Data Services

1. Create a Neon Postgres database and copy its connection string as `DATABASE_URL`.
2. Create an Upstash Redis database and copy its connection string as `REDIS_URL`.

## 3. Deploy Backend on Render

This repository stores the app inside the `task/` subdirectory, so Render and Vercel must be pointed at that path explicitly.

Preferred: use Blueprint and set the Blueprint path to `task/render.yaml`.

1. In Render, create a new Blueprint from this repo.
2. Confirm the service settings:
   - `Blueprint path`: `task/render.yaml`
   - `rootDir`: `task/backend`
   - `buildCommand`: `npm install && npm run db:generate && npm run db:migrate:deploy`
   - `startCommand`: `npm start`
   - `healthCheckPath`: `/health`
3. Set environment variables in Render:
   - `NODE_ENV=production`
   - `DATABASE_URL=<your Neon URL>`
   - `REDIS_URL=<your Upstash URL>`
   - `CLERK_SECRET_KEY=<your Clerk secret key>`
   - `CLERK_WEBHOOK_SECRET=<your Clerk webhook secret>`
   - `FRONTEND_ORIGIN=<temporary value; replace with Vercel URL in step 5>`
   - `ENABLE_EXECUTE=false`
   - `LOG_LEVEL=info`
4. Do not set `DEV_BYPASS_AUTH` in production.
5. Deploy and confirm backend health:

```bash
curl https://<your-backend-url>/health
```

## 4. Deploy Frontend on Vercel

1. Import the same repository in Vercel.
2. Set the Vercel project Root Directory to `task`.
3. Confirm the `task/vercel.json` file is being used for install/build/output.
4. Set Vercel environment variables:
   - `VITE_API_URL=https://<your-backend-url>`
   - `VITE_CLERK_PUBLISHABLE_KEY=<your Clerk publishable key>`
   - Optional: `VITE_ENABLE_EXECUTE=true` only when your backend host supports the Docker-based runner
5. Deploy and copy the final Vercel URL.

## 5. Final Wiring

1. Update Render `FRONTEND_ORIGIN` to the exact Vercel URL and redeploy backend.
2. In Clerk, add your Vercel URL to allowed origins/redirects.
3. In Clerk Webhooks, set endpoint:

```text
https://<your-backend-url>/webhooks/clerk
```

4. Enable events: `user.created`, `user.updated`, `user.deleted`.
5. Save webhook signing secret into Render as `CLERK_WEBHOOK_SECRET` and redeploy backend.

## 6. Verification Checklist

1. Open the Vercel app root URL.
2. Refresh a deep link like `/r/test-room` (should not show Vercel 404).
3. Sign in and confirm authenticated data loads (`/api/me` path succeeds).
4. Open the same room in two tabs and verify realtime updates.
5. Confirm execute behavior:
   - With `ENABLE_EXECUTE=false`, the hosted frontend disables Run by default and explains that sandbox execution is local-demo only.

## 7. Common Issues

1. Vercel 404 on deep links:
   - Verify the Vercel project Root Directory is `task` so `task/vercel.json` is used.
2. API requests 404 on Vercel domain:
   - `VITE_API_URL` is missing or incorrect.
3. CORS or socket handshake errors:
   - `FRONTEND_ORIGIN` is missing or does not match the exact Vercel origin.