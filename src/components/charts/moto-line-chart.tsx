"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "./chart-theme";

interface MotoLineChartProps {
  data: any[];
  lines: Array<{
    dataKey: string;
    name: string;
    color?: string;
  }>;
  xAxisKey?: string;
  comparePeriod?: boolean;
  compareData?: any[];
  height?: number;
}

export function MotoLineChart({
  data,
  lines,
  xAxisKey = "name",
  comparePeriod = false,
  compareData = [],
  height = 300,
}: MotoLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis dataKey={xAxisKey} stroke="#888" fontSize={12} />
        <YAxis stroke="#888" fontSize={12} />
        <Tooltip {...CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />

        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color || CHART_COLORS.series[index % CHART_COLORS.series.length]}
            strokeWidth={2}
            name={line.name}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}

        {comparePeriod && compareData.length > 0 && (
          <Line
            type="monotone"
            dataKey="compare"
            stroke={CHART_COLORS.series[0]}
            strokeWidth={1}
            strokeDasharray="5 5"
            name="Período anterior"
            opacity={0.5}
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
