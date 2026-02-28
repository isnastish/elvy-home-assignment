"""Tests for SMHI service aggregation logic."""

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


class TestAggregateThunder:
    """Tests for thunder probability aggregation."""

    def test_thunder_monthly_probability(self) -> None:
        """Test monthly thunder probability calculation."""
        raw = [
            {"date": 1704067200000, "value": "3"},  # 3 thunder days in Jan 2024
        ]
        result = SmhiService._aggregate_thunder_as_probability(raw, Granularity.MONTH)
        assert len(result) == 1
        assert result[0].period == "2024-01"
        # 3/30 * 100 = 10%
        assert result[0].value == 10.0

    def test_thunder_empty(self) -> None:
        """Test with no thunder data."""
        result = SmhiService._aggregate_thunder_as_probability([], Granularity.MONTH)
        assert result == []
