"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "./chart-theme";

interface MotoBarChartProps {
  data: any[];
  bars: Array<{
    dataKey: string;
    name: string;
    color?: string;
  }>;
  xAxisKey?: string;
  stacked?: boolean;
  horizontal?: boolean;
  comparePeriod?: boolean;
  height?: number;
}

export function MotoBarChart({
  data,
  bars,
  xAxisKey = "name",
  stacked = false,
  horizontal = false,
  comparePeriod = false,
  height = 300,
}: MotoBarChartProps) {
  const ChartComponent = horizontal ? BarChart : BarChart;
  const xProps = horizontal ? { type: "number" as const } : { dataKey: xAxisKey };
  const yProps = horizontal ? { dataKey: xAxisKey, type: "category" as const } : {};

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent data={data} layout={horizontal ? "vertical" : "horizontal"}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis {...xProps} stroke="#888" fontSize={12} />
        <YAxis {...yProps} stroke="#888" fontSize={12} />
        <Tooltip {...CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />

        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            fill={bar.color || CHART_COLORS.series[index % CHART_COLORS.series.length]}
            name={bar.name}
            stackId={stacked ? "stack" : undefined}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </ChartComponent>
    </ResponsiveContainer>
  );
}
