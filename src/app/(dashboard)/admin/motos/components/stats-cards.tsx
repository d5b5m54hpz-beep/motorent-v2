"use client";

import { Bike, CheckCircle2, Clock, Wrench, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

type StatsCardsProps = {
  total: number;
  disponibles: number;
  alquiladas: number;
  mantenimiento: number;
  baja: number;
  onFilterByEstado?: (estado: string) => void;
};

export function StatsCards({
  total,
  disponibles,
  alquiladas,
  mantenimiento,
  baja,
  onFilterByEstado,
}: StatsCardsProps) {
  const stats = [
    {
      label: "Total",
      value: total,
      icon: Bike,
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      clickable: false,
    },
    {
      label: "Disponibles",
      value: disponibles,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950",
      estado: "disponible",
      clickable: true,
    },
    {
      label: "Alquiladas",
      value: alquiladas,
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      estado: "alquilada",
      clickable: true,
    },
    {
      label: "Mantenimiento",
      value: mantenimiento,
      icon: Wrench,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950",
      estado: "mantenimiento",
      clickable: true,
    },
    {
      label: "Baja",
      value: baja,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950",
      estado: "baja",
      clickable: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isClickable = stat.clickable && onFilterByEstado;

        return (
          <Card
            key={stat.label}
            className={`p-4 ${
              isClickable
                ? "cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                : ""
            }`}
            onClick={() => {
              if (isClickable && stat.estado) {
                onFilterByEstado(stat.estado);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`rounded-full p-3 ${stat.bgColor}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
