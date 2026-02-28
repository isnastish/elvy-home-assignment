# SMHI Weather Analytics

A full-stack web application for visualizing historical cloud cover and lightning probability data for Swedish locations, powered by [SMHI Open Data](https://opendata.smhi.se).

## Features

- **Address search** — enter any Swedish address or city, geocoded via OpenStreetMap/Nominatim
- **Cloud cover visualization** — historical cloud cover data (oktas, 0–8 scale) from the nearest SMHI station
- **Lightning probability** — thunder day observations converted to strike probability percentages
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
| `GET` | `/api/v1/weather/lightning?lat=...&lon=...&granularity=month` | Lightning probability |
| `GET` | `/api/v1/weather/combined?lat=...&lon=...&granularity=month` | Both cloud cover and lightning |
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

The frontend uses a build-time variable:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Backend API base URL |

## Deployment

### Terraform (Google Cloud Run)

```bash
cd terraform
terraform init
terraform plan -var="project_id=YOUR_GCP_PROJECT" \
               -var="backend_image=YOUR_BACKEND_IMAGE" \
               -var="frontend_image=YOUR_FRONTEND_IMAGE"
terraform apply
```

### CI/CD (GitHub Actions)

- **CI** (`ci.yml`) — runs on every push/PR to `main`: lints, tests, type-checks, and builds
- **CD** (`cd.yml`) — runs on push to `main`: builds Docker images, pushes to Artifact Registry, deploys to Cloud Run

Required GitHub secrets/variables:
- `GCP_PROJECT_ID` (variable)
- `WIF_PROVIDER` (secret) — Workload Identity Federation provider
- `WIF_SERVICE_ACCOUNT` (secret) — GCP service account

## Project Structure

```
smhi-weather-app/
├── backend/
│   ├── src/
│   │   ├── main.py                  # FastAPI app setup
│   │   ├── settings.py              # Configuration
│   │   ├── dependencies.py          # Dependency injection
│   │   ├── models/                  # Pydantic models
│   │   ├── routes/                  # API route handlers
│   │   ├── services/                # Business logic
│   │   │   ├── smhi_client.py       # SMHI API client with caching
│   │   │   ├── smhi_service.py      # Data aggregation service
│   │   │   ├── geocoding_service.py # Address → coordinates
│   │   │   └── forecast_service.py  # ML forecasting
│   │   └── exceptions/              # Custom error handling
│   ├── tests/                       # pytest test suite
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Main app component
│   │   ├── components/              # React components
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── api/                     # API client
│   │   └── types/                   # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── terraform/                       # GCP Cloud Run IaC
├── .github/workflows/               # CI/CD pipelines
└── docker-compose.yaml
```

## Data Sources

- **Weather data**: [SMHI Open Data — Meteorological Observations API](https://opendata.smhi.se/apidocs/metobs/)
  - Parameter 16: Total cloud cover (oktas)
  - Parameter 30: Number of days with thunder (monthly)
- **Geocoding**: [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org/)
