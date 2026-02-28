from pydantic import BaseModel, Field


class GeocodeResult(BaseModel):
    """A geocoded location result."""

    display_name: str = Field(description="Full display name of the location")
    latitude: float = Field(description="Latitude")
    longitude: float = Field(description="Longitude")


class GeocodeResponse(BaseModel):
    """Response containing geocoded location results."""

    results: list[GeocodeResult]


class Station(BaseModel):
    """An SMHI weather station."""

    id: int = Field(description="Station ID")
    name: str = Field(description="Station name")
    latitude: float = Field(description="Station latitude")
    longitude: float = Field(description="Station longitude")
    distance_km: float = Field(description="Distance from requested location in km")
    active: bool = Field(description="Whether the station is currently active")


class StationsResponse(BaseModel):
    """Response containing nearby SMHI stations."""

    stations: list[Station]
    selected_station: Station = Field(description="The nearest active station selected for data retrieval")
