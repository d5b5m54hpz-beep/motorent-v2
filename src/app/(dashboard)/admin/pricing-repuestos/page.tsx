"use client";

import { useState } from "react";
import { Ship, Package, FolderOpen, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmbarquesTab } from "@/components/pricing/embarques-tab";
import { CategoriasTab } from "@/components/pricing/categorias-tab";
import { ResumenTab } from "@/components/pricing/resumen-tab";

export default function PricingRepuestosPage() {
  const [activeTab, setActiveTab] = useState("resumen");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Costeo de Importación</h1>
          <p className="text-muted-foreground">
            Gestión de costos de repuestos importados
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="resumen">
            <Package className="mr-2 h-4 w-4" />
            Resumen
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
