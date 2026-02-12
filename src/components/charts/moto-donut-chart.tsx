"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "./chart-theme";

interface MotoDonutChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  height?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export function MotoDonutChart({ data, height = 300, centerLabel, centerValue }: MotoDonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || CHART_COLORS.series[index % CHART_COLORS.series.length]}
            />
          ))}
        </Pie>
        <Tooltip {...CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />

        {centerLabel && centerValue && (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
            <tspan x="50%" dy="-0.5em" fontSize="14" fill="#888">
              {centerLabel}
            </tspan>
            <tspan x="50%" dy="1.5em" fontSize="24" fontWeight="bold" fill="#5CE1E6">
              {centerValue}
            </tspan>
          </text>
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
