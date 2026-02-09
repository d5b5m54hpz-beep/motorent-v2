"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

type Props = {
  data: Array<{ estado: string; cantidad: number }>;
};

// Dark mode compatible colors with better contrast
const ESTADO_COLORS: Record<string, string> = {
  activo: "hsl(142, 71%, 45%)", // Verde más balanceado
  pendiente: "hsl(45, 93%, 47%)", // Amarillo/ámbar
  finalizado: "hsl(217, 91%, 60%)", // Azul más brillante
  cancelado: "hsl(0, 72%, 51%)", // Rojo balanceado
};

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  pendiente: "Pendiente",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export function ContratosChart({ data }: Props) {
  const chartData = data.map((item) => ({
    name: ESTADO_LABELS[item.estado] || item.estado,
    value: item.cantidad,
    estado: item.estado,
  }));

  // Show message if no data
  if (chartData.length === 0 || chartData.every((d) => d.value === 0)) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
        No hay datos de contratos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
          }
          outerRadius={90}
          innerRadius={0}
          paddingAngle={2}
          fill="hsl(var(--primary))"
          dataKey="value"
          animationBegin={0}
          animationDuration={800}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={ESTADO_COLORS[entry.estado] || "hsl(var(--primary))"}
              className="transition-opacity hover:opacity-80"
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
          itemStyle={{
            color: "hsl(var(--popover-foreground))",
            fontWeight: 500,
          }}
          formatter={(value: number) => [value, "Contratos"]}
          cursor={{ fill: "transparent" }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          wrapperStyle={{
            fontSize: "12px",
            color: "hsl(var(--foreground))",
            paddingTop: "8px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
