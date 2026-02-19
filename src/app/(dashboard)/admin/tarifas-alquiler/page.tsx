"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, BookOpen, Calculator, Settings2 } from "lucide-react";
import { DashboardTab } from "./components/DashboardTab";
import { PlanesTab } from "./components/PlanesTab";
import { SimuladorTab } from "./components/SimuladorTab";
import { CostosTab } from "./components/CostosTab";

export default function TarifasAlquilerPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tarifas de Alquiler</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestión de precios, planes y simulación financiera de alquiler de motos
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="planes" className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Planes</span>
          </TabsTrigger>
          <TabsTrigger value="simulador" className="flex items-center gap-2">
            <Calculator className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Simulador</span>
          </TabsTrigger>
          <TabsTrigger value="costos" className="flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Costos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>

        <TabsContent value="planes">
          <PlanesTab />
        </TabsContent>

        <TabsContent value="simulador">
          <SimuladorTab />
        </TabsContent>

        <TabsContent value="costos">
          <CostosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
