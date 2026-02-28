"""Geocoding service using Nominatim (OpenStreetMap) — no API key needed."""

import logging

import httpx

from src.models.location import GeocodeResponse, GeocodeResult
from src.settings import settings

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


class GeocodingService:
    """Service for geocoding addresses to coordinates."""

    async def geocode(self, address: str) -> GeocodeResponse:
        """Convert an address string to lat/lon coordinates.

        Uses Nominatim with country bias towards Sweden.
        """
        params = {
            "q": address,
            "format": "json",
            "countrycodes": "se",
            "limit": 5,
            "addressdetails": 1,
        }
        headers = {
            "User-Agent": settings.geocoding_user_agent,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(NOMINATIM_URL, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data:
            results.append(
                GeocodeResult(
                    display_name=item.get("display_name", ""),
                    latitude=float(item["lat"]),
                    longitude=float(item["lon"]),
                )
            )

        return GeocodeResponse(results=results)
