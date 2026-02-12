import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "CONTADOR", "VIEWER"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const desde = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");

    const fechaDesde = desde ? new Date(desde) : new Date(new Date().setDate(1));
    const fechaHasta = hasta ? new Date(hasta) : new Date();

    const [ingresos, costos] = await Promise.all([
      prisma.factura.aggregate({
        where: {
          createdAt: { gte: fechaDesde, lte: fechaHasta },
          estado: { in: ["emitida", "enviada"] },
        },
        _sum: { montoTotal: true },
      }),
      prisma.facturaCompra.aggregate({
        where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
        _sum: { total: true },
      }),
    ]);

    const ingresosTotal = ingresos._sum.montoTotal || 0;
    const costosTotal = costos._sum.total || 0;
    const ebitda = ingresosTotal - costosTotal;
    const margenBruto = ingresosTotal > 0 ? (ebitda / ingresosTotal) * 100 : 0;

    return NextResponse.json({
      ingresos: Math.round(ingresosTotal),
      gastos: Math.round(costosTotal),
      ebitda: Math.round(ebitda),
      margenBruto: Math.round(margenBruto * 10) / 10,
      margenNeto: Math.round(margenBruto * 10) / 10,
    });
  } catch (err: unknown) {
    console.error("Error fetching dashboard finanzas:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
