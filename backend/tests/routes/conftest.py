"""Test fixtures for route tests."""

from typing import Any, Generator
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from src.dependencies import get_forecast_service, get_geocoding_service, get_smhi_service
from src.main import V1_API_PREFIX, app
from src.services.forecast_service import ForecastService
from src.services.geocoding_service import GeocodingService
from src.services.smhi_service import SmhiService


@pytest.fixture(name="mock_smhi_service")
def mock_smhi_service_fixture() -> AsyncMock:
    return AsyncMock(spec=SmhiService)


@pytest.fixture(name="mock_geocoding_service")
def mock_geocoding_service_fixture() -> AsyncMock:
    return AsyncMock(spec=GeocodingService)


@pytest.fixture(name="mock_forecast_service")
def mock_forecast_service_fixture() -> AsyncMock:
    return AsyncMock(spec=ForecastService)


@pytest.fixture(name="client")
def client_fixture(
    mock_smhi_service: AsyncMock,
    mock_geocoding_service: AsyncMock,
    mock_forecast_service: AsyncMock,
) -> Generator[TestClient, Any, None]:
    app.dependency_overrides[get_smhi_service] = lambda: mock_smhi_service
    app.dependency_overrides[get_geocoding_service] = lambda: mock_geocoding_service
    app.dependency_overrides[get_forecast_service] = lambda: mock_forecast_service

    client = TestClient(app, raise_server_exceptions=False)
    client.base_url = f"{client.base_url}{V1_API_PREFIX}"  # type: ignore
    yield client
    app.dependency_overrides.clear()
