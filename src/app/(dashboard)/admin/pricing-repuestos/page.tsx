"use client";

import { useState } from "react";
import { BarChart3, DollarSign, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardTab } from "@/components/precios-v2/dashboard-tab";
import { ListaPreciosTab } from "@/components/precios-v2/lista-precios-tab";
import { HistorialTab } from "@/components/precios-v2/historial-tab";

export default function PricingRepuestosPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestión de Precios — Repuestos
          </h1>
          <p className="text-muted-foreground">
            Motor de precios inteligente con sugerencias automáticas
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="dashboard">
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="lista">
            <DollarSign className="mr-2 h-4 w-4" />
            Lista de Precios
          </TabsTrigger>
          <TabsTrigger value="historial">
            <History className="mr-2 h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <DashboardTab />
        </TabsContent>

        <TabsContent value="lista" className="space-y-4">
          <ListaPreciosTab />
        </TabsContent>

        <TabsContent value="historial" className="space-y-4">
          <HistorialTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
