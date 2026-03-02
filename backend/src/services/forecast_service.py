"""AI-based forecasting service using scikit-learn."""

import logging

import numpy as np
from sklearn.linear_model import Ridge

from src.models.weather import (
    ForecastDataPoint,
    ForecastMetric,
    ForecastResponse,
    Granularity,
)
from src.services.smhi_service import SmhiService

_logger = logging.getLogger(__name__)

_MONTHS_PER_YEAR = 12  # Seasonal cycle length (monthly data → 12-month periodicity)
_MIN_HISTORICAL_MONTHS = 6  # Minimum months of data needed for a meaningful forecast
_RIDGE_ALPHA = 1.0  # Ridge regression regularization strength (higher = smoother)
_CONFIDENCE_INTERVAL_Z_SCORE = 1.96  # Z-score for 95% confidence interval (normal distribution)


class ForecastService:
    """Service for forecasting weather metrics using simple ML."""

    def __init__(self, smhi_service: SmhiService) -> None:
        self._smhi_service = smhi_service

    @staticmethod
    def _build_seasonal_features(
        n_points: int, periods_per_cycle: int = _MONTHS_PER_YEAR, start: int = 0
    ) -> np.ndarray:
        """Build feature matrix with trend + seasonal components.

        *start* lets you continue the time index from where training ended,
        so the same function can produce both training and forecast features.
        """
        t = np.arange(start, start + n_points, dtype=float)
        angle = 2 * np.pi * t / periods_per_cycle
        return np.column_stack(
            [
                t,
                np.sin(angle),
                np.cos(angle),
                np.sin(2 * angle),
                np.cos(2 * angle),
            ]
        )

    async def forecast(
        self,
        lat: float,
        lon: float,
        metric: ForecastMetric,
        months_ahead: int = 12,
    ) -> ForecastResponse:
        """Forecast cloud cover or lightning strike counts.

        Uses monthly historical data with a Ridge regression model
        capturing trend + seasonality.
        """
        match metric:
            case ForecastMetric.CLOUD_COVER:
                response = await self._smhi_service.get_cloud_cover(lat, lon, Granularity.MONTH)
                historical = response.data
                station_name = response.station_name
                station_id = response.station_id
            case ForecastMetric.LIGHTNING:
                lightning_resp = await self._smhi_service.get_lightning(lat, lon, Granularity.MONTH)
                historical = lightning_resp.data
                # Lightning responses don't have station_name/id — use placeholder
                station_name = f"Area ({lat:.2f}, {lon:.2f})"
                station_id = 0

        if len(historical) < _MIN_HISTORICAL_MONTHS:
            _logger.warning(
                f"Not enough data for meaningful forecast: {len(historical)} months "
                f"(need ≥{_MIN_HISTORICAL_MONTHS}). Returning empty forecast."
            )
            return ForecastResponse(
                station_name=station_name,
                station_id=station_id,
                metric=metric,
                historical=historical,
                forecast=[],
            )

        # Build model
        values = np.array([p.value for p in historical])
        n = len(values)

        X_train = self._build_seasonal_features(n)
        model = Ridge(alpha=_RIDGE_ALPHA)
        model.fit(X_train, values)

        # Predict on training data to get residual std
        train_pred = model.predict(X_train)
        residuals = values - train_pred
        residual_std = float(np.std(residuals))

        # Forecast future
        X_future = self._build_seasonal_features(months_ahead, start=n)
        future_pred = model.predict(X_future)

        # Generate period labels for forecast
        # Parse last historical period to continue
        last_period = historical[-1].period  # e.g. "2025-06"
        last_year, last_month = map(int, last_period.split("-"))

        forecast_points = []
        for i in range(months_ahead):
            month = last_month + 1 + i
            year = last_year + (month - 1) // 12
            month = ((month - 1) % 12) + 1
            period_label = f"{year:04d}-{month:02d}"

            predicted = float(future_pred[i])
            lower = round(max(predicted - _CONFIDENCE_INTERVAL_Z_SCORE * residual_std, 0), 2)
            upper = round(predicted + _CONFIDENCE_INTERVAL_Z_SCORE * residual_std, 2)

            forecast_points.append(
                ForecastDataPoint(
                    period=period_label,
                    predicted_value=round(predicted, 2),
                    lower_bound=lower,
                    upper_bound=upper,
                )
            )

        return ForecastResponse(
            station_name=station_name,
            station_id=station_id,
            metric=metric,
            historical=historical,
            forecast=forecast_points,
        )
