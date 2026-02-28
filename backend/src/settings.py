from pydantic_settings import BaseSettings
from pydantic import Field


class AppSettings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = Field(default="SMHI Weather Analytics API")
    cors_origins: list[str] = Field(default=["http://localhost:3000", "http://localhost:5173"])
    smhi_cache_ttl_hours: int = Field(default=6)
    geocoding_user_agent: str = Field(default="smhi-weather-app/1.0")
    lightning_search_radius_km: float = Field(default=50.0, description="Radius in km for lightning strike search")

    model_config = {"env_nested_delimiter": "__"}


settings = AppSettings()
