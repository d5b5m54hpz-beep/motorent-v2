import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requirePermission(
    OPERATIONS.inventory.part.view,
    "view",
    ["OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  try {
    const repuestos = await prisma.repuesto.findMany({
      include: {
        proveedor: { select: { nombre: true } },
      },
    });

    const totalRepuestos = repuestos.length;
    const totalActivos = repuestos.filter((r) => r.activo).length;
    const stockBajo = repuestos.filter((r) => r.stock <= r.stockMinimo && r.activo).length;
    const sinStock = repuestos.filter((r) => r.stock === 0 && r.activo).length;

    const valorInventario = repuestos.reduce(
      (sum, r) => sum + r.stock * r.precioCompra,
      0
    );
    const valorVenta = repuestos.reduce(
      (sum, r) => sum + r.stock * r.precioVenta,
      0
    );

    const categorias = repuestos.reduce((acc, r) => {
      const cat = r.categoria || "Sin categoría";
      if (!acc[cat]) {
        acc[cat] = { categoria: cat, cantidad: 0, valor: 0 };
      }
      acc[cat].cantidad += 1;
      acc[cat].valor += r.stock * r.precioCompra;
      return acc;
    }, {} as Record<string, { categoria: string; cantidad: number; valor: number }>);

    const porCategoria = Object.values(categorias);

    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const movimientosConsumo = await prisma.movimientoStock.findMany({
      where: {
        tipo: "SALIDA_CONSUMO_OT",
        createdAt: { gte: hace30Dias },
      },
      include: {
        repuesto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const consumoPorRepuesto = movimientosConsumo.reduce((acc, m) => {
      const key = m.repuestoId;
      if (!acc[key]) {
        acc[key] = {
          repuesto: m.repuesto,
          totalConsumido: 0,
          ultimoUso: m.createdAt,
        };
      }
      acc[key].totalConsumido += Math.abs(m.cantidad);
      if (m.createdAt > acc[key].ultimoUso) {
        acc[key].ultimoUso = m.createdAt;
      }
      return acc;
    }, {} as Record<string, { repuesto: { id: string; nombre: string; codigo: string | null }; totalConsumido: number; ultimoUso: Date }>);

    const topConsumidos = Object.values(consumoPorRepuesto)
      .sort((a, b) => b.totalConsumido - a.totalConsumido)
      .slice(0, 10);

    const alertas = repuestos
      .filter((r) => r.stock <= r.stockMinimo && r.activo)
      .map((r) => ({
        repuesto: { id: r.id, nombre: r.nombre, codigo: r.codigo },
        stock: r.stock,
        stockMinimo: r.stockMinimo,
        diasEstimadosHastaAgotarse: r.stock === 0 ? 0 : null,
      }))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10);

    const movimientosRecientes = await prisma.movimientoStock.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        repuesto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
          },
        },
      },
    });

    return NextResponse.json({
      totalRepuestos,
      totalActivos,
      stockBajo,
      sinStock,
      valorInventario,
      valorVenta,
      porCategoria,
      topConsumidos,
      alertas,
      movimientosRecientes,
    });
  } catch (error: unknown) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
