"""Tests for location routes."""

from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from src.models.location import GeocodeResponse, GeocodeResult, Station


@pytest.mark.asyncio
async def test_geocode_address(client: TestClient, mock_geocoding_service: AsyncMock) -> None:
    """Test geocoding an address."""
    mock_geocoding_service.geocode.return_value = GeocodeResponse(
        results=[
            GeocodeResult(
                display_name="Stockholm, Sweden",
                latitude=59.3293,
                longitude=18.0686,
            ),
        ]
    )

    response = client.get("/locations/geocode", params={"address": "Stockholm"})

    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["display_name"] == "Stockholm, Sweden"
    assert data["results"][0]["latitude"] == 59.3293


@pytest.mark.asyncio
async def test_get_nearest_stations(client: TestClient, mock_smhi_service: AsyncMock) -> None:
    """Test finding nearest stations."""
    mock_smhi_service.find_nearest_stations.return_value = [
        Station(
            id=98210,
            name="Stockholm-Observatoriekullen",
            latitude=59.3419,
            longitude=18.0546,
            distance_km=1.2,
            active=True,
        ),
        Station(id=98230, name="Stockholm-Bromma", latitude=59.3536, longitude=17.9514, distance_km=5.3, active=True),
    ]

    response = client.get("/locations/stations", params={"lat": 59.33, "lon": 18.07})

    assert response.status_code == 200
    data = response.json()
    assert len(data["stations"]) == 2
    assert data["selected_station"]["id"] == 98210
    assert data["selected_station"]["active"] is True
