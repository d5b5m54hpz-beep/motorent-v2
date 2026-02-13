"use client";

import { useState, useEffect } from "react";
import { FolderOpen, Save, X, Pencil, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type CategoriaConfig = {
  id: string;
  categoria: string;
  nombre: string;
  margenObjetivo: number;
  margenMinimo: number;
  markupDefault: number;
  arancelImpo: number;
  ncmDefault: string | null;
};

export function CategoriasTab() {
  const [categorias, setCategorias] = useState<CategoriaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CategoriaConfig>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pricing-repuestos/categorias");
      if (!res.ok) throw new Error("Error al cargar categorías");
      const data = await res.json();
      setCategorias(data);
    } catch (error) {
      toast.error("Error al cargar categorías");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (categoria: CategoriaConfig) => {
    setEditingId(categoria.id);
    setEditForm(categoria);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editingId || !editForm.categoria) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/pricing-repuestos/categorias/${editForm.categoria}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          margenObjetivo: editForm.margenObjetivo,
          margenMinimo: editForm.margenMinimo,
          markupDefault: editForm.markupDefault,
          arancelImpo: editForm.arancelImpo,
          ncmDefault: editForm.ncmDefault,
        }),
      });

      if (!res.ok) throw new Error("Error al actualizar categoría");

      toast.success("Categoría actualizada");
      setEditingId(null);
      setEditForm({});
      fetchCategorias();
    } catch (error) {
      toast.error("Error al actualizar categoría");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  const formatDecimal = (value: number) => {
    return value.toFixed(2);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Configuración de Categorías
              </CardTitle>
              <CardDescription>
                Configura márgenes, markup y aranceles para cada categoría de repuesto
              </CardDescription>
            </div>
            <Badge variant="outline">{categorias.length} categorías</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Margen Objetivo</TableHead>
                    <TableHead className="text-right">Margen Mínimo</TableHead>
                    <TableHead className="text-right">Markup Default</TableHead>
                    <TableHead className="text-right">Arancel Importación</TableHead>
                    <TableHead className="text-center">NCM Default</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorias.map((categoria) => {
                    const isEditing = editingId === categoria.id;

                    return (
                      <TableRow key={categoria.id}>
                        <TableCell className="font-medium">{categoria.nombre}</TableCell>

                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={editForm.margenObjetivo || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  margenObjetivo: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-24 text-right"
                            />
                          ) : (
                            formatPercent(categoria.margenObjetivo)
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={editForm.margenMinimo || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  margenMinimo: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-24 text-right"
                            />
                          ) : (
                            formatPercent(categoria.margenMinimo)
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="1"
                              value={editForm.markupDefault || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  markupDefault: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-24 text-right"
                            />
                          ) : (
                            `×${formatDecimal(categoria.markupDefault)}`
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={editForm.arancelImpo || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  arancelImpo: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-24 text-right"
                            />
                          ) : (
                            formatPercent(categoria.arancelImpo)
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={editForm.ncmDefault || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, ncmDefault: e.target.value })
                              }
                              placeholder="8714.10.00"
                              className="w-32 text-center"
                            />
                          ) : (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {categoria.ncmDefault || "-"}
                            </code>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleSave}
                                disabled={saving}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleCancel}
                                disabled={saving}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(categoria)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
            <p>
              <strong>Margen Objetivo:</strong> Margen de ganancia target para esta categoría
              (ej: 0.45 = 45%)
            </p>
            <p>
              <strong>Margen Mínimo:</strong> Margen mínimo aceptable antes de alertar (ej: 0.25
              = 25%)
            </p>
            <p>
              <strong>Markup Default:</strong> Multiplicador sugerido sobre el costo (ej: 1.82 =
              markup del 82%)
            </p>
            <p>
              <strong>Arancel Importación:</strong> % de derechos de importación para esta
              categoría (ej: 0.16 = 16%)
            </p>
            <p>
              <strong>NCM Default:</strong> Código NCM (Nomenclatura Común del Mercosur) default
              para repuestos de esta categoría
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
