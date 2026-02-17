import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.inventory.part.export,
    "view",
    ["OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";
    const categoria = url.searchParams.get("categoria");
    const activo = url.searchParams.get("activo");
    const stockBajo = url.searchParams.get("stockBajo");

    const where: Record<string, unknown> = {};

    if (categoria) {
      where.categoria = categoria;
    }

    if (activo !== null && activo !== undefined && activo !== "") {
      where.activo = activo === "true";
    }

    const repuestos = await prisma.repuesto.findMany({
      where,
      include: {
        proveedor: { select: { nombre: true } },
      },
      orderBy: { nombre: "asc" },
    });

    let filtered = repuestos;
    if (stockBajo === "true") {
      filtered = repuestos.filter((r) => r.stock <= r.stockMinimo);
    }

    if (format === "csv") {
      const headers = [
        "nombre",
        "codigo",
        "categoria",
        "marca",
        "precioCompra",
        "precioVenta",
        "stock",
        "stockMinimo",
        "unidad",
        "ubicacion",
        "proveedor",
        "activo",
      ];

      const rows = filtered.map((r) => [
        r.nombre,
        r.codigo || "",
        r.categoria || "",
        r.marca || "",
        r.precioCompra,
        r.precioVenta,
        r.stock,
        r.stockMinimo,
        r.unidad || "",
        r.ubicacion || "",
        r.proveedor?.nombre || "",
        r.activo ? "SI" : "NO",
      ]);

      const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=repuestos-export.csv",
        },
      });
    }

    return NextResponse.json(filtered);
  } catch (error: unknown) {
    console.error("Error exporting repuestos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
