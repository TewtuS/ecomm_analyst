# Deploying MarketLens on Vercel

This project deploys as a **Vercel Services** monorepo: Next.js frontend at `/` and FastAPI backend at `/_/backend`, defined in `vercel.json`.

---

## Quick deploy

### 1. Import the repo

1. Go to [vercel.com/new](https://vercel.com/new) and import your Git repository.
2. Set **Root Directory** to `ecomm_analyst`.
3. Set **Framework Preset** to **Services** (required when `experimentalServices` is in `vercel.json`).

### 2. Environment variables

Vercel auto-injects service URLs (`NEXT_PUBLIC_BACKEND_URL`, `FRONTEND_URL`, etc.). You only need to add:

| Variable | Value | Required |
|----------|-------|----------|
| `SECRET_KEY` | Long random string (`openssl rand -hex 32`) | Yes |
| `LLM_API_KEY` | [Deepseek](https://platform.deepseek.com) key for live AI insights | No |

Do **not** override `FRONTEND_URL` or `NEXT_PUBLIC_BACKEND_URL` unless you know what you're doing — Vercel sets these from your deployment URL and route prefixes.

### 3. Deploy

Click **Deploy**. Vercel builds each service separately:

| Service | Path | Stack |
|---------|------|-------|
| `frontend` | `/` | Next.js |
| `backend` | `/_/backend` | FastAPI |

The browser calls `/_/backend/api/...` for JSON and `/_/backend/images/...` for product images.

### 4. Login

```
Email:    demo@example.com
Password: demo1234
```

---

## vercel.json

```json
{
  "experimentalServices": {
    "frontend": {
      "entrypoint": "frontend",
      "routePrefix": "/",
      "framework": "nextjs"
    },
    "backend": {
      "entrypoint": "backend/main.py",
      "routePrefix": "/_/backend",
      "framework": "fastapi"
    }
  }
}
```

`vercel.json` with `experimentalServices` is **required** to deploy projects with multiple services.

---

## How it works

```
Browser  →  /_/backend/api/auth/login
                ↓ (Vercel Services routing)
           backend/main.py  →  FastAPI (app.main)
                ↓
           SQLite copy in /tmp/ecommerce.db
```

`backend/main.py` strips the `/_/backend` prefix before requests reach FastAPI routes (`/api/*`, `/images/*`, etc.).

---

## Local development

Run all services together (requires Vercel CLI):

```bash
cd ecomm_analyst
npx vercel dev -L
```

For the traditional split setup, see [RUNNING.md](./RUNNING.md) (backend on :8000, frontend on :3000).

---

## Alternative: frontend on Vercel, API elsewhere

1. Deploy the backend separately (`uvicorn app.main:app --port 8000`).
2. Set `NEXT_PUBLIC_API_URL=https://your-api.example.com` on the frontend build.
3. Set `FRONTEND_URL` and `ALLOWED_CORS_ORIGINS` on the API host.

The frontend build generates `_redirects` / proxy rules for static export hosts.

---

## Production hardening

- **PostgreSQL**: Uncomment `psycopg2-binary` in `backend/requirements.txt`, set `DATABASE_URL`, run `python seed.py`.
- **SECRET_KEY**: Never use the dev default in production.
- **Cold starts**: Backend may take a few seconds on first request after idle.

---

## GitHub source

Vercel should deploy from **`main`** on [github.com/TewtuS/ecomm_analyst](https://github.com/TewtuS/ecomm_analyst). Confirm the deployment commit matches the latest on that branch (not an older SHA like `892ba5e`).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails / services not detected | Framework Preset must be **Services**; `experimentalServices` must be in `vercel.json`. |
| `backend must specify framework, entrypoint...` | Use `entrypoint` + `framework` in `vercel.json` (not `root`). Redeploy latest `main`. |
| 404 on `/_/backend/api/...` | Confirm Root Directory is `ecomm_analyst` and `backend/main.py` exists. |
| CORS errors | Let Vercel manage `FRONTEND_URL`; don't override unless using a custom domain. |
| Images missing | Ensure `backend/data200/image/` is committed to git. |
| AI insights always mock | Add `LLM_API_KEY` and redeploy. |
