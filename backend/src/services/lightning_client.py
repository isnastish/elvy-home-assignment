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

_logger = logging.getLogger(__name__)


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
        self._ttl = timedelta(hours=settings.smhi.cache_ttl_hours)
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
        """Fetch JSON with semaphore-throttled concurrency.
        
        Returns None on 404 (expected for days with no lightning data).
        """
        async with self._semaphore:
            try:
                resp = await client.get(url)
                if resp.status_code == 404:
                    return None
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPError as e:
                status_code = getattr(e, "response", None)
                if status_code and hasattr(status_code, "status_code") and status_code.status_code == 404:
                    return None
                _logger.warning(f"Lightning API request failed: {url} – {e}")
                return None
            except Exception as e:
                _logger.error(f"Unexpected error fetching {url}: {e}", exc_info=True)
                return None

    async def _fetch_day_strikes(
        self,
        client: httpx.AsyncClient,
        year: int,
        month: int,
        day: int,
    ) -> list[dict]:
        """Fetch all strikes for a single day (cached).
        
        Returns empty list on 404 (day has no lightning data).
        """
        cache_key = f"lightning:data:{year}:{month}:{day}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        url = f"{settings.smhi.lightning_base_url}/version/latest/year/{year}/month/{month}/day/{day}/data.json"
        data = await self._fetch_json(client, url)
        strikes = data.get("values", []) if data else []
        self._set_cached(cache_key, strikes)
        return strikes

    async def _discover_available_days(
        self,
        client: httpx.AsyncClient,
        start_date: date,
        end_date: date,
    ) -> list[tuple[int, int, int]]:
        """Use the API hierarchy to discover only the days that have data.

        Instead of blindly requesting every day in the range (~1095 for 3 years),
        we first ask which months and days actually exist. Lightning in Sweden is
        seasonal (mostly May–Sep), so this typically reduces requests by 70-80%.
        """
        base = settings.smhi.lightning_base_url

        # 1. Fetch available months for each year in the range
        years = range(start_date.year, end_date.year + 1)
        year_tasks = [
            self._fetch_json(client, f"{base}/version/latest/year/{y}.json")
            for y in years
        ]
        year_results = await asyncio.gather(*year_tasks, return_exceptions=True)

        # 2. Collect (year, month) pairs that fall within our date range
        months_to_check: list[tuple[int, int]] = []
        for year, result in zip(years, year_results):
            if isinstance(result, BaseException) or result is None:
                continue
            for resource in result.get("month", []):
                key = resource.get("key")
                if key is None:
                    continue
                try:
                    month = int(key)
                except (ValueError, TypeError):
                    continue
                # Skip months outside the requested range
                month_start = date(year, month, 1)
                month_end = date(
                    year, month + 1, 1) - timedelta(days=1) if month < 12 else date(year, 12, 31)
                if month_end < start_date or month_start > end_date:
                    continue
                months_to_check.append((year, month))

        _logger.info(f"Lightning API: {len(months_to_check)} months with data in range {start_date} → {end_date}")

        # 3. Fetch available days for each month
        month_tasks = [
            self._fetch_json(client, f"{base}/version/latest/year/{y}/month/{m}.json")
            for y, m in months_to_check
        ]
        month_results = await asyncio.gather(*month_tasks, return_exceptions=True)

        # 4. Collect (year, month, day) tuples that fall within our date range
        days_to_fetch: list[tuple[int, int, int]] = []
        for (year, month), result in zip(months_to_check, month_results):
            if isinstance(result, BaseException) or result is None:
                continue
            for resource in result.get("day", []):
                key = resource.get("key")
                if key is None:
                    continue
                try:
                    day = int(key)
                except (ValueError, TypeError):
                    continue
                d = date(year, month, day)
                if start_date <= d <= end_date:
                    days_to_fetch.append((year, month, day))

        _logger.info(f"Lightning API: {len(days_to_fetch)} days with data to fetch")
        return days_to_fetch

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

        Uses the API hierarchy to discover which days actually have data before
        fetching, avoiding hundreds of unnecessary 404 requests.
        """
        min_lat, max_lat, min_lon, max_lon = _bounding_box(lat, lon, radius_km)

        daily_counts: dict[date, int] = {}
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Discover only days that have data via the API hierarchy
            days_to_fetch = await self._discover_available_days(client, start_date, end_date)

            _logger.info(
                f"Fetching {len(days_to_fetch)} days of lightning data "
                f"({start_date} → {end_date}) for ({lat}, {lon}), radius={radius_km}km"
            )

            # Fetch strike data only for days that exist
            tasks = [self._fetch_day_strikes(client, y, m, d) for y, m, d in days_to_fetch]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        for (y, m, d), result in zip(days_to_fetch, results):
            if isinstance(result, Exception):
                _logger.warning(f"Exception fetching strikes for {y}-{m:02d}-{d:02d}: {result}")
                continue

            if not isinstance(result, list):
                _logger.error(
                    f"Unexpected result type for {y}-{m:02d}-{d:02d}: expected list, got {type(result).__name__}. "
                    f"Result: {result}"
                )
                continue

            if not result:
                continue

            # Fast bounding-box pre-filter, then precise haversine
            count = 0
            invalid_strikes = 0
            for strike in result:
                s_lat = strike.get("lat")
                s_lon = strike.get("lon")
                if s_lat is None or s_lon is None:
                    invalid_strikes += 1
                    continue
                if not (min_lat <= s_lat <= max_lat and min_lon <= s_lon <= max_lon):
                    continue
                if _haversine_km(lat, lon, s_lat, s_lon) <= radius_km:
                    count += 1

            if invalid_strikes > 0:
                _logger.warning(
                    f"Found {invalid_strikes} strikes with missing lat/lon for {y}-{m:02d}-{d:02d} "
                    f"(out of {len(result)} total strikes)"
                )

            if count > 0:
                daily_counts[date(y, m, d)] = count

        _logger.info(f"Found {sum(daily_counts.values())} strikes across {len(daily_counts)} days near ({lat}, {lon})")
        return daily_counts
