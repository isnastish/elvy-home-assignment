"""Routes for geocoding and station discovery."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.dependencies import get_geocoding_service, get_smhi_service
from src.models.location import GeocodeResponse, StationsResponse
from src.services.geocoding_service import GeocodingService
from src.services.smhi_service import SmhiService

_logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/locations",
    tags=["locations"],
)


@router.get(
    "/geocode",
    response_model=GeocodeResponse,
    status_code=status.HTTP_200_OK,
)
async def geocode_address(
    address: str = Query(description="Address to geocode (biased towards Sweden)"),
    geocoding_service: Annotated[GeocodingService, Depends(get_geocoding_service)] = None,  # type: ignore
) -> GeocodeResponse:
    """Convert an address to latitude/longitude coordinates.

    Uses Nominatim (OpenStreetMap) with a Sweden bias.
    """
    _logger.info(f"Geocoding address: {address}")
    return await geocoding_service.geocode(address)


@router.get(
    "/stations",
    response_model=StationsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_nearest_stations(
    lat: float = Query(description="Latitude"),
    lon: float = Query(description="Longitude"),
    limit: int = Query(default=5, ge=1, le=20, description="Max number of stations"),
    smhi_service: Annotated[SmhiService, Depends(get_smhi_service)] = None,  # type: ignore
) -> StationsResponse:
    """Find SMHI weather stations nearest to the given coordinates."""
    _logger.info(f"Finding stations near ({lat}, {lon})")
    stations = await smhi_service.find_nearest_stations(lat, lon, limit)
    selected = await smhi_service.find_best_station(lat, lon)

    return StationsResponse(stations=stations, selected_station=selected)
