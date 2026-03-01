from enum import StrEnum

from pydantic import BaseModel, Field


class Granularity(StrEnum):
    DAY = "day"
    MONTH = "month"
    YEAR = "year"


class WeatherDataPoint(BaseModel):
    """A single data point for weather visualization."""

    period: str = Field(description="Time period label (e.g. '2024-01', '2024-01-15', '2024')")
    value: float = Field(description="The aggregated value for this period")


class CloudCoverResponse(BaseModel):
    """Response containing cloud cover data."""

    station_name: str
    station_id: int
    latitude: float
    longitude: float
    parameter_description: str = "Total cloud cover (percent, 0-100%)"
    granularity: Granularity
    data: list[WeatherDataPoint]


class LightningResponse(BaseModel):
    """Response containing lightning strike count data."""

    latitude: float
    longitude: float
    radius_km: float = Field(description="Search radius in km around the location")
    parameter_description: str = "Lightning strike count (SMHI Lightning Archive)"
    granularity: Granularity
    data: list[WeatherDataPoint]


class CombinedWeatherResponse(BaseModel):
    """Combined cloud cover and lightning response for a location."""

    station_name: str
    station_id: int
    latitude: float
    longitude: float
    granularity: Granularity
    cloud_cover: list[WeatherDataPoint] = Field(description="Cloud cover data (percent, 0-100%)")
    lightning: list[WeatherDataPoint] = Field(description="Lightning strike counts near the location")


class ForecastDataPoint(BaseModel):
    """A forecasted data point."""

    period: str
    predicted_value: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    """Response containing AI forecast data."""

    station_name: str
    station_id: int
    metric: str = Field(description="What is being forecasted: 'cloud_cover' or 'lightning'")
    historical: list[WeatherDataPoint]
    forecast: list[ForecastDataPoint]
