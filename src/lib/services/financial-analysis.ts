import { prisma } from "@/lib/prisma";
import { ejecutarTodasLasDetecciones } from "./anomaly-detector";

// Helper: format date as YYYY-MM-DD
function formatDate(d: Date): string { return d.toISOString().slice(0, 10); }
function formatMonth(d: Date): string { return d.toISOString().slice(0, 7); }
function formatWeek(d: Date): string {
  // ISO week number
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

type AnalysisResult = {
  anomaliasDetectadas: number;
  metricas: Record<string, number>;
  tendencias?: Record<string, number>;
};

export async function runDailyAnalysis(): Promise<AnalysisResult> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const periodo = formatDate(today);

  // Run all anomaly detectors
  const detections = await ejecutarTodasLasDetecciones();

  // Calculate daily metrics
  const [pagosAprobados, gastosTotal, facturasEmitidas, contratosActivos, morosidad] = await Promise.all([
    // Total approved payments today
    prisma.pago.aggregate({ where: { estado: "aprobado", pagadoAt: { gte: startOfDay, lt: endOfDay } }, _sum: { monto: true }, _count: true }),
    // Total expenses today
    prisma.gasto.aggregate({ where: { fecha: { gte: startOfDay, lt: endOfDay } }, _sum: { monto: true }, _count: true }),
    // Invoices issued today
    prisma.factura.count({ where: { emitida: true, createdAt: { gte: startOfDay, lt: endOfDay } } }),
    // Active contracts
    prisma.contrato.count({ where: { estado: "activo" } }),
    // Overdue payments (pending past vencimientoAt)
    prisma.pago.count({ where: { estado: "pendiente", vencimientoAt: { lt: today } } }),
  ]);

  const ingresos = Number(pagosAprobados._sum.monto ?? 0);
  const egresos = Number(gastosTotal._sum.monto ?? 0);
  const margen = ingresos > 0 ? ((ingresos - egresos) / ingresos) * 100 : 0;
  const ticketPromedio = pagosAprobados._count > 0 ? ingresos / pagosAprobados._count : 0;

  const metricas = {
    ingresos,
    egresos,
    margenOperativo: Math.round(margen * 100) / 100,
    ticketPromedio: Math.round(ticketPromedio * 100) / 100,
    facturasEmitidas,
    contratosActivos,
    pagosAprobados: pagosAprobados._count,
    gastosCantidad: gastosTotal._count,
    morosidad,
  };

  // Upsert AnalisisFinanciero
  await prisma.analisisFinanciero.upsert({
    where: { tipo_periodo: { tipo: "DIARIO", periodo } },
    update: { metricas, alertasGeneradas: detections.total, fechaAnalisis: today },
    create: { tipo: "DIARIO", periodo, fechaAnalisis: today, metricas, alertasGeneradas: detections.total },
  });

  return { anomaliasDetectadas: detections.total, metricas };
}

export async function runWeeklyAnalysis(): Promise<AnalysisResult> {
  // Same as daily but for the week period
  // Add tendencias vs previous week
  const today = new Date();
  const periodo = formatWeek(today);

  // Start of current week (Monday)
  const dayOfWeek = today.getDay() || 7;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86400000);

  // Previous week for comparison
  const startOfPrevWeek = new Date(startOfWeek.getTime() - 7 * 86400000);

  const detections = await ejecutarTodasLasDetecciones();

  // Calculate metrics for this week and previous
  const [thisWeekPagos, thisWeekGastos, prevWeekPagos, prevWeekGastos] = await Promise.all([
    prisma.pago.aggregate({ where: { estado: "aprobado", pagadoAt: { gte: startOfWeek, lt: endOfWeek } }, _sum: { monto: true } }),
    prisma.gasto.aggregate({ where: { fecha: { gte: startOfWeek, lt: endOfWeek } }, _sum: { monto: true } }),
    prisma.pago.aggregate({ where: { estado: "aprobado", pagadoAt: { gte: startOfPrevWeek, lt: startOfWeek } }, _sum: { monto: true } }),
    prisma.gasto.aggregate({ where: { fecha: { gte: startOfPrevWeek, lt: startOfWeek } }, _sum: { monto: true } }),
  ]);

  const ingresos = Number(thisWeekPagos._sum.monto ?? 0);
  const egresos = Number(thisWeekGastos._sum.monto ?? 0);
  const prevIngresos = Number(prevWeekPagos._sum.monto ?? 0);
  const prevEgresos = Number(prevWeekGastos._sum.monto ?? 0);

  const metricas = { ingresos, egresos, margenOperativo: ingresos > 0 ? Math.round(((ingresos - egresos) / ingresos) * 10000) / 100 : 0 };

  const tendencias = {
    ingresosVsSemanaAnterior: prevIngresos > 0 ? Math.round(((ingresos - prevIngresos) / prevIngresos) * 10000) / 100 : 0,
    egresosVsSemanaAnterior: prevEgresos > 0 ? Math.round(((egresos - prevEgresos) / prevEgresos) * 10000) / 100 : 0,
  };

  await prisma.analisisFinanciero.upsert({
    where: { tipo_periodo: { tipo: "SEMANAL", periodo } },
    update: { metricas, tendencias, alertasGeneradas: detections.total, fechaAnalisis: today },
    create: { tipo: "SEMANAL", periodo, fechaAnalisis: today, metricas, tendencias, alertasGeneradas: detections.total },
  });

  return { anomaliasDetectadas: detections.total, metricas, tendencias };
}

export async function runMonthlyAnalysis(): Promise<AnalysisResult> {
  // Same + compare vs same month previous year if data exists
  const today = new Date();
  const periodo = formatMonth(today);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  // Same month last year
  const startOfPrevYear = new Date(today.getFullYear() - 1, today.getMonth(), 1);
  const endOfPrevYear = new Date(today.getFullYear() - 1, today.getMonth() + 1, 1);

  const detections = await ejecutarTodasLasDetecciones();

  const [thisMonthPagos, thisMonthGastos, prevYearPagos, prevYearGastos, contratosActivos] = await Promise.all([
    prisma.pago.aggregate({ where: { estado: "aprobado", pagadoAt: { gte: startOfMonth, lt: endOfMonth } }, _sum: { monto: true }, _count: true }),
    prisma.gasto.aggregate({ where: { fecha: { gte: startOfMonth, lt: endOfMonth } }, _sum: { monto: true }, _count: true }),
    prisma.pago.aggregate({ where: { estado: "aprobado", pagadoAt: { gte: startOfPrevYear, lt: endOfPrevYear } }, _sum: { monto: true } }),
    prisma.gasto.aggregate({ where: { fecha: { gte: startOfPrevYear, lt: endOfPrevYear } }, _sum: { monto: true } }),
    prisma.contrato.count({ where: { estado: "activo" } }),
  ]);

  const ingresos = Number(thisMonthPagos._sum.monto ?? 0);
  const egresos = Number(thisMonthGastos._sum.monto ?? 0);
  const prevYearIngresos = Number(prevYearPagos._sum.monto ?? 0);
  const prevYearEgresos = Number(prevYearGastos._sum.monto ?? 0);

  const metricas = {
    ingresos, egresos,
    margenOperativo: ingresos > 0 ? Math.round(((ingresos - egresos) / ingresos) * 10000) / 100 : 0,
    contratosActivos,
    pagos: thisMonthPagos._count,
    gastos: thisMonthGastos._count,
  };

  const tendencias: Record<string, number> = {};
  if (prevYearIngresos > 0) {
    tendencias.ingresosVsAnioAnterior = Math.round(((ingresos - prevYearIngresos) / prevYearIngresos) * 10000) / 100;
  }
  if (prevYearEgresos > 0) {
    tendencias.egresosVsAnioAnterior = Math.round(((egresos - prevYearEgresos) / prevYearEgresos) * 10000) / 100;
  }

  await prisma.analisisFinanciero.upsert({
    where: { tipo_periodo: { tipo: "MENSUAL", periodo } },
    update: { metricas, tendencias, alertasGeneradas: detections.total, fechaAnalisis: today },
    create: { tipo: "MENSUAL", periodo, fechaAnalisis: today, metricas, tendencias, alertasGeneradas: detections.total },
  });

  return { anomaliasDetectadas: detections.total, metricas, tendencias };
}
