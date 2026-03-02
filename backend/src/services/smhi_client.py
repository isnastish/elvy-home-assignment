"""Raw SMHI Open Data API client with in-memory caching."""

import logging
from datetime import datetime, timedelta
from typing import Any

import httpx

from src.exceptions.errors import SmhiApiError
from src.models.location import Station
from src.services.geo_utils import haversine_km
from src.settings import settings

_logger = logging.getLogger(__name__)

PARAM_CLOUD_COVER = settings.smhi.parameters.cloud_cover  # Total cloud cover (percent 0–100)

_STATION_LIST_TIMEOUT = 30.0  # seconds — station metadata is small
_STATION_DATA_TIMEOUT = 60.0  # seconds — historical data can be large

# SMHI serves historical observations in two periods; we fetch both and merge.
_DATA_PERIODS = ("corrected-archive", "latest-months")


class SmhiClient:
    """Client for SMHI's Open Data Meteorological Observations API."""

    def __init__(self) -> None:
        self._cache: dict[str, tuple[datetime, Any]] = {}
        self._ttl = timedelta(hours=settings.smhi.cache_ttl_hours)
        # Station metadata rarely changes — cached permanently for the process lifetime.
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
        """Get all stations for a given parameter.

        Results are cached permanently (station metadata rarely changes).
        """
        if parameter in self._stations_cache:
            return self._stations_cache[parameter]

        url = f"{settings.smhi.base_url}/version/latest/parameter/{parameter}.json"
        _logger.info(f"Fetching stations for parameter {parameter} from {url}")

        try:
            async with httpx.AsyncClient(timeout=_STATION_LIST_TIMEOUT) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as e:
            raise SmhiApiError(f"Failed to fetch stations for parameter {parameter}: {e}") from e

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

        stations_with_distance = [
            Station(
                id=s.id,
                name=s.name,
                latitude=s.latitude,
                longitude=s.longitude,
                distance_km=round(haversine_km(lat, lon, s.latitude, s.longitude), 2),
                active=s.active,
            )
            for s in all_stations
        ]

        stations_with_distance.sort(key=lambda s: s.distance_km)
        return stations_with_distance[:limit]

    async def get_station_data(self, parameter: int, station_id: int) -> dict:
        """Get historical data for a station and parameter.

        Fetches both *corrected-archive* (bulk historical) and *latest-months*
        (recent data), then deduplicates by timestamp.
        """
        cache_key = f"data:{parameter}:{station_id}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        all_values: list[dict] = []

        async with httpx.AsyncClient(timeout=_STATION_DATA_TIMEOUT) as client:
            for period in _DATA_PERIODS:
                url = (
                    f"{settings.smhi.base_url}/version/latest"
                    f"/parameter/{parameter}"
                    f"/station/{station_id}"
                    f"/period/{period}/data.json"
                )
                _logger.info(f"Fetching data from {url}")
                try:
                    response = await client.get(url)
                    if response.status_code == 404:
                        _logger.warning(f"No data for period {period}, station {station_id}, param {parameter}")
                        continue
                    response.raise_for_status()
                    data = response.json()
                    all_values.extend(data.get("value", []))
                except httpx.HTTPError as e:
                    _logger.warning(f"Failed to fetch {period} data for station {station_id}: {e}")
                    continue

        # Deduplicate by timestamp — later entries (latest-months) win over archive
        seen_timestamps: dict[int, dict] = {}
        for v in all_values:
            ts = v.get("date", 0)
            seen_timestamps[ts] = v

        result = {"value": list(seen_timestamps.values())}
        self._set_cached(cache_key, result)
        return result
