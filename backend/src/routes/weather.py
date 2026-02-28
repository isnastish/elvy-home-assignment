"""Routes for weather data (cloud cover and lightning)."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.dependencies import get_smhi_service
from src.models.weather import (
    CloudCoverResponse,
    CombinedWeatherResponse,
    Granularity,
    LightningResponse,
)
from src.services.smhi_service import SmhiService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/weather",
    tags=["weather"],
)


@router.get(
    "/cloud-cover",
    response_model=CloudCoverResponse,
    status_code=status.HTTP_200_OK,
)
async def get_cloud_cover(
    lat: float = Query(description="Latitude of the location"),
    lon: float = Query(description="Longitude of the location"),
    granularity: Granularity = Query(default=Granularity.MONTH, description="Aggregation granularity"),
    smhi_service: Annotated[SmhiService, Depends(get_smhi_service)] = None,  # type: ignore
) -> CloudCoverResponse:
    """Get historical cloud cover data for a location.

    Returns cloud cover data aggregated by the specified granularity (day, month, or year).
    Cloud cover is measured as a percentage (0–100%, where 0% = clear sky, 100% = overcast).
    """
    logger.info(f"Getting cloud cover for ({lat}, {lon}) at {granularity} granularity")
    return await smhi_service.get_cloud_cover(lat, lon, granularity)


@router.get(
    "/lightning",
    response_model=LightningResponse,
    status_code=status.HTTP_200_OK,
)
async def get_lightning(
    lat: float = Query(description="Latitude of the location"),
    lon: float = Query(description="Longitude of the location"),
    granularity: Granularity = Query(default=Granularity.MONTH, description="Aggregation granularity"),
    smhi_service: Annotated[SmhiService, Depends(get_smhi_service)] = None,  # type: ignore
) -> LightningResponse:
    """Get historical lightning/thunder probability for a location.

    Returns the probability of lightning strikes based on historical thunder day observations.
    """
    logger.info(f"Getting lightning data for ({lat}, {lon}) at {granularity} granularity")
    return await smhi_service.get_lightning(lat, lon, granularity)


@router.get(
    "/combined",
    response_model=CombinedWeatherResponse,
    status_code=status.HTTP_200_OK,
)
async def get_combined_weather(
    lat: float = Query(description="Latitude of the location"),
    lon: float = Query(description="Longitude of the location"),
    granularity: Granularity = Query(default=Granularity.MONTH, description="Aggregation granularity"),
    smhi_service: Annotated[SmhiService, Depends(get_smhi_service)] = None,  # type: ignore
) -> CombinedWeatherResponse:
    """Get both cloud cover and lightning data in a single request.

    Returns cloud cover (%) and lightning probability (%) for the given location.
    """
    logger.info(f"Getting combined weather for ({lat}, {lon}) at {granularity} granularity")
    return await smhi_service.get_combined_weather(lat, lon, granularity)
