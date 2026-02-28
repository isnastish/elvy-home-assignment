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
} from "recharts";
import type { CombinedWeatherResponse } from "../types/weather";

interface WeatherChartProps {
  data: CombinedWeatherResponse;
}

export function WeatherChart({ data }: WeatherChartProps) {
  // Merge cloud cover and lightning data by period
  const periodMap = new Map<
    string,
    { period: string; cloud_cover?: number; lightning?: number }
  >();

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

  const chartData = Array.from(periodMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  );

  if (chartData.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-base">
        No data available for this location and granularity.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 text-sm text-gray-500 text-center">
        Station: <strong>{data.station_name}</strong> (ID: {data.station_id}) —{" "}
        {data.latitude.toFixed(4)}°N, {data.longitude.toFixed(4)}°E
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="period"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="left"
            domain={[0, 8]}
            label={{
              value: "Cloud Cover (oktas)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            label={{
              value: "Lightning Prob. (%)",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 12 },
            }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 16 }} />
          <Bar
            yAxisId="left"
            dataKey="cloud_cover"
            name="Cloud Cover (oktas)"
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
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
