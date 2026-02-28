"""Raw SMHI Open Data API client with in-memory caching."""

import logging
import math
from datetime import datetime, timedelta
from typing import Any

import httpx

from src.models.location import Station
from src.settings import settings

logger = logging.getLogger(__name__)

SMHI_BASE_URL = "https://opendata-download-metobs.smhi.se/api"

# SMHI Metobs parameter IDs
PARAM_CLOUD_COVER = 16  # Total cloud cover (mean, percent 0–100)
PARAM_THUNDER_DAYS = 30  # Number of days with thunder (monthly)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class SmhiClient:
    """Client for SMHI's Open Data Meteorological Observations API."""

    def __init__(self) -> None:
        self._cache: dict[str, tuple[datetime, Any]] = {}
        self._ttl = timedelta(hours=settings.smhi_cache_ttl_hours)
        self._stations_cache: dict[int, list[Station]] = {}

    def _get_cached(self, key: str) -> Any | None:
        if key in self._cache:
            cached_at, data = self._cache[key]
            if datetime.now() - cached_at < self._ttl:
                return data
            del self._cache[key]
        return None

    def _set_cached(self, key: str, data: Any) -> None:
        self._cache[key] = (datetime.now(), data)

    async def get_stations(self, parameter: int) -> list[Station]:
        """Get all stations for a given parameter."""
        if parameter in self._stations_cache:
            return self._stations_cache[parameter]

        url = f"{SMHI_BASE_URL}/version/latest/parameter/{parameter}.json"
        logger.info(f"Fetching stations for parameter {parameter} from {url}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

        stations: list[Station] = []
        for s in data.get("station", []):
            stations.append(
                Station(
                    id=s["id"],
                    name=s.get("name", f"Station {s['id']}"),
                    latitude=s["latitude"],
                    longitude=s["longitude"],
                    distance_km=0.0,
                    active=s.get("active", False),
                )
            )

        self._stations_cache[parameter] = stations
        return stations

    async def find_nearest_stations(self, parameter: int, lat: float, lon: float, limit: int = 5) -> list[Station]:
        """Find the nearest stations for a parameter, sorted by distance."""
        all_stations = await self.get_stations(parameter)

        stations_with_distance = []
        for s in all_stations:
            dist = _haversine_km(lat, lon, s.latitude, s.longitude)
            stations_with_distance.append(
                Station(
                    id=s.id,
                    name=s.name,
                    latitude=s.latitude,
                    longitude=s.longitude,
                    distance_km=round(dist, 2),
                    active=s.active,
                )
            )

        stations_with_distance.sort(key=lambda s: s.distance_km)
        return stations_with_distance[:limit]

    async def get_station_data(self, parameter: int, station_id: int) -> dict:
        """Get historical data for a station and parameter.

        Tries corrected-archive first, falls back to latest-months.
        """
        cache_key = f"data:{parameter}:{station_id}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        # Try corrected-archive first (most complete historical data)
        periods = ["corrected-archive", "latest-months"]
        all_values: list[dict] = []

        async with httpx.AsyncClient(timeout=60.0) as client:
            for period in periods:
                url = (
                    f"{SMHI_BASE_URL}/version/latest"
                    f"/parameter/{parameter}"
                    f"/station/{station_id}"
                    f"/period/{period}/data.json"
                )
                logger.info(f"Fetching data from {url}")
                try:
                    response = await client.get(url)
                    if response.status_code == 404:
                        logger.warning(f"No data for period {period}, station {station_id}, param {parameter}")
                        continue
                    response.raise_for_status()
                    data = response.json()
                    values = data.get("value", [])
                    all_values.extend(values)
                except httpx.HTTPError as e:
                    logger.warning(f"Failed to fetch {period} data: {e}")
                    continue

        # Deduplicate by timestamp (prefer later entries)
        seen_timestamps: dict[int, dict] = {}
        for v in all_values:
            ts = v.get("date", 0)
            seen_timestamps[ts] = v

        result = {"value": list(seen_timestamps.values())}
        self._set_cached(cache_key, result)
        return result
