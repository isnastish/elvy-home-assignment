"""Routes for AI-based weather forecasting (bonus feature)."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.dependencies import get_forecast_service
from src.models.weather import ForecastMetric, ForecastResponse
from src.services.forecast_service import ForecastService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/forecast",
    tags=["forecast"],
)


@router.get(
    "",
    response_model=ForecastResponse,
    status_code=status.HTTP_200_OK,
)
async def get_forecast(
    lat: float = Query(description="Latitude of the location"),
    lon: float = Query(description="Longitude of the location"),
    metric: ForecastMetric = Query(
        default=ForecastMetric.CLOUD_COVER,
        description="Metric to forecast: 'cloud_cover' or 'lightning'",
    ),
    months_ahead: int = Query(
        default=12,
        ge=1,
        le=36,
        description="Number of months to forecast ahead",
    ),
    forecast_service: Annotated[ForecastService, Depends(get_forecast_service)] = None,  # type: ignore
) -> ForecastResponse:
    """Forecast future cloud cover or lightning probability using AI.

    Uses a Ridge regression model with seasonal decomposition trained on
    historical SMHI data to predict future values with confidence intervals.
    """
    logger.info(f"Forecasting {metric} for ({lat}, {lon}), {months_ahead} months ahead")
    return await forecast_service.forecast(lat, lon, metric, months_ahead)
