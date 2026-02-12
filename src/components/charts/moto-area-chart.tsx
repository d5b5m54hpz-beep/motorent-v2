"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from "./chart-theme";

interface MotoAreaChartProps {
  data: any[];
  areas: Array<{
    dataKey: string;
    name: string;
    color?: string;
  }>;
  xAxisKey?: string;
  stacked?: boolean;
  height?: number;
}

export function MotoAreaChart({
  data,
  areas,
  xAxisKey = "name",
  stacked = false,
  height = 300,
}: MotoAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          {areas.map((area, index) => (
            <linearGradient key={`gradient-${index}`} id={`color-${area.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={area.color || CHART_COLORS.series[index % CHART_COLORS.series.length]}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={area.color || CHART_COLORS.series[index % CHART_COLORS.series.length]}
                stopOpacity={0}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis dataKey={xAxisKey} stroke="#888" fontSize={12} />
        <YAxis stroke="#888" fontSize={12} />
        <Tooltip {...CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />

        {areas.map((area, index) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            stroke={area.color || CHART_COLORS.series[index % CHART_COLORS.series.length]}
            fill={`url(#color-${area.dataKey})`}
            fillOpacity={1}
            strokeWidth={2}
            name={area.name}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
