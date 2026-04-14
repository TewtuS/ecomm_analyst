# MarketLens – E-Commerce Analytics Platform

A full-stack analytics dashboard for marketplace sellers (Shopee, Taobao, Temu, Facebook Marketplace, JD, etc.).

---

## How to Run This Project (No Technical Experience Needed)

You only need one program installed on your computer: **Docker Desktop**. It takes care of everything else for you — you do not need to install Python, Node.js, or anything else.

### Step 1 — Install Docker Desktop

Go to https://www.docker.com/products/docker-desktop and download the version for your operating system (Windows or Mac). Install it like any normal program, then open it.

### Step 2 — Download this project

If you received this as a ZIP file, unzip it somewhere on your computer (e.g. your Desktop).

If you're using Git:
```bash
git clone <repo-url>
```

### Step 3 — Open a terminal in the project folder

**Windows:** Open the project folder, click the address bar at the top, type `cmd` and press Enter.

**Mac:** Right-click the project folder and select "Open in Terminal" (or search for Terminal in Spotlight).

### Step 4 — Create the configuration file

In the terminal, copy and paste this exactly and press Enter:

**Windows:**
```
copy backend\.env.example backend\.env
```

**Mac/Linux:**
```
cp backend/.env.example backend/.env
```

### Step 5 — Start the app

Copy and paste this into the terminal and press Enter:

```
docker-compose up --build
```

This will take a few minutes the first time — Docker is downloading and setting everything up. You will see a lot of text scrolling — that is normal. Wait until it stops and you see something like `Application startup complete`.

### Step 6 — Open the app

Open your web browser and go to:

**http://localhost:3000**

Log in with:
```
Email:    demo@example.com
Password: demo1234
```

### Stopping the app

Go back to the terminal and press `Ctrl + C`. Then type:
```
docker-compose down
```

### Next time you want to run it

You only need to do Steps 3 and 5 again — but use this shorter command (no `--build` needed):
```
docker-compose up
```

---

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + React + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Backend | Python FastAPI |
| ORM | SQLAlchemy |
| Database | SQLite (dev) → PostgreSQL (prod) |
| Auth | JWT (python-jose + bcrypt) |
| AI | OpenAI GPT-4o-mini (with mock fallback) |

---

## Quick Start

### Docker
```bash
cp backend/.env.example backend/.env
docker-compose up --build
```

### Manual

**Prerequisites:** Python 3.12+ and Node.js 20+

### 1. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Optional: open .env and add your OPENAI_API_KEY

# Seed demo data
python seed.py

# Start API server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App runs at: http://localhost:3000

---

## Login

```
Email:    demo@example.com
Password: demo1234
```

---

## Project Structure
```
ecomm_analyst-main/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + CORS
│   │   ├── config.py        # Settings from .env
│   │   ├── database.py      # SQLAlchemy engine + session
│   │   ├── models.py        # ORM models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── security.py      # JWT + bcrypt helpers
│   │   ├── dependencies.py  # FastAPI dependencies
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── dashboard.py
│   │       ├── products.py
│   │       ├── sales.py
│   │       ├── engagement.py
│   │       ├── comments.py
│   │       └── insights.py
│   ├── seed.py              # Demo data seed script
│   ├── requirements.txt
│   ├── .env.example         # Copy to .env before running
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx            # Redirects → /dashboard
    │   │   ├── login/page.tsx
    │   │   └── dashboard/
    │   │       ├── layout.tsx      # Auth guard + sidebar
    │   │       ├── page.tsx        # Main dashboard
    │   │       ├── sales/page.tsx
    │   │       ├── engagement/page.tsx
    │   │       ├── comments/page.tsx
    │   │       ├── insights/page.tsx
    │   │       └── settings/page.tsx
    │   ├── components/
    │   ├── context/
    │   └── lib/
    │       └── api.ts              # Axios + typed API helpers
    ├── package.json
    ├── .env.local.example   # Copy to .env.local if needed
    └── Dockerfile
```

---

## Environment Variables

### Backend (`backend/.env`)
Copy from `backend/.env.example`:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./ecommerce.db` | Database connection string |
| `SECRET_KEY` | *(change this)* | JWT signing key — use a long random string |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token lifetime |
| `OPENAI_API_KEY` | *(optional)* | Enables real AI responses |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |

### Frontend (`frontend/.env.local`)
Copy from `frontend/.env.local.example`. Only needed if your backend runs somewhere other than `http://localhost:8000`:

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login → JWT token |
| GET | /api/dashboard/summary | KPI summary |
| GET | /api/products/ | List products |
| GET | /api/sales/analytics/trends | Revenue trend |
| GET | /api/sales/analytics/top-products | Top products by revenue |
| GET | /api/sales/analytics/most-returned | Most returned products |
| GET | /api/sales/analytics/bundled-items | Frequently bundled pairs |
| GET | /api/sales/analytics/competitor-pricing | Competitor price comparison |
| GET | /api/engagement/analytics/trends | Engagement over time |
| GET | /api/engagement/analytics/top-viewed | Most visited products |
| GET | /api/engagement/analytics/image-views | Most viewed images |
| GET | /api/comments/analytics/top-positive | Top 5 positive reviews |
| GET | /api/comments/analytics/top-negative | Top 5 negative reviews |
| GET | /api/comments/analytics/sentiment-summary | Sentiment counts |
| GET | /api/comments/analytics/word-frequency | Most frequent words |
| GET | /api/comments/analytics/themes | Praise & complaint themes |
| POST | /api/insights/ask | Ask AI analytics question |
| GET | /api/insights/history | View past AI interactions |

---

## AI Insights

- **With OpenAI key**: Uses `gpt-4o-mini` with real store data as context
- **Without key**: Falls back to smart rule-based mock responses (still useful for demos)

To enable: add `OPENAI_API_KEY=sk-...` to `backend/.env`

---

## Switching to PostgreSQL (Production)

1. Uncomment `psycopg2-binary` in `backend/requirements.txt`
2. Update `DATABASE_URL` in `backend/.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_analytics
   ```
3. Re-seed: `python seed.py` (or restart Docker)

---

## Known Issues

### `bcrypt` / `passlib` Incompatibility (manual setup only)

**Error:** `AttributeError: module 'bcrypt' has no attribute '__about__'`

**Cause:** `passlib 1.7.4` is incompatible with `bcrypt 4.1+`.

**Fix:** Already pinned in `requirements.txt` as `bcrypt==4.0.1`. If you still hit it after installing, run:
```bash
pip install "bcrypt==4.0.1"
```

Docker avoids this entirely since it installs from `requirements.txt` in a clean environment.
