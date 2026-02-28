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
  ReferenceLine,
} from "recharts";
import type { ForecastResponse } from "../types/weather";

interface ForecastPanelProps {
  forecastData: ForecastResponse | null;
  loading: boolean;
  onFetchForecast: (metric: string) => void;
}

/** Format period labels: "2024-01" → "Jan 2024" */
function formatPeriodLabel(period: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = period.split("-");
  if (parts.length >= 2) {
    return `${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
  }
  return period;
}

function formatTickLabel(period: string): string {
  const parts = period.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (parts.length >= 2) {
    return `${months[parseInt(parts[1]) - 1]} '${parts[0].slice(2)}`;
  }
  return period;
}

function metricLabel(metric: string): string {
  return metric === "cloud_cover" ? "Cloud Cover (%)" : "Lightning Probability (%)";
}

function metricUnit(_metric: string): string {
  return "%";
}

interface ForecastChartPoint {
  period: string;
  historical?: number;
  predicted?: number;
  lower_bound?: number;
  upper_bound?: number;
  confidence_range?: [number, number];
}

function CustomTooltip({ active, payload, label, metric }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number | [number, number]; color: string; name: string }>;
  label?: string;
  metric?: string;
}) {
  if (!active || !payload || !label) return null;

  const unit = metric ? metricUnit(metric) : "";

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1.5">{formatPeriodLabel(label)}</p>
      {payload.map((entry) => {
        if (entry.dataKey === "confidence_range") {
          const range = entry.value as [number, number];
          return (
            <p key={entry.dataKey} className="text-gray-500 text-xs py-0.5">
              95% CI: {range[0]} – {range[1]}{unit}
            </p>
          );
        }
        return (
          <p key={entry.dataKey} className="flex items-center gap-2 py-0.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">
              {entry.name}: {entry.value as number}{unit}
            </span>
          </p>
        );
      })}
    </div>
  );
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
  const chartData: ForecastChartPoint[] = [];
  let boundaryPeriod: string | null = null;

  if (forecastData) {
    // Take last 24 months of historical data for context
    const recentHistorical = forecastData.historical.slice(-24);
    for (const point of recentHistorical) {
      chartData.push({ period: point.period, historical: point.value });
    }

    // Bridge: last historical point also gets predicted value so lines connect
    if (recentHistorical.length > 0 && forecastData.forecast.length > 0) {
      const lastHist = recentHistorical[recentHistorical.length - 1];
      boundaryPeriod = lastHist.period;
      chartData[chartData.length - 1] = {
        ...chartData[chartData.length - 1],
        predicted: lastHist.value,
      };
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
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            AI Forecast
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Ridge regression with seasonal decomposition</p>
        </div>
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
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Forecasting...
              </span>
            ) : (
              "Generate Forecast"
            )}
          </button>
        </div>
      </div>

      {forecastData && chartData.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg px-4 py-2 text-center flex-1 min-w-[120px]">
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">Metric</div>
              <div className="text-sm font-semibold text-gray-700 mt-0.5">{metricLabel(forecastData.metric)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-2 text-center flex-1 min-w-[120px]">
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">Historical Points</div>
              <div className="text-sm font-semibold text-gray-700 mt-0.5">{forecastData.historical.length}</div>
            </div>
            <div className="bg-violet-50 rounded-lg px-4 py-2 text-center flex-1 min-w-[120px]">
              <div className="text-xs text-violet-400 uppercase tracking-wide font-medium">Forecast</div>
              <div className="text-sm font-semibold text-violet-700 mt-0.5">{forecastData.forecast.length} months</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-2 text-center flex-1 min-w-[120px]">
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">Station</div>
              <div className="text-sm font-semibold text-gray-700 mt-0.5">{forecastData.station_name}</div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
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
                tickFormatter={formatTickLabel}
              />
              <YAxis
                label={{
                  value: metricLabel(forecastData.metric),
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#888" },
                }}
              />
              <Tooltip content={<CustomTooltip metric={forecastData.metric} />} />
              <Legend />

              {/* Boundary line between historical and forecast */}
              {boundaryPeriod && (
                <ReferenceLine
                  x={boundaryPeriod}
                  stroke="#9ca3af"
                  strokeDasharray="4 4"
                  label={{ value: "Forecast →", position: "top", fontSize: 10, fill: "#9ca3af" }}
                />
              )}

              <Area
                type="monotone"
                dataKey="confidence_range"
                name="95% Confidence"
                fill="#7c3aed"
                fillOpacity={0.1}
                stroke="none"
              />
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
