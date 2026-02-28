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

    def test_thunder_monthly_probability_january(self) -> None:
        """Test monthly probability uses actual days in month (Jan=31)."""
        raw = [
            {"date": 1704067200000, "value": "3"},  # 3 thunder days in Jan 2024
        ]
        result = SmhiService._aggregate_thunder_as_probability(raw, Granularity.MONTH)
        assert len(result) == 1
        assert result[0].period == "2024-01"
        # 3 / 31 * 100 ≈ 9.68%
        assert result[0].value == 9.68

    def test_thunder_monthly_probability_february_leap(self) -> None:
        """Test Feb in leap year uses 29 days."""
        # Feb 1, 2024 00:00 UTC = 1706745600000ms  (2024 is a leap year)
        raw = [
            {"date": 1706745600000, "value": "2"},
        ]
        result = SmhiService._aggregate_thunder_as_probability(raw, Granularity.MONTH)
        assert len(result) == 1
        assert result[0].period == "2024-02"
        # 2 / 29 * 100 ≈ 6.9%
        assert result[0].value == 6.9

    def test_thunder_yearly_probability(self) -> None:
        """Test yearly aggregation sums thunder days and divides by days in year."""
        raw = [
            {"date": 1704067200000, "value": "2"},   # Jan 2024 – 2 thunder days
            {"date": 1719792000000, "value": "5"},   # Jul 2024 – 5 thunder days
        ]
        result = SmhiService._aggregate_thunder_as_probability(raw, Granularity.YEAR)
        assert len(result) == 1
        assert result[0].period == "2024"
        # 2024 is a leap year → 366 days.  7 / 366 * 100 ≈ 1.91%
        assert result[0].value == 1.91

    def test_thunder_yearly_non_leap(self) -> None:
        """Test yearly aggregation in a non-leap year uses 365 days."""
        # Jan 1, 2023 00:00 UTC = 1672531200000ms
        raw = [
            {"date": 1672531200000, "value": "10"},  # Jan 2023
        ]
        result = SmhiService._aggregate_thunder_as_probability(raw, Granularity.YEAR)
        assert len(result) == 1
        assert result[0].period == "2023"
        # 10 / 365 * 100 ≈ 2.74%
        assert result[0].value == 2.74

    def test_thunder_daily_falls_back_to_monthly(self) -> None:
        """DAY granularity falls back to MONTH since thunder data is monthly."""
        raw = [
            {"date": 1704067200000, "value": "3"},  # Jan 2024
        ]
        result = SmhiService._aggregate_thunder_as_probability(raw, Granularity.DAY)
        assert len(result) == 1
        # Should produce monthly key, not daily
        assert result[0].period == "2024-01"
        # 3 / 31 * 100 ≈ 9.68%
        assert result[0].value == 9.68

    def test_thunder_capped_at_100(self) -> None:
        """Probability should never exceed 100%."""
        # Feb 1, 2023 = 1675209600000ms  (non-leap, 28 days)
        raw = [
            {"date": 1675209600000, "value": "30"},  # 30 thunder days (impossible but tests cap)
        ]
        result = SmhiService._aggregate_thunder_as_probability(raw, Granularity.MONTH)
        assert result[0].value == 100.0

    def test_thunder_empty(self) -> None:
        """Test with no thunder data."""
        result = SmhiService._aggregate_thunder_as_probability([], Granularity.MONTH)
        assert result == []
