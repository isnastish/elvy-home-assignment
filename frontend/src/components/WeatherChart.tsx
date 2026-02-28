import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from "recharts";
import type { CombinedWeatherResponse } from "../types/weather";

interface WeatherChartProps {
  data: CombinedWeatherResponse;
}

/** Format period labels: "2024-01" → "Jan 2024", "2024-01-15" → "15 Jan 2024" */
function formatPeriodLabel(period: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = period.split("-");
  if (parts.length === 3) {
    return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
  }
  if (parts.length === 2) {
    return `${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
  }
  return period; // year only
}

/** Shortened label for X axis ticks */
function formatTickLabel(period: string): string {
  const parts = period.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (parts.length === 3) {
    return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
  }
  if (parts.length === 2) {
    return `${months[parseInt(parts[1]) - 1]} '${parts[0].slice(2)}`;
  }
  return period;
}

/** Compute a tick interval so we show at most ~MAX_TICKS labels */
function computeTickInterval(dataLength: number): number | "preserveStartEnd" {
  const MAX_TICKS = 16;
  if (dataLength <= MAX_TICKS) return 0; // show all
  return Math.ceil(dataLength / MAX_TICKS) - 1;
}

interface ChartDataPoint {
  period: string;
  cloud_cover?: number;
  lightning?: number;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !label) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1.5">{formatPeriodLabel(label)}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">
            {entry.dataKey === "cloud_cover"
              ? `Cloud Cover: ${entry.value}%`
              : `Lightning: ${entry.value}%`}
          </span>
        </p>
      ))}
    </div>
  );
}

export function WeatherChart({ data }: WeatherChartProps) {
  const chartData = useMemo(() => {
    const periodMap = new Map<string, ChartDataPoint>();

    for (const point of data.cloud_cover) {
      periodMap.set(point.period, {
        ...periodMap.get(point.period),
        period: point.period,
        cloud_cover: point.value,
      });
    }

    for (const point of data.lightning) {
      periodMap.set(point.period, {
        ...periodMap.get(point.period),
        period: point.period,
        lightning: point.value,
      });
    }

    return Array.from(periodMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    );
  }, [data]);

  const stats = useMemo(() => {
    const cloudValues = chartData.map((d) => d.cloud_cover).filter((v): v is number => v != null);
    const lightningValues = chartData.map((d) => d.lightning).filter((v): v is number => v != null);

    return {
      cloudAvg: cloudValues.length > 0 ? +(cloudValues.reduce((a, b) => a + b, 0) / cloudValues.length).toFixed(1) : null,
      cloudMin: cloudValues.length > 0 ? Math.min(...cloudValues) : null,
      cloudMax: cloudValues.length > 0 ? Math.max(...cloudValues) : null,
      lightningAvg: lightningValues.length > 0 ? +(lightningValues.reduce((a, b) => a + b, 0) / lightningValues.length).toFixed(1) : null,
      lightningMax: lightningValues.length > 0 ? Math.max(...lightningValues) : null,
      totalPoints: chartData.length,
      dateRange: chartData.length > 0 ? `${formatPeriodLabel(chartData[0].period)} – ${formatPeriodLabel(chartData[chartData.length - 1].period)}` : "",
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-base">
        No data available for this location and granularity.
      </div>
    );
  }

  const showBrush = chartData.length > 36;
  const tickInterval = computeTickInterval(chartData.length);

  return (
    <div>
      <div className="mb-3 text-sm text-gray-500 text-center">
        Station: <strong>{data.station_name}</strong> (ID: {data.station_id}) —{" "}
        {data.latitude.toFixed(4)}°N, {data.longitude.toFixed(4)}°E
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {stats.cloudAvg != null && (
          <div className="bg-blue-50 rounded-lg px-4 py-3 text-center">
            <div className="text-xs text-blue-400 uppercase tracking-wide font-medium">Avg Cloud Cover</div>
            <div className="text-xl font-bold text-blue-600 mt-1">{stats.cloudAvg}<span className="text-sm font-normal">%</span></div>
          </div>
        )}
        {stats.cloudMax != null && (
          <div className="bg-blue-50 rounded-lg px-4 py-3 text-center">
            <div className="text-xs text-blue-400 uppercase tracking-wide font-medium">Max Cloud Cover</div>
            <div className="text-xl font-bold text-blue-600 mt-1">{stats.cloudMax}<span className="text-sm font-normal">%</span></div>
          </div>
        )}
        {stats.lightningAvg != null && (
          <div className="bg-amber-50 rounded-lg px-4 py-3 text-center">
            <div className="text-xs text-amber-500 uppercase tracking-wide font-medium">Avg Lightning</div>
            <div className="text-xl font-bold text-amber-600 mt-1">{stats.lightningAvg}<span className="text-sm font-normal">%</span></div>
          </div>
        )}
        {stats.lightningMax != null && (
          <div className="bg-amber-50 rounded-lg px-4 py-3 text-center">
            <div className="text-xs text-amber-500 uppercase tracking-wide font-medium">Peak Lightning</div>
            <div className="text-xl font-bold text-amber-600 mt-1">{stats.lightningMax}<span className="text-sm font-normal">%</span></div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400 text-center mb-1">
        {stats.dateRange} — {stats.totalPoints} data points
        {showBrush && <span className="ml-1">(drag below chart to zoom)</span>}
      </div>

      <ResponsiveContainer width="100%" height={showBrush ? 450 : 400}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: showBrush ? 10 : 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="period"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={tickInterval}
            tick={{ fontSize: 11 }}
            tickFormatter={formatTickLabel}
          />
          <YAxis
            yAxisId="left"
            domain={[0, 100]}
            label={{
              value: "Cloud Cover (%)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, "auto"]}
            label={{
              value: "Lightning Prob. (%)",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 16 }} />

          {/* Average reference lines */}
          {stats.cloudAvg != null && (
            <ReferenceLine
              yAxisId="left"
              y={stats.cloudAvg}
              stroke="#3b82f6"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{ value: `avg ${stats.cloudAvg}%`, position: "left", fontSize: 10, fill: "#3b82f6" }}
            />
          )}

          <Bar
            yAxisId="left"
            dataKey="cloud_cover"
            name="Cloud Cover (%)"
            fill="#64b5f6"
            radius={[4, 4, 0, 0]}
            opacity={0.8}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="lightning"
            name="Lightning Probability (%)"
            stroke="#ffa726"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
          />

          {showBrush && (
            <Brush
              dataKey="period"
              height={30}
              stroke="#94a3b8"
              tickFormatter={formatTickLabel}
              startIndex={Math.max(0, chartData.length - 36)}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
