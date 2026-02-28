import { useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ForecastResponse } from "../types/weather";

interface ForecastPanelProps {
  forecastData: ForecastResponse | null;
  loading: boolean;
  onFetchForecast: (metric: string) => void;
}

export function ForecastPanel({
  forecastData,
  loading,
  onFetchForecast,
}: ForecastPanelProps) {
  const [metric, setMetric] = useState<"cloud_cover" | "lightning">(
    "cloud_cover"
  );

  // Build chart data combining historical and forecast
  const chartData: Array<{
    period: string;
    historical?: number;
    predicted?: number;
    lower_bound?: number;
    upper_bound?: number;
    confidence_range?: [number, number];
  }> = [];

  if (forecastData) {
    // Take last 24 months of historical data for context
    const recentHistorical = forecastData.historical.slice(-24);
    for (const point of recentHistorical) {
      chartData.push({ period: point.period, historical: point.value });
    }
    for (const point of forecastData.forecast) {
      chartData.push({
        period: point.period,
        predicted: point.predicted_value,
        lower_bound: point.lower_bound,
        upper_bound: point.upper_bound,
        confidence_range: [point.lower_bound, point.upper_bound],
      });
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid #e8e8e8",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, color: "#333" }}>
          AI Forecast
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={metric}
            onChange={(e) =>
              setMetric(e.target.value as "cloud_cover" | "lightning")
            }
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              fontSize: 14,
            }}
          >
            <option value="cloud_cover">Cloud Cover</option>
            <option value="lightning">Lightning</option>
          </select>
          <button
            onClick={() => onFetchForecast(metric)}
            disabled={loading}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: "none",
              background: loading ? "#ccc" : "#7c3aed",
              color: "#fff",
              cursor: loading ? "default" : "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {loading ? "Forecasting..." : "Generate Forecast"}
          </button>
        </div>
      </div>

      {forecastData && chartData.length > 0 && (
        <>
          <div
            style={{
              fontSize: 13,
              color: "#888",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Forecast for {forecastData.station_name} — {forecastData.metric}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="period"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10 }}
              />
              <YAxis />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e0e0e0",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="historical"
                name="Historical"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted"
                stroke="#7c3aed"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
              <Area
                type="monotone"
                dataKey="confidence_range"
                name="95% Confidence"
                fill="#7c3aed"
                fillOpacity={0.1}
                stroke="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}

      {!forecastData && !loading && (
        <div style={{ textAlign: "center", padding: 30, color: "#aaa" }}>
          Select a metric and click "Generate Forecast" to see AI predictions.
        </div>
      )}
    </div>
  );
}
