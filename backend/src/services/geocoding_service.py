"""Geocoding service using Nominatim (OpenStreetMap) — no API key needed."""

import httpx

from src.exceptions.errors import GeocodingError
from src.models.location import GeocodeResponse, GeocodeResult
from src.settings import settings


class GeocodingService:
    """Service for geocoding addresses to coordinates."""

    async def geocode(self, address: str) -> GeocodeResponse:
        """Convert an address string to lat/lon coordinates.

        Uses Nominatim with country bias towards Sweden.
        """
        params = {
            "q": address,
            "format": "json",
            "countrycodes": ",".join(settings.geocoding.country_codes),
            "limit": settings.geocoding.limit,
            "addressdetails": 1,
        }
        headers = {
            "User-Agent": settings.geocoding.user_agent,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(settings.geocoding.service_url, params=params, headers=headers)  # type: ignore
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as e:
            raise GeocodingError(f"Failed to geocode address '{address}': {e}") from e

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
