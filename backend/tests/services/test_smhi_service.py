"""Tests for SMHI service aggregation logic."""

from datetime import date

from src.models.weather import Granularity
from src.services.smhi_service import SmhiService


class TestAggregateValues:
    """Tests for the SmhiService._aggregate_values method."""

    def test_aggregate_by_month(self) -> None:
        """Test monthly aggregation of raw values."""
        # Jan 1, 2024 00:00 UTC = 1704067200000ms
        # Jan 2, 2024 00:00 UTC = 1704153600000ms
        raw = [
            {"date": 1704067200000, "value": "6.0"},
            {"date": 1704153600000, "value": "4.0"},
        ]
        result = SmhiService._aggregate_values(raw, Granularity.MONTH)
        assert len(result) == 1
        assert result[0].period == "2024-01"
        assert result[0].value == 5.0  # mean of 6 and 4

    def test_aggregate_by_year(self) -> None:
        """Test yearly aggregation."""
        raw = [
            {"date": 1704067200000, "value": "6.0"},  # Jan 2024
            {"date": 1719792000000, "value": "4.0"},  # Jul 2024 (approx)
        ]
        result = SmhiService._aggregate_values(raw, Granularity.YEAR)
        assert len(result) == 1
        assert result[0].period == "2024"
        assert result[0].value == 5.0

    def test_aggregate_skips_invalid_values(self) -> None:
        """Test that invalid values are skipped."""
        raw = [
            {"date": 1704067200000, "value": "6.0"},
            {"date": 1704153600000, "value": "invalid"},
            {"date": 1704240000000, "value": None},
        ]
        result = SmhiService._aggregate_values(raw, Granularity.MONTH)
        assert len(result) == 1
        assert result[0].value == 6.0

    def test_aggregate_empty_input(self) -> None:
        """Test with empty input."""
        result = SmhiService._aggregate_values([], Granularity.MONTH)
        assert result == []


class TestAggregateLightningStrikes:
    """Tests for the SmhiService._aggregate_lightning_strikes method."""

    def test_aggregate_daily(self) -> None:
        """Each day's count is kept as-is."""
        daily = {
            date(2024, 7, 15): 42,
            date(2024, 7, 16): 10,
        }
        result = SmhiService._aggregate_lightning_strikes(daily, Granularity.DAY)
        assert len(result) == 2
        assert result[0].period == "2024-07-15"
        assert result[0].value == 42.0
        assert result[1].period == "2024-07-16"
        assert result[1].value == 10.0

    def test_aggregate_monthly(self) -> None:
        """Days in the same month are summed."""
        daily = {
            date(2024, 7, 15): 20,
            date(2024, 7, 20): 30,
            date(2024, 8, 1): 5,
        }
        result = SmhiService._aggregate_lightning_strikes(daily, Granularity.MONTH)
        assert len(result) == 2
        assert result[0].period == "2024-07"
        assert result[0].value == 50.0  # 20 + 30
        assert result[1].period == "2024-08"
        assert result[1].value == 5.0

    def test_aggregate_yearly(self) -> None:
        """All days in a year are summed."""
        daily = {
            date(2024, 1, 10): 3,
            date(2024, 7, 15): 100,
            date(2024, 7, 16): 50,
        }
        result = SmhiService._aggregate_lightning_strikes(daily, Granularity.YEAR)
        assert len(result) == 1
        assert result[0].period == "2024"
        assert result[0].value == 153.0

    def test_aggregate_empty(self) -> None:
        """Empty input returns empty list."""
        result = SmhiService._aggregate_lightning_strikes({}, Granularity.MONTH)
        assert result == []

    def test_aggregate_sorted(self) -> None:
        """Results are sorted by period."""
        daily = {
            date(2024, 12, 1): 1,
            date(2024, 1, 1): 2,
            date(2024, 6, 1): 3,
        }
        result = SmhiService._aggregate_lightning_strikes(daily, Granularity.MONTH)
        periods = [r.period for r in result]
        assert periods == ["2024-01", "2024-06", "2024-12"]
