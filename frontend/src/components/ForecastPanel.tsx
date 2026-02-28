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
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          AI Forecast
        </h3>
        <div className="flex gap-2">
          <select
            value={metric}
            onChange={(e) =>
              setMetric(e.target.value as "cloud_cover" | "lightning")
            }
            className="px-3 py-2 rounded-md border border-gray-300 text-sm"
          >
            <option value="cloud_cover">Cloud Cover</option>
            <option value="lightning">Lightning</option>
          </select>
          <button
            onClick={() => onFetchForecast(metric)}
            disabled={loading}
            className={`px-5 py-2 rounded-md border-none text-white text-sm font-medium transition-colors ${
              loading
                ? "bg-gray-300 cursor-default"
                : "bg-violet-600 cursor-pointer hover:bg-violet-700"
            }`}
          >
            {loading ? "Forecasting..." : "Generate Forecast"}
          </button>
        </div>
      </div>

      {forecastData && chartData.length > 0 && (
        <>
          <div className="text-xs text-gray-400 mb-2 text-center">
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
        <div className="text-center py-8 text-gray-300">
          Select a metric and click "Generate Forecast" to see AI predictions.
        </div>
      )}
    </div>
  );
}
