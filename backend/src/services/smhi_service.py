"""Business logic for aggregating SMHI weather data.

Key meteorological concepts
----------------------------
**Cloud cover – percent (0–100 %)**:
    SMHI parameter 16 reports total cloud cover as a percentage.
    0 % = completely clear sky, 100 % = completely overcast.

**Thunder days – SMHI parameter 30**:
    Reported as the *number of days with thunder in a calendar month*.
    We convert this to a daily probability:
        probability = thunder_days / days_in_month × 100
    Because the raw data is inherently monthly, the ``DAY`` granularity
    is not meaningful and we fall back to ``MONTH``.
"""

import calendar
import logging
from collections import defaultdict
from datetime import datetime, timezone

from src.models.location import Station
from src.models.weather import (
    CloudCoverResponse,
    CombinedWeatherResponse,
    Granularity,
    LightningResponse,
    WeatherDataPoint,
)
from src.services.smhi_client import PARAM_CLOUD_COVER, PARAM_THUNDER_DAYS, SmhiClient

logger = logging.getLogger(__name__)


class SmhiService:
    """Service for retrieving and processing SMHI weather data."""

    def __init__(self, client: SmhiClient) -> None:
        self._client = client

    @staticmethod
    def _timestamp_to_datetime(ts_ms: int) -> datetime:
        """Convert SMHI millisecond timestamp to datetime."""
        return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)

    @staticmethod
    def _period_key(dt: datetime, granularity: Granularity) -> str:
        """Create a period key string from a datetime."""
        match granularity:
            case Granularity.DAY:
                return dt.strftime("%Y-%m-%d")
            case Granularity.MONTH:
                return dt.strftime("%Y-%m")
            case Granularity.YEAR:
                return dt.strftime("%Y")

    @staticmethod
    def _aggregate_values(
        raw_values: list[dict],
        granularity: Granularity,
    ) -> list[WeatherDataPoint]:
        """Aggregate raw SMHI values by the given granularity."""
        buckets: dict[str, list[float]] = defaultdict(list)

        for entry in raw_values:
            ts = entry.get("date")
            val = entry.get("value")
            if ts is None or val is None:
                continue
            try:
                value = float(val)
            except (ValueError, TypeError):
                continue

            dt = SmhiService._timestamp_to_datetime(ts)
            key = SmhiService._period_key(dt, granularity)
            buckets[key].append(value)

        # Calculate mean per period
        result = []
        for period in sorted(buckets.keys()):
            values = buckets[period]
            mean = round(sum(values) / len(values), 2)
            result.append(WeatherDataPoint(period=period, value=mean))

        return result

    @staticmethod
    def _days_in_month(year: int, month: int) -> int:
        """Return the number of days in a given month (accounts for leap years)."""
        return calendar.monthrange(year, month)[1]

    @staticmethod
    def _aggregate_thunder_as_probability(
        raw_values: list[dict],
        granularity: Granularity,
    ) -> list[WeatherDataPoint]:
        """Aggregate thunder-day counts into a daily probability percentage.

        SMHI parameter 30 gives the *number of days with thunder per month*.
        We convert to a probability that any single day in the period has
        thunder: ``(thunder_days / days_in_period) × 100``.

        Because the underlying data is monthly, ``DAY`` granularity is not
        meaningful — we automatically promote it to ``MONTH`` and log a
        warning.
        """
        effective_granularity = granularity
        if granularity == Granularity.DAY:
            logger.warning(
                "Thunder-days data is monthly; daily granularity is not "
                "supported. Falling back to MONTH."
            )
            effective_granularity = Granularity.MONTH

        # Bucket: key → list of (thunder_days, year, month) tuples
        buckets: dict[str, list[tuple[float, int, int]]] = defaultdict(list)

        for entry in raw_values:
            ts = entry.get("date")
            val = entry.get("value")
            if ts is None or val is None:
                continue
            try:
                value = float(val)
            except (ValueError, TypeError):
                continue

            dt = SmhiService._timestamp_to_datetime(ts)
            key = SmhiService._period_key(dt, effective_granularity)
            buckets[key].append((value, dt.year, dt.month))

        result = []
        for period in sorted(buckets.keys()):
            entries = buckets[period]

            if effective_granularity == Granularity.MONTH:
                # Average thunder-day counts if >1 entry for the same month
                avg_thunder_days = sum(v for v, _, _ in entries) / len(entries)
                # Use the actual number of days in that month
                _, year, month = entries[0]
                days = SmhiService._days_in_month(year, month)
                probability = round(min((avg_thunder_days / days) * 100, 100), 2)

            else:  # YEAR
                total_thunder_days = sum(v for v, _, _ in entries)
                year = entries[0][1]
                days_in_year = 366 if calendar.isleap(year) else 365
                probability = round(min((total_thunder_days / days_in_year) * 100, 100), 2)

            result.append(WeatherDataPoint(period=period, value=probability))

        return result

    async def _find_best_station(self, parameter: int, lat: float, lon: float) -> Station:
        """Find the nearest active station for a parameter."""
        stations = await self._client.find_nearest_stations(parameter, lat, lon, limit=10)

        # Prefer active stations
        for station in stations:
            if station.active:
                return station

        # Fallback: return nearest regardless
        if stations:
            return stations[0]

        raise ValueError(f"No stations found for parameter {parameter} near ({lat}, {lon})")

    async def get_cloud_cover(self, lat: float, lon: float, granularity: Granularity) -> CloudCoverResponse:
        """Get aggregated cloud cover data for a location."""
        station = await self._find_best_station(PARAM_CLOUD_COVER, lat, lon)
        raw_data = await self._client.get_station_data(PARAM_CLOUD_COVER, station.id)

        data_points = self._aggregate_values(raw_data.get("value", []), granularity)

        return CloudCoverResponse(
            station_name=station.name,
            station_id=station.id,
            latitude=station.latitude,
            longitude=station.longitude,
            granularity=granularity,
            data=data_points,
        )

    async def get_lightning(self, lat: float, lon: float, granularity: Granularity) -> LightningResponse:
        """Get aggregated lightning/thunder probability for a location."""
        station = await self._find_best_station(PARAM_THUNDER_DAYS, lat, lon)
        raw_data = await self._client.get_station_data(PARAM_THUNDER_DAYS, station.id)

        data_points = self._aggregate_thunder_as_probability(raw_data.get("value", []), granularity)

        return LightningResponse(
            station_name=station.name,
            station_id=station.id,
            latitude=station.latitude,
            longitude=station.longitude,
            granularity=granularity,
            data=data_points,
        )

    async def get_combined_weather(self, lat: float, lon: float, granularity: Granularity) -> CombinedWeatherResponse:
        """Get both cloud cover and lightning data in one call."""
        cloud_station = await self._find_best_station(PARAM_CLOUD_COVER, lat, lon)
        cloud_raw = await self._client.get_station_data(PARAM_CLOUD_COVER, cloud_station.id)
        cloud_data = self._aggregate_values(cloud_raw.get("value", []), granularity)

        # For lightning, might be a different station
        try:
            thunder_station = await self._find_best_station(PARAM_THUNDER_DAYS, lat, lon)
            thunder_raw = await self._client.get_station_data(PARAM_THUNDER_DAYS, thunder_station.id)
            lightning_data = self._aggregate_thunder_as_probability(thunder_raw.get("value", []), granularity)
        except ValueError as e:
            logger.warning(f"Could not get thunder data: {e}. Returning empty lightning data.")
            lightning_data = []
        except Exception as e:
            logger.error(f"Unexpected error fetching thunder data: {e}. Returning empty lightning data.")
            lightning_data = []

        return CombinedWeatherResponse(
            station_name=cloud_station.name,
            station_id=cloud_station.id,
            latitude=cloud_station.latitude,
            longitude=cloud_station.longitude,
            granularity=granularity,
            cloud_cover=cloud_data,
            lightning=lightning_data,
        )

    async def find_nearest_stations(self, lat: float, lon: float, limit: int = 5) -> list[Station]:
        """Find stations near a location (for the cloud cover parameter)."""
        return await self._client.find_nearest_stations(PARAM_CLOUD_COVER, lat, lon, limit)
