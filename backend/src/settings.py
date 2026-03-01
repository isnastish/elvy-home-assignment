import json
from pathlib import Path
from typing import Any, Tuple, Type

from pydantic import BaseModel, Field, field_validator
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
    YamlConfigSettingsSource,
)


class CustomYamlConfigSettingsSource(YamlConfigSettingsSource):
    """Custom YAML settings source that loads from settings.yaml."""

    def __init__(self, settings_cls: Type[BaseSettings]) -> None:
        yaml_file = Path(__file__).parent.parent / "settings.yaml"
        super().__init__(settings_cls, yaml_file=yaml_file)


class YamlSettings(BaseSettings):
    """Base settings class that loads from YAML file with environment variable overrides."""

    model_config = SettingsConfigDict(
        yaml_file="settings.yaml",
        extra="ignore",
        env_nested_delimiter="__",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: Type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> Tuple[PydanticBaseSettingsSource, ...]:
        """Customize settings sources: init -> env -> YAML."""
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            CustomYamlConfigSettingsSource(settings_cls),
        )


class CorsSettings(BaseModel):
    """CORS configuration settings."""

    origins: list[str] = Field(..., description="Allowed CORS origins")

    @field_validator("origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Parse CORS_ORIGINS from JSON string if needed."""
        if isinstance(v, str):
            # Try to parse as JSON array (from environment variable)
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                # If not JSON, treat as comma-separated string
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


class SmhiParametersSettings(BaseModel):
    """SMHI API parameter IDs."""

    cloud_cover: int = Field(..., description="Total cloud cover parameter ID (percent 0–100)")


class SmhiSettings(BaseModel):
    """SMHI API configuration settings."""

    base_url: str = Field(..., description="Base URL for SMHI Metobs API")
    lightning_base_url: str = Field(..., description="Base URL for SMHI Lightning Archive API")
    cache_ttl_hours: int = Field(..., description="Cache TTL in hours for SMHI API responses")
    max_years_history: int = Field(
        ..., description="Maximum years of historical data to fetch (for performance optimization)"
    )
    parameters: SmhiParametersSettings = Field(..., description="SMHI API parameter IDs")


class LightningSettings(BaseModel):
    """Lightning Archive configuration settings."""

    search_radius_km: float = Field(
        ..., description="Default search radius in kilometers for lightning strike proximity search"
    )
    years_back: int = Field(..., description="Number of years of historical lightning data to fetch")


class GeocodingSettings(BaseModel):
    """Geocoding service configuration settings."""

    service_url: str = Field(..., description="Geocoding service URL (Nominatim)")
    user_agent: str = Field(..., description="User-Agent header for geocoding requests")
    country_codes: list[str] = Field(..., description="Country codes to bias geocoding results (ISO 3166-1 alpha-2)")
    limit: int = Field(..., description="Maximum number of geocoding results to return")


class AppSettings(YamlSettings):
    """Application settings loaded from YAML file with environment variable overrides."""

    cors: CorsSettings = Field(..., description="CORS configuration")
    smhi: SmhiSettings = Field(..., description="SMHI API configuration")
    lightning: LightningSettings = Field(..., description="Lightning Archive configuration")
    geocoding: GeocodingSettings = Field(..., description="Geocoding service configuration")


# Settings are loaded from settings.yaml via YamlConfigSettingsSource
# The linter error is a false positive - pydantic-settings loads from YAML at runtime
settings = AppSettings()  # type: ignore[call-arg]
