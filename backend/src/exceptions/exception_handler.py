"""Exception handlers for the FastAPI application."""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.exceptions.errors import GeocodingError, SmhiApiError, StationNotFoundError

_logger = logging.getLogger(__name__)


def smhi_api_exception_handler(request: Request, exc: SmhiApiError) -> JSONResponse:
    _logger.error(f"SMHI API error: {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={"detail": f"SMHI API error: {exc.message}"},
    )


def geocoding_exception_handler(request: Request, exc: GeocodingError) -> JSONResponse:
    _logger.error(f"Geocoding error: {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": f"Geocoding error: {exc.message}"},
    )


def station_not_found_exception_handler(request: Request, exc: StationNotFoundError) -> JSONResponse:
    _logger.warning(f"Station not found: {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": exc.message},
    )


def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    _logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc.errors())},
    )


def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    _logger.error(f"Server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""
    app.add_exception_handler(SmhiApiError, smhi_api_exception_handler)  # type: ignore
    app.add_exception_handler(GeocodingError, geocoding_exception_handler)  # type: ignore
    app.add_exception_handler(StationNotFoundError, station_not_found_exception_handler)  # type: ignore
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore
    app.add_exception_handler(Exception, generic_exception_handler)
