"use client";

import { useState } from "react";
import { Ship, Package, FolderOpen, TrendingUp, DollarSign, Settings, Users, Calculator } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmbarquesTab } from "@/components/pricing/embarques-tab";
import { CategoriasTab } from "@/components/pricing/categorias-tab";
import { ResumenTab } from "@/components/pricing/resumen-tab";
import { PreciosTab } from "@/components/pricing/precios-tab";
import { ReglasTab } from "@/components/pricing/reglas-tab";
import { GruposTab } from "@/components/pricing/grupos-tab";
import { CambiosBulkTab } from "@/components/pricing/cambios-bulk-tab";
import { SimuladorPrecio } from "@/components/pricing/simulador-precio";

export default function PricingRepuestosPage() {
  const [activeTab, setActiveTab] = useState("resumen");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Pricing</h1>
          <p className="text-muted-foreground">
            Motor de precios inteligente + costeo de importación
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-9 w-full">
          <TabsTrigger value="precios">
            <DollarSign className="mr-2 h-4 w-4" />
            Precios
          </TabsTrigger>
          <TabsTrigger value="reglas">
            <Settings className="mr-2 h-4 w-4" />
            Reglas
          </TabsTrigger>
          <TabsTrigger value="grupos">
            <Users className="mr-2 h-4 w-4" />
            Grupos
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Package className="mr-2 h-4 w-4" />
            Cambios Bulk
          </TabsTrigger>
          <TabsTrigger value="simulador">
            <Calculator className="mr-2 h-4 w-4" />
            Simulador
          </TabsTrigger>
          <TabsTrigger value="resumen">
            <Package className="mr-2 h-4 w-4" />
            Costeo
          </TabsTrigger>
          <TabsTrigger value="embarques">
            <Ship className="mr-2 h-4 w-4" />
            Embarques
          </TabsTrigger>
          <TabsTrigger value="categorias">
            <FolderOpen className="mr-2 h-4 w-4" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="historial">
            <TrendingUp className="mr-2 h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="precios" className="space-y-4">
          <PreciosTab />
        </TabsContent>

        <TabsContent value="reglas" className="space-y-4">
          <ReglasTab />
        </TabsContent>

        <TabsContent value="grupos" className="space-y-4">
          <GruposTab />
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <CambiosBulkTab />
        </TabsContent>

        <TabsContent value="simulador" className="space-y-4">
          <SimuladorPrecio />
        </TabsContent>

        <TabsContent value="resumen" className="space-y-4">
          <ResumenTab />
        </TabsContent>

        <TabsContent value="embarques" className="space-y-4">
          <EmbarquesTab />
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4">
          <CategoriasTab />
        </TabsContent>

        <TabsContent value="historial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Costos</CardTitle>
              <CardDescription>
                Evolución de costos de repuestos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Sistema de historial implementado
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
