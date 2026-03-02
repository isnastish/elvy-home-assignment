"""SMHI Weather Analytics API — FastAPI application."""

import logging

from fastapi import APIRouter, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from src.exceptions.exception_handler import register_exception_handlers
from src.routes import forecast, locations, weather
from src.settings import settings

logging.basicConfig(level=logging.INFO)

V1_API_PREFIX = "/api/v1"

app = FastAPI(
    title="SMHI Weather Analytics API",
    description="API for visualizing SMHI cloud cover and lightning data for Swedish locations",
    version="1.0.0",
)

# CORS — allow the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

api_router = APIRouter(prefix=V1_API_PREFIX)
api_router.include_router(weather.router)
api_router.include_router(locations.router)
api_router.include_router(forecast.router)

app.include_router(api_router)


@app.get("/health", status_code=status.HTTP_200_OK)
async def health() -> dict:
    return {"status": "ok"}
