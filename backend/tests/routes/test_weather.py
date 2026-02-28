"""Tests for weather routes."""

from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from src.models.weather import (
    CloudCoverResponse,
    CombinedWeatherResponse,
    Granularity,
    LightningResponse,
    WeatherDataPoint,
)


@pytest.mark.asyncio
async def test_get_cloud_cover(client: TestClient, mock_smhi_service: AsyncMock) -> None:
    """Test getting cloud cover data."""
    mock_smhi_service.get_cloud_cover.return_value = CloudCoverResponse(
        station_name="Stockholm-Observatoriekullen",
        station_id=98210,
        latitude=59.3419,
        longitude=18.0546,
        granularity=Granularity.MONTH,
        data=[
            WeatherDataPoint(period="2024-01", value=6.5),
            WeatherDataPoint(period="2024-02", value=5.8),
            WeatherDataPoint(period="2024-03", value=5.1),
        ],
    )

    response = client.get("/weather/cloud-cover", params={"lat": 59.33, "lon": 18.07, "granularity": "month"})

    assert response.status_code == 200
    data = response.json()
    assert data["station_name"] == "Stockholm-Observatoriekullen"
    assert len(data["data"]) == 3
    assert data["data"][0]["period"] == "2024-01"
    assert data["data"][0]["value"] == 6.5
    mock_smhi_service.get_cloud_cover.assert_called_once()


@pytest.mark.asyncio
async def test_get_lightning(client: TestClient, mock_smhi_service: AsyncMock) -> None:
    """Test getting lightning data."""
    mock_smhi_service.get_lightning.return_value = LightningResponse(
        station_name="Stockholm-Observatoriekullen",
        station_id=98210,
        latitude=59.3419,
        longitude=18.0546,
        granularity=Granularity.MONTH,
        data=[
            WeatherDataPoint(period="2024-06", value=8.33),
            WeatherDataPoint(period="2024-07", value=12.5),
        ],
    )

    response = client.get("/weather/lightning", params={"lat": 59.33, "lon": 18.07, "granularity": "month"})

    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 2
    assert data["data"][1]["value"] == 12.5
    mock_smhi_service.get_lightning.assert_called_once()


@pytest.mark.asyncio
async def test_get_combined_weather(client: TestClient, mock_smhi_service: AsyncMock) -> None:
    """Test getting combined weather data."""
    mock_smhi_service.get_combined_weather.return_value = CombinedWeatherResponse(
        station_name="Stockholm",
        station_id=98210,
        latitude=59.3419,
        longitude=18.0546,
        granularity=Granularity.MONTH,
        cloud_cover=[WeatherDataPoint(period="2024-01", value=6.5)],
        lightning=[WeatherDataPoint(period="2024-06", value=8.33)],
    )

    response = client.get("/weather/combined", params={"lat": 59.33, "lon": 18.07})

    assert response.status_code == 200
    data = response.json()
    assert "cloud_cover" in data
    assert "lightning" in data
    assert len(data["cloud_cover"]) == 1
    assert len(data["lightning"]) == 1


@pytest.mark.asyncio
async def test_get_cloud_cover_default_granularity(client: TestClient, mock_smhi_service: AsyncMock) -> None:
    """Test that default granularity is month."""
    mock_smhi_service.get_cloud_cover.return_value = CloudCoverResponse(
        station_name="Test",
        station_id=1,
        latitude=59.0,
        longitude=18.0,
        granularity=Granularity.MONTH,
        data=[],
    )

    response = client.get("/weather/cloud-cover", params={"lat": 59.0, "lon": 18.0})

    assert response.status_code == 200
    mock_smhi_service.get_cloud_cover.assert_called_once_with(59.0, 18.0, Granularity.MONTH)
