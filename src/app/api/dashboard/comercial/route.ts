import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR", "COMERCIAL", "VIEWER"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const desde = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");

    const fechaDesde = desde ? new Date(desde) : new Date(new Date().setMonth(new Date().getMonth() - 12));
    const fechaHasta = hasta ? new Date(hasta) : new Date();

    // Evolución de ingresos mensuales (últimos 12 meses)
    const meses = [];
    for (let i = 11; i >= 0; i--) {
      const mesDate = new Date(fechaHasta);
      mesDate.setMonth(mesDate.getMonth() - i);
      const mesInicio = new Date(mesDate.getFullYear(), mesDate.getMonth(), 1);
      const mesFin = new Date(mesDate.getFullYear(), mesDate.getMonth() + 1, 0);

      const ingresos = await prisma.factura.aggregate({
        where: {
          createdAt: { gte: mesInicio, lte: mesFin },
          emitida: true,
        },
        _sum: { montoTotal: true },
      });

      meses.push({
        mes: mesDate.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
        ingresos: Math.round(ingresos._sum.montoTotal || 0),
      });
    }

    // Contratos por estado
    const contratosPorEstado = await prisma.contrato.groupBy({
      by: ["estado"],
      _count: { id: true },
    });

    // KPIs del período actual (último mes)
    const mesActualInicio = new Date(fechaHasta.getFullYear(), fechaHasta.getMonth(), 1);
    const mesAnteriorInicio = new Date(fechaHasta.getFullYear(), fechaHasta.getMonth() - 1, 1);
    const mesAnteriorFin = new Date(fechaHasta.getFullYear(), fechaHasta.getMonth(), 0);

    const [nuevosContratos, contratosAnteriores, contratosRenovados] = await Promise.all([
      prisma.contrato.count({
        where: { createdAt: { gte: mesActualInicio, lte: fechaHasta } },
      }),
      prisma.contrato.count({
        where: { createdAt: { gte: mesAnteriorInicio, lte: mesAnteriorFin } },
      }),
      prisma.contrato.count({
        where: {
          createdAt: { gte: mesActualInicio, lte: fechaHasta },
          renovacionAuto: true,
        },
      }),
    ]);

    const variacionContratos =
      contratosAnteriores > 0 ? ((nuevosContratos - contratosAnteriores) / contratosAnteriores) * 100 : 0;

    // Ticket promedio
    const ticketPromedio = await prisma.contrato.aggregate({
      where: { estado: "activo" },
      _avg: { montoPeriodo: true },
    });

    // Morosidad (pagos vencidos / pagos totales)
    const [pagosVencidos, pagosTotales] = await Promise.all([
      prisma.pago.count({
        where: {
          estado: "pendiente",
          vencimientoAt: { lt: new Date() },
        },
      }),
      prisma.pago.count(),
    ]);

    const morosidad = pagosTotales > 0 ? (pagosVencidos / pagosTotales) * 100 : 0;

    return NextResponse.json({
      evolucionIngresos: meses,
      contratosPorEstado: contratosPorEstado.map((c) => ({
        estado: c.estado,
        cantidad: c._count.id,
      })),
      nuevosContratos: {
        cantidad: nuevosContratos,
        variacion: Math.round(variacionContratos * 10) / 10,
      },
      contratosRenovados,
      tasaRenovacion: nuevosContratos > 0 ? Math.round((contratosRenovados / nuevosContratos) * 100) : 0,
      ticketPromedio: Math.round(ticketPromedio._avg.montoPeriodo || 0),
      morosidad: Math.round(morosidad * 10) / 10,
    });
  } catch (err: unknown) {
    console.error("Error fetching dashboard comercial:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
