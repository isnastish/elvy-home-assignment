# SMHI Weather Analytics

A full-stack web application for visualizing historical cloud cover and lightning strike data for Swedish locations, powered by [SMHI Open Data](https://opendata.smhi.se).

## Features

- **Address search** — enter any Swedish address or city, geocoded via OpenStreetMap/Nominatim
- **Cloud cover visualization** — historical cloud cover data (percentage, 0–100%) from the nearest SMHI station
- **Lightning strikes** — actual lightning strike counts from the SMHI Lightning Archive API, filtered by proximity to the selected location
- **Granularity toggle** — view data aggregated by day, month, or year
- **AI forecasting** — Ridge regression model with seasonal decomposition predicts future values with 95% confidence intervals
- **Terraform deployment** — infrastructure-as-code for Google Cloud Run
- **CI/CD** — GitHub Actions pipelines for testing, linting, and deployment

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Recharts, Axios |
| Backend | Python 3.12, FastAPI, httpx, Pydantic, scikit-learn |
| Infra | Docker, Docker Compose, Terraform (GCP Cloud Run) |
| CI/CD | GitHub Actions |

## Prerequisites

- **Python 3.12+** and [uv](https://docs.astral.sh/uv/) (for the backend)
- **Node.js 20+** and npm (for the frontend)
- **Docker & Docker Compose** (optional, for containerized setup)

## Quick Start

### Option 1: Docker Compose (recommended)

```bash
docker compose up --build
```

This starts both services:
- Frontend → http://localhost:3000
- Backend → http://localhost:8000
- API docs → http://localhost:8000/docs

### Option 2: Run locally (for development)

**Backend:**

```bash
cd backend
uv sync                                    # install dependencies
uv run fastapi dev src/main.py --port 8000 # start dev server with hot-reload
```

**Frontend** (in a separate terminal):

```bash
cd frontend
npm install    # install dependencies
npm run dev    # start Vite dev server
```

- Frontend → http://localhost:5173
- Backend → http://localhost:8000
- API docs → http://localhost:8000/docs

## API Endpoints

All endpoints are prefixed with `/api/v1`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/locations/geocode?address=...` | Geocode an address to lat/lon |
| `GET` | `/api/v1/locations/stations?lat=...&lon=...` | Find nearest SMHI stations |
| `GET` | `/api/v1/weather/cloud-cover?lat=...&lon=...&granularity=month` | Cloud cover data |
| `GET` | `/api/v1/weather/lightning?lat=...&lon=...&granularity=month&radius_km=50` | Lightning strike counts |
| `GET` | `/api/v1/weather/combined?lat=...&lon=...&granularity=month&radius_km=50` | Both cloud cover and lightning |
| `GET` | `/api/v1/forecast?lat=...&lon=...&metric=cloud_cover&months_ahead=12` | AI forecast |

Granularity options: `day`, `month`, `year`.

## Running Tests

```bash
cd backend
uv run pytest -v                         # run all tests
uv run pytest --cov=src --cov-report=term # with coverage report
```

## Linting

```bash
cd backend
uv run ruff check .   # lint
uv run ruff format .  # auto-format
```

## Configuration

The backend is configured via environment variables (with sensible defaults):

| Variable | Default | Description |
|---|---|---|
| `CORS_ORIGINS` | `["http://localhost:3000", "http://localhost:5173"]` | Allowed CORS origins |
| `SMHI_CACHE_TTL_HOURS` | `6` | How long to cache SMHI API responses |
| `LIGHTNING_SEARCH_RADIUS_KM` | `50` | Radius (km) for lightning strike proximity search |

The frontend uses a build-time variable:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Backend API base URL |

## Deployment

### Quick Setup

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

**Quick start:**

```bash
# 1. Run setup script (automates GCloud configuration)
./scripts/setup-gcloud.sh your-project-id

# 2. Configure GitHub secrets (see DEPLOYMENT.md for details)

# 3. Deploy with Terraform
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform apply
```

### CI/CD (GitHub Actions)

- **CI** (`ci.yml`) — runs on every push/PR to `main`: lints, tests, type-checks, and builds
- **CD** (`cd.yml`) — runs on push to `main`: builds Docker images, pushes to Artifact Registry, deploys to Cloud Run

**Required GitHub Configuration:**

1. **Repository Variables:**
   - `GCP_PROJECT_ID` — Your GCP project ID

2. **Repository Secrets:**
   - `WIF_PROVIDER` — Workload Identity Federation provider (full resource name)
   - `WIF_SERVICE_ACCOUNT` — GCP service account email (e.g., `github-actions@PROJECT_ID.iam.gserviceaccount.com`)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete setup instructions.


## Data Sources

- **Cloud cover**: [SMHI Metobs API](https://opendata.smhi.se/apidocs/metobs/) — Parameter 16: Total cloud cover (percent, 0–100%)
- **Lightning strikes**: [SMHI Lightning Archive API](https://opendata-download-lightning.smhi.se/api/) — individual strike records with lat/lon, filtered by proximity
- **Geocoding**: [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org/)
