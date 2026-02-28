"""Dependency injection for FastAPI routes."""

from src.services.forecast_service import ForecastService
from src.services.geocoding_service import GeocodingService
from src.services.lightning_client import LightningClient
from src.services.smhi_client import SmhiClient
from src.services.smhi_service import SmhiService

# Singleton instances
_smhi_client = SmhiClient()
_lightning_client = LightningClient()
_smhi_service = SmhiService(_smhi_client, _lightning_client)
_geocoding_service = GeocodingService()
_forecast_service = ForecastService(_smhi_service)


def get_smhi_service() -> SmhiService:
    return _smhi_service


def get_geocoding_service() -> GeocodingService:
    return _geocoding_service


def get_forecast_service() -> ForecastService:
    return _forecast_service
