"""Custom exception types."""


class SmhiApiError(Exception):
    """Error communicating with SMHI API."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class GeocodingError(Exception):
    """Error geocoding an address."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class StationNotFoundError(Exception):
    """No station found near the given location."""

    def __init__(self, lat: float, lon: float) -> None:
        self.lat = lat
        self.lon = lon
        self.message = f"No weather station found near ({lat}, {lon})"
        super().__init__(self.message)
