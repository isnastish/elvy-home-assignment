"""Business logic for aggregating SMHI weather data."""

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
    def _aggregate_thunder_as_probability(
        raw_values: list[dict],
        granularity: Granularity,
    ) -> list[WeatherDataPoint]:
        """Aggregate thunder day data as probability percentage.

        Thunder days parameter gives count of days with thunder per month.
        We convert to probability: (thunder_days / days_in_period) * 100.
        """
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
            if granularity == Granularity.MONTH:
                # Thunder days per month → probability of thunder on any given day
                avg_thunder_days = sum(values) / len(values)
                # Estimate ~30 days per month
                probability = round(min((avg_thunder_days / 30.0) * 100, 100), 2)
            elif granularity == Granularity.YEAR:
                # Sum thunder days across the year, divide by 365
                total_thunder_days = sum(values)
                probability = round(min((total_thunder_days / 365.0) * 100, 100), 2)
            else:
                # Day granularity: for thunder days data, we get monthly counts
                # so we spread the probability across days
                avg_val = sum(values) / len(values)
                probability = round(min((avg_val / 30.0) * 100, 100), 2)

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
