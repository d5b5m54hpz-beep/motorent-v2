import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

// GET /api/dashboard — todas las métricas del dashboard
export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.dashboard.main.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    // Fecha actual para filtros
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const hace6Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);

    // KPIs básicos
    const [
      totalMotos,
      motosDisponibles,
      motosAlquiladas,
      motosMantenimiento,
      totalClientes,
      contratosActivos,
      contratosPendientes,
      pagosPendientes,
      pagosVencidos,
      ingresosTotales,
      ingresosMes,
      alertasSinLeer,
    ] = await Promise.all([
      prisma.moto.count(),
      prisma.moto.count({ where: { estado: "DISPONIBLE" } }),
      prisma.moto.count({ where: { estado: "ALQUILADA" } }),
      prisma.moto.count({ where: { estado: "EN_SERVICE" } }),
      prisma.cliente.count(),
      prisma.contrato.count({ where: { estado: "ACTIVO" } }),
      prisma.contrato.count({ where: { estado: "PENDIENTE" } }),
      prisma.pago.count({ where: { estado: "PENDIENTE" } }),
      prisma.pago.count({
        where: {
          estado: "PENDIENTE",
          vencimientoAt: { lt: hoy },
        },
      }),
      prisma.pago.aggregate({
        where: { estado: "APROBADO" },
        _sum: { monto: true },
      }),
      prisma.pago.aggregate({
        where: {
          estado: "APROBADO",
          pagadoAt: { gte: inicioMes },
        },
        _sum: { monto: true },
      }),
      prisma.alerta.count({ where: { leida: false } }),
    ]);

    // Ingresos por mes (últimos 6 meses)
    const pagosPorMes = await prisma.pago.findMany({
      where: {
        estado: "APROBADO",
        pagadoAt: { gte: hace6Meses },
      },
      select: {
        monto: true,
        pagadoAt: true,
      },
    });

    // Agrupar por mes
    const ingresosMensuales = new Map<string, number>();
    pagosPorMes.forEach((pago) => {
      if (pago.pagadoAt) {
        const mes = `${pago.pagadoAt.getFullYear()}-${String(
          pago.pagadoAt.getMonth() + 1
        ).padStart(2, "0")}`;
        ingresosMensuales.set(mes, (ingresosMensuales.get(mes) || 0) + Number(pago.monto));
      }
    });

    // Crear array de últimos 6 meses (incluso si no hay datos)
    const mesesLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const chartIngresos = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      const mesLabel = mesesLabels[fecha.getMonth()];
      chartIngresos.push({
        mes: mesLabel,
        ingresos: ingresosMensuales.get(mesKey) || 0,
      });
    }

    // Distribución de contratos por estado
    const contratosPorEstado = await prisma.contrato.groupBy({
      by: ["estado"],
      _count: { _all: true },
    });

    const chartContratos = contratosPorEstado.map((item) => ({
      estado: item.estado,
      cantidad: item._count._all,
    }));

    // Distribución de motos por estado
    const motosPorEstado = await prisma.moto.groupBy({
      by: ["estado"],
      _count: { _all: true },
    });

    const chartMotos = motosPorEstado.map((item) => ({
      estado: item.estado,
      cantidad: item._count._all,
    }));

    // Últimas actividades (últimos 10 pagos aprobados)
    const ultimosCobrosBd = await prisma.pago.findMany({
      where: { estado: "APROBADO" },
      orderBy: { pagadoAt: "desc" },
      take: 10,
      include: {
        contrato: {
          include: {
            cliente: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
            moto: {
              select: { marca: true, modelo: true, patente: true },
            },
          },
        },
      },
    });

    const ultimosCobros = ultimosCobrosBd.map((pago) => ({
      id: pago.id,
      cliente: pago.contrato.cliente.nombre || pago.contrato.cliente.user.name || pago.contrato.cliente.email,
      moto: `${pago.contrato.moto.marca} ${pago.contrato.moto.modelo}`,
      patente: pago.contrato.moto.patente,
      monto: Number(pago.monto),
      fecha: pago.pagadoAt,
      metodo: pago.metodo,
    }));

    // Próximos vencimientos (un pago por contrato, solo el más próximo)
    const todosPagosPendientes = await prisma.pago.findMany({
      where: { estado: "PENDIENTE" },
      orderBy: { vencimientoAt: "asc" },
      include: {
        contrato: {
          include: {
            cliente: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
            moto: {
              select: { marca: true, modelo: true, patente: true },
            },
          },
        },
      },
    });

    // Agrupar por contratoId y tomar solo el primer pago de cada contrato
    const contratosVistos = new Set<string>();
    const proximosVencimientosBd = todosPagosPendientes.filter((pago) => {
      if (contratosVistos.has(pago.contratoId)) {
        return false;
      }
      contratosVistos.add(pago.contratoId);
      return true;
    }).slice(0, 5);

    const proximosVencimientos = proximosVencimientosBd.map((pago) => {
      const diasRestantes = pago.vencimientoAt
        ? Math.ceil((new Date(pago.vencimientoAt).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: pago.id,
        cliente: pago.contrato.cliente.nombre || pago.contrato.cliente.user.name || pago.contrato.cliente.email,
        moto: `${pago.contrato.moto.marca} ${pago.contrato.moto.modelo}`,
        patente: pago.contrato.moto.patente,
        monto: Number(pago.monto),
        vencimiento: pago.vencimientoAt,
        diasRestantes,
        vencido: diasRestantes !== null && diasRestantes < 0,
      };
    });

    return NextResponse.json({
      kpis: {
        totalMotos,
        motosDisponibles,
        motosAlquiladas,
        motosMantenimiento,
        totalClientes,
        contratosActivos,
        contratosPendientes,
        pagosPendientes,
        pagosVencidos,
        ingresosTotales: Number(ingresosTotales._sum.monto) || 0,
        ingresosMes: Number(ingresosMes._sum.monto) || 0,
        alertasSinLeer,
      },
      charts: {
        ingresos: chartIngresos,
        contratos: chartContratos,
        motos: chartMotos,
      },
      actividades: {
        ultimosCobros,
        proximosVencimientos,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
