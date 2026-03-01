"""Client for SMHI Lightning Archive API (opendata-download-lightning).

This API provides individual lightning strike records for Sweden, available
at daily granularity.  Each strike record includes lat/lon, timestamp, and
peak current.

Data is available from ~2012 onwards.

API structure
-------------
GET /api/version/latest.json                         → available years
GET /api/version/latest/year/{y}.json                → months in year
GET /api/version/latest/year/{y}/month/{m}.json      → days in month
GET /api/version/latest/year/{y}/month/{m}/day/{d}/data.json → strikes
"""

import asyncio
import logging
import math
from datetime import date, datetime, timedelta
from typing import Any

import httpx

from src.settings import settings

logger = logging.getLogger(__name__)

SMHI_LIGHTNING_BASE_URL = "https://opendata-download-lightning.smhi.se/api"


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in km between two (lat, lon) points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _bounding_box(lat: float, lon: float, radius_km: float) -> tuple[float, float, float, float]:
    """Return (min_lat, max_lat, min_lon, max_lon) for a quick pre-filter."""
    # ~111 km per degree of latitude
    dlat = radius_km / 111.0
    # longitude degrees shrink with cos(latitude)
    dlon = radius_km / (111.0 * max(math.cos(math.radians(lat)), 0.01))
    return (lat - dlat, lat + dlat, lon - dlon, lon + dlon)


class LightningClient:
    """Async client for SMHI's Lightning Archive API.

    Fetches daily strike data, filters by location, and caches results.
    """

    def __init__(self, max_concurrent: int = 25) -> None:
        self._cache: dict[str, tuple[datetime, Any]] = {}
        self._ttl = timedelta(hours=settings.smhi_cache_ttl_hours)
        self._semaphore = asyncio.Semaphore(max_concurrent)

    # -- caching helpers -------------------------------------------------- #

    def _get_cached(self, key: str) -> Any | None:
        if key in self._cache:
            cached_at, data = self._cache[key]
            if datetime.now() - cached_at < self._ttl:
                return data
            del self._cache[key]
        return None

    def _set_cached(self, key: str, data: Any) -> None:
        self._cache[key] = (datetime.now(), data)

    # -- API methods ------------------------------------------------------ #

    async def _fetch_json(self, client: httpx.AsyncClient, url: str) -> Any | None:
        """Fetch JSON with semaphore-throttled concurrency."""
        async with self._semaphore:
            try:
                resp = await client.get(url)
                if resp.status_code == 404:
                    return None
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPError as e:
                logger.warning(f"Lightning API request failed: {url} – {e}")
                return None

    async def get_available_days(self, year: int, month: int) -> list[int]:
        """Return the list of available day numbers for a given year/month."""
        cache_key = f"lightning:days:{year}:{month}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        url = f"{SMHI_LIGHTNING_BASE_URL}/version/latest/year/{year}/month/{month}.json"
        async with httpx.AsyncClient(timeout=30.0) as client:
            data = await self._fetch_json(client, url)

        if data is None:
            return []

        days = [r["key"] for r in data.get("resource", []) if "key" in r]
        self._set_cached(cache_key, days)
        return days

    async def _fetch_day_strikes(
        self,
        client: httpx.AsyncClient,
        year: int,
        month: int,
        day: int,
    ) -> list[dict]:
        """Fetch all strikes for a single day (cached)."""
        cache_key = f"lightning:data:{year}:{month}:{day}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        url = f"{SMHI_LIGHTNING_BASE_URL}/version/latest/year/{year}/month/{month}/day/{day}/data.json"
        data = await self._fetch_json(client, url)
        strikes = data.get("values", []) if data else []
        self._set_cached(cache_key, strikes)
        return strikes

    async def get_strikes_in_range(
        self,
        lat: float,
        lon: float,
        radius_km: float,
        start_date: date,
        end_date: date,
    ) -> dict[date, int]:
        """Count lightning strikes within *radius_km* of (lat, lon) per day.

        Returns a dict mapping ``date`` → strike count.
        Only dates with ≥1 strike are included.
        """
        min_lat, max_lat, min_lon, max_lon = _bounding_box(lat, lon, radius_km)

        # Build list of (year, month, day) tuples to fetch
        days_to_fetch: list[tuple[int, int, int]] = []
        current = start_date
        while current <= end_date:
            days_to_fetch.append((current.year, current.month, current.day))
            current += timedelta(days=1)

        logger.info(
            f"Fetching {len(days_to_fetch)} days of lightning data "
            f"({start_date} → {end_date}) for ({lat}, {lon}), radius={radius_km}km"
        )

        # Fetch all days concurrently (throttled by semaphore)
        daily_counts: dict[date, int] = {}
        async with httpx.AsyncClient(timeout=30.0) as client:
            tasks = [self._fetch_day_strikes(client, y, m, d) for y, m, d in days_to_fetch]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        for (y, m, d), result in zip(days_to_fetch, results):
            if isinstance(result, Exception):
                logger.warning(f"Failed to fetch strikes for {y}-{m:02d}-{d:02d}: {result}")
                continue

            # Fast bounding-box pre-filter, then precise haversine
            count = 0
            for strike in result:
                s_lat = strike.get("lat")
                s_lon = strike.get("lon")
                if s_lat is None or s_lon is None:
                    continue
                if not (min_lat <= s_lat <= max_lat and min_lon <= s_lon <= max_lon):
                    continue
                if _haversine_km(lat, lon, s_lat, s_lon) <= radius_km:
                    count += 1

            if count > 0:
                daily_counts[date(y, m, d)] = count

        logger.info(f"Found {sum(daily_counts.values())} strikes across {len(daily_counts)} days near ({lat}, {lon})")
        return daily_counts
