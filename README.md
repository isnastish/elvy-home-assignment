# SMHI Weather Analytics

Full-stack app for visualizing historical cloud cover and lightning strike data for Swedish locations, powered by [SMHI Open Data](https://opendata.smhi.se).

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, MUI X Charts |
| Backend | Python 3.12, FastAPI, httpx, scikit-learn, uv |
| Infra | Docker Compose, Terraform, GCP Cloud Run, GitHub Actions |

## Quick Start

### Docker Compose

```bash
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend API docs → http://localhost:8000/docs

### Local Development

```bash
# Backend
cd backend
uv sync
uv run fastapi dev src/main.py --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Tests & Linting

```bash
cd backend
uv run pytest -v
uv run ruff check .
```

## Configuration

Backend settings live in `backend/settings.yaml` and can be overridden via environment variables (`__` as nesting delimiter, e.g. `SMHI__CACHE_TTL_HOURS=12`).

The frontend uses a build-time variable `VITE_API_URL` (defaults to `http://localhost:8000/api/v1`).

## Deployment

Pushing to `main` triggers GitHub Actions CI/CD → builds Docker images → deploys to Cloud Run.

**Required GitHub config:**
- **Variable:** `GCP_PROJECT_ID`
- **Secrets:** `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`

**Initial infra setup:**

```bash
cd terraform
terraform init
terraform apply -var="project_id=YOUR_PROJECT_ID" \
               -var="backend_image=PLACEHOLDER" \
               -var="frontend_image=PLACEHOLDER"
```
