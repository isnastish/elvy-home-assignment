"""Business logic for aggregating SMHI weather data.

Key meteorological concepts
----------------------------
**Cloud cover – percent (0–100 %)**:
    SMHI parameter 16 reports total cloud cover as a percentage.
    0 % = completely clear sky, 100 % = completely overcast.

**Lightning strikes – SMHI Lightning Archive API**:
    SMHI provides a separate Lightning Archive API at
    ``opendata-download-lightning.smhi.se`` with individual strike records
    including lat/lon, timestamp, and peak current.
    We count strikes within a configurable radius (default 50 km) of the
    user's location and aggregate by day / month / year.
"""

import logging
from collections import defaultdict
from datetime import date, datetime, timezone

from src.models.location import Station
from src.models.weather import (
    CloudCoverResponse,
    CombinedWeatherResponse,
    Granularity,
    LightningResponse,
    WeatherDataPoint,
)
from src.services.lightning_client import LightningClient
from src.services.smhi_client import PARAM_CLOUD_COVER, SmhiClient
from src.settings import settings

_logger = logging.getLogger(__name__)


class SmhiService:
    """Service for retrieving and processing SMHI weather data."""

    def __init__(self, client: SmhiClient, lightning_client: LightningClient) -> None:
        self._client = client
        self._lightning_client = lightning_client

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _timestamp_to_datetime(ts_ms: int) -> datetime:
        """Convert SMHI millisecond timestamp to datetime."""
        return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)

    @staticmethod
    def _period_key(dt: datetime | date, granularity: Granularity) -> str:
        """Create a period key string from a datetime or date."""
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

        result = []
        for period in sorted(buckets.keys()):
            values = buckets[period]
            mean = round(sum(values) / len(values), 2)
            result.append(WeatherDataPoint(period=period, value=mean))

        return result

    @staticmethod
    def _aggregate_lightning_strikes(
        daily_counts: dict[date, int],
        granularity: Granularity,
    ) -> list[WeatherDataPoint]:
        """Aggregate daily strike counts by the requested granularity.

        - **DAY**: one data point per day (the raw count).
        - **MONTH**: sum of strikes in each calendar month.
        - **YEAR**: sum of strikes in each year.

        Days with zero strikes are **not** included in the output.
        """
        buckets: dict[str, int] = defaultdict(int)

        for day, count in daily_counts.items():
            key = SmhiService._period_key(day, granularity)
            buckets[key] += count

        return [WeatherDataPoint(period=period, value=float(total)) for period, total in sorted(buckets.items())]

    # ------------------------------------------------------------------ #
    # Station lookup
    # ------------------------------------------------------------------ #

    async def _find_best_station(self, parameter: int, lat: float, lon: float) -> Station:
        """Find the nearest active station for a parameter."""
        stations = await self._client.find_nearest_stations(parameter, lat, lon, limit=10)

        for station in stations:
            if station.active:
                return station

        if stations:
            return stations[0]

        raise ValueError(f"No stations found for parameter {parameter} near ({lat}, {lon})")

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

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

    async def get_lightning(
        self,
        lat: float,
        lon: float,
        granularity: Granularity,
        radius_km: float | None = None,
    ) -> LightningResponse:
        """Get lightning strike counts near a location.

        Uses the SMHI Lightning Archive API to count strikes within
        *radius_km* of (lat, lon).
        """
        radius = radius_km or settings.lightning.search_radius_km
        today = date.today()
        start = date(today.year - settings.lightning.years_back, today.month, 1)

        _logger.info(
            f"Fetching lightning data for ({lat}, {lon}), radius={radius}km, "
            f"date range: {start} to {today}, granularity={granularity.value}"
        )

        daily_counts = await self._lightning_client.get_strikes_in_range(
            lat,
            lon,
            radius,
            start,
            today,
        )

        _logger.info(
            f"Found {len(daily_counts)} days with lightning strikes (total {sum(daily_counts.values())} strikes)"
        )

        data_points = self._aggregate_lightning_strikes(daily_counts, granularity)

        _logger.info(f"Aggregated to {len(data_points)} data points at {granularity.value} granularity")

        return LightningResponse(
            latitude=lat,
            longitude=lon,
            radius_km=radius,
            granularity=granularity,
            data=data_points,
        )

    async def get_combined_weather(
        self,
        lat: float,
        lon: float,
        granularity: Granularity,
        radius_km: float | None = None,
    ) -> CombinedWeatherResponse:
        """Get both cloud cover and lightning data in one call."""
        # Cloud cover from meteorological observations
        cloud_station = await self._find_best_station(PARAM_CLOUD_COVER, lat, lon)
        cloud_raw = await self._client.get_station_data(PARAM_CLOUD_COVER, cloud_station.id)
        cloud_data = self._aggregate_values(cloud_raw.get("value", []), granularity)

        # Lightning from SMHI Lightning Archive
        try:
            radius = radius_km or settings.lightning.search_radius_km
            today = date.today()
            start = date(today.year - settings.lightning.years_back, today.month, 1)

            _logger.info(
                f"Fetching lightning data for ({lat}, {lon}), radius={radius}km, "
                f"date range: {start} to {today}, granularity={granularity.value}"
            )

            daily_counts = await self._lightning_client.get_strikes_in_range(
                lat,
                lon,
                radius,
                start,
                today,
            )

            _logger.info(
                f"Found {len(daily_counts)} days with lightning strikes (total {sum(daily_counts.values())} strikes)"
            )

            lightning_data = self._aggregate_lightning_strikes(daily_counts, granularity)

            _logger.info(f"Aggregated to {len(lightning_data)} data points at {granularity.value} granularity")
        except ValueError as e:
            _logger.warning(f"Could not get lightning data: {e}. Returning empty.", exc_info=True)
            lightning_data = []
        except Exception as e:
            _logger.error(f"Unexpected error fetching lightning data: {e}", exc_info=True)
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
