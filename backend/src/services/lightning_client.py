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

from src.services.geo_utils import haversine_km
from src.settings import settings

_logger = logging.getLogger(__name__)

_KM_PER_DEGREE_LAT = 111.0  # approximate km per degree of latitude


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

        Returns ``None`` on 404 (expected for days with no lightning data)
        or on any network / HTTP error.
        """
        async with self._semaphore:
            try:
                resp = await client.get(url)
                if resp.status_code == 404:
                    return None
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPError as e:
                _logger.warning(f"Lightning API request failed: {url} – {e}")
                return None
            except Exception as e:
                _logger.error(f"Unexpected error fetching {url}: {e}", exc_info=True)
                return None

    @staticmethod
    def _bounding_box(lat: float, lon: float, radius_km: float) -> tuple[float, float, float, float]:
        """Return (min_lat, max_lat, min_lon, max_lon) for a quick bbox pre-filter."""
        dlat = radius_km / _KM_PER_DEGREE_LAT
        # Longitude degrees shrink with cos(latitude)
        dlon = radius_km / (_KM_PER_DEGREE_LAT * max(math.cos(math.radians(lat)), 0.01))
        return (lat - dlat, lat + dlat, lon - dlon, lon + dlon)

    async def _count_day_strikes(
        self,
        client: httpx.AsyncClient,
        year: int,
        month: int,
        day: int,
        lat: float,
        lon: float,
        radius_km: float,
        bbox: tuple[float, float, float, float],
    ) -> int:
        """Fetch strikes for a single day and return the count near (lat, lon).

        Filters by location immediately so raw strike data is never held in
        memory across tasks.  Returns 0 if no nearby strikes or on error.
        """
        cache_key = f"lightning:count:{year}:{month}:{day}:{lat}:{lon}:{radius_km}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        url = f"{settings.smhi.lightning_base_url}/version/latest/year/{year}/month/{month}/day/{day}/data.json"
        data = await self._fetch_json(client, url)
        strikes = data.get("values", []) if data else []

        if not strikes:
            self._set_cached(cache_key, 0)
            return 0

        min_lat, max_lat, min_lon, max_lon = bbox
        count = 0
        for strike in strikes:
            s_lat = strike.get("lat")
            s_lon = strike.get("lon")
            if s_lat is None or s_lon is None:
                continue
            if not (min_lat <= s_lat <= max_lat and min_lon <= s_lon <= max_lon):
                continue
            if haversine_km(lat, lon, s_lat, s_lon) <= radius_km:
                count += 1

        self._set_cached(cache_key, count)
        return count

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
        year_tasks = [self._fetch_json(client, f"{base}/version/latest/year/{y}.json") for y in years]
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
                first_of_month = date(year, month, 1)
                last_of_month = date(year + (month // 12), (month % 12) + 1, 1) - timedelta(days=1)
                if last_of_month < start_date or first_of_month > end_date:
                    continue
                months_to_check.append((year, month))

        _logger.info(f"Lightning API: {len(months_to_check)} months with data in range {start_date} → {end_date}")

        # 3. Fetch available days for each month
        month_tasks = [
            self._fetch_json(client, f"{base}/version/latest/year/{y}/month/{m}.json") for y, m in months_to_check
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
        fetching, avoiding hundreds of unnecessary 404 requests.  Each day's
        raw strike data is filtered and discarded immediately to keep memory
        usage constant regardless of how many days are fetched.
        """
        bbox = self._bounding_box(lat, lon, radius_km)

        daily_counts: dict[date, int] = {}
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Discover only days that have data via the API hierarchy
            days_to_fetch = await self._discover_available_days(client, start_date, end_date)

            _logger.info(
                f"Fetching {len(days_to_fetch)} days of lightning data "
                f"({start_date} → {end_date}) for ({lat}, {lon}), radius={radius_km}km"
            )

            # Fetch and count strikes per day — raw data is discarded inside each task
            tasks = [self._count_day_strikes(client, y, m, d, lat, lon, radius_km, bbox) for y, m, d in days_to_fetch]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        for (y, m, d), result in zip(days_to_fetch, results):
            if isinstance(result, BaseException):
                _logger.warning(f"Exception fetching strikes for {y}-{m:02d}-{d:02d}: {result}")
                continue
            if result > 0:
                daily_counts[date(y, m, d)] = result

        _logger.info(f"Found {sum(daily_counts.values())} strikes across {len(daily_counts)} days near ({lat}, {lon})")
        return daily_counts
