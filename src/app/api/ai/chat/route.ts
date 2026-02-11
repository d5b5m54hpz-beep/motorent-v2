import { streamText, tool, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function POST(req: Request) {
  const { error, userId } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  if (!checkRateLimit(userId!)) {
    return new Response(
      JSON.stringify({ error: "Límite de mensajes alcanzado. Esperá un minuto." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `Sos el asistente de inteligencia artificial de MotoLibre, un sistema ERP de alquiler de motos en Buenos Aires, Argentina.
Tenés acceso a datos en tiempo real del negocio. Respondé siempre en español argentino.
Sé conciso, profesional y usá datos concretos cuando los tengas.
Cuando te pregunten algo que requiera datos, usá las herramientas disponibles para consultar la base de datos.
Formateá montos en pesos argentinos (ej: $150.000) y fechas en formato dd/mm/yyyy.
Usá markdown para formatear las respuestas cuando sea útil (tablas, listas, negrita).
Si no tenés datos suficientes para responder, indicalo claramente.`,
    messages,
    stopWhen: stepCountIs(5),
    tools: {
      getFleetSummary: tool({
        description: "Obtener resumen de la flota de motos: total, por estado, ocupación",
        inputSchema: z.object({}),
        execute: async () => {
          const motos = await prisma.moto.groupBy({
            by: ["estado"],
            _count: { id: true },
          });
          const total = motos.reduce((s, m) => s + m._count.id, 0);
          const byEstado = Object.fromEntries(motos.map((m) => [m.estado, m._count.id]));
          const alquiladas = byEstado["alquilada"] ?? 0;
          return {
            total,
            disponibles: byEstado["disponible"] ?? 0,
            alquiladas,
            enMantenimiento: byEstado["mantenimiento"] ?? 0,
            deBaja: byEstado["baja"] ?? 0,
            ocupacion: total > 0 ? Math.round((alquiladas / total) * 100) : 0,
          };
        },
      }),

      getMotoProfitability: tool({
        description: "Obtener rentabilidad por moto: ingresos, gastos, rentabilidad neta, costo por km",
        inputSchema: z.object({
          motoId: z.string().optional().describe("ID de moto específica, o vacío para todas"),
        }),
        execute: async ({ motoId }) => {
          const where = motoId ? { id: motoId } : { estado: { not: "baja" } };
          const motos = await prisma.moto.findMany({
            where,
            select: { id: true, marca: true, modelo: true, patente: true, kilometraje: true, precioMensual: true },
            take: 20,
          });

          const result = await Promise.all(
            motos.map(async (moto) => {
              const ingresos = await prisma.pago.aggregate({
                where: { estado: "aprobado", contrato: { motoId: moto.id } },
                _sum: { monto: true },
              });
              const gastos = await prisma.gasto.aggregate({
                where: { motoId: moto.id },
                _sum: { monto: true },
              });
              const ing = ingresos._sum.monto ?? 0;
              const gas = gastos._sum.monto ?? 0;
              return {
                moto: `${moto.marca} ${moto.modelo} (${moto.patente})`,
                ingresos: Math.round(ing),
                gastos: Math.round(gas),
                rentabilidad: Math.round(ing - gas),
                costoPorKm: moto.kilometraje > 0 ? Math.round(gas / moto.kilometraje) : 0,
                precioMensual: moto.precioMensual,
              };
            })
          );
          return result.sort((a, b) => b.rentabilidad - a.rentabilidad);
        },
      }),

      getFinancialSummary: tool({
        description: "Obtener resumen financiero: ingresos, gastos, resultado neto, top categorías de gasto",
        inputSchema: z.object({
          periodo: z.enum(["mes_actual", "ultimo_trimestre", "ultimo_anio"]).describe("Período a consultar"),
        }),
        execute: async ({ periodo }) => {
          const now = new Date();
          let desde: Date;
          if (periodo === "mes_actual") {
            desde = new Date(now.getFullYear(), now.getMonth(), 1);
          } else if (periodo === "ultimo_trimestre") {
            desde = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          } else {
            desde = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          }

          const [ingresos, gastos, topCategorias] = await Promise.all([
            prisma.pago.aggregate({
              where: { estado: "aprobado", pagadoAt: { gte: desde } },
              _sum: { monto: true },
              _count: { id: true },
            }),
            prisma.gasto.aggregate({
              where: { fecha: { gte: desde } },
              _sum: { monto: true },
              _count: { id: true },
            }),
            prisma.gasto.groupBy({
              by: ["categoria"],
              where: { fecha: { gte: desde } },
              _sum: { monto: true },
              orderBy: { _sum: { monto: "desc" } },
              take: 5,
            }),
          ]);

          const ing = ingresos._sum.monto ?? 0;
          const gas = gastos._sum.monto ?? 0;
          return {
            periodo,
            ingresos: Math.round(ing),
            cantidadPagos: ingresos._count.id,
            gastos: Math.round(gas),
            cantidadGastos: gastos._count.id,
            resultadoNeto: Math.round(ing - gas),
            topCategorias: topCategorias.map((c) => ({
              categoria: c.categoria,
              monto: Math.round(c._sum.monto ?? 0),
            })),
          };
        },
      }),

      getMaintenanceAlerts: tool({
        description: "Obtener alertas de mantenimiento: pendientes, en proceso hace más de 7 días, repuestos con stock bajo",
        inputSchema: z.object({}),
        execute: async () => {
          const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

          const [pendientes, enProcesoLargo, stockBajo] = await Promise.all([
            prisma.mantenimiento.findMany({
              where: { estado: { in: ["PENDIENTE", "PROGRAMADO"] } },
              select: {
                id: true, tipo: true, descripcion: true,
                moto: { select: { marca: true, modelo: true, patente: true } },
              },
              take: 10,
            }),
            prisma.mantenimiento.findMany({
              where: { estado: "EN_PROCESO", fechaInicio: { lte: hace7dias } },
              select: {
                id: true, tipo: true, descripcion: true, fechaInicio: true,
                moto: { select: { marca: true, modelo: true, patente: true } },
              },
              take: 10,
            }),
            prisma.repuesto.findMany({
              where: { stock: { lte: prisma.repuesto.fields.stockMinimo as unknown as number } },
              select: { nombre: true, stock: true, stockMinimo: true },
              take: 10,
            }),
          ]);

          // Workaround: fetch stock bajo with raw filter
          const repuestosBajo = await prisma.$queryRaw<Array<{ nombre: string; stock: number; stockMinimo: number }>>`
            SELECT nombre, stock, "stockMinimo" FROM "Repuesto" WHERE stock <= "stockMinimo" LIMIT 10
          `;

          return {
            mantenimientosPendientes: pendientes.map((m) => ({
              moto: `${m.moto.marca} ${m.moto.modelo} (${m.moto.patente})`,
              tipo: m.tipo,
              descripcion: m.descripcion,
            })),
            enProcesoMasDe7Dias: enProcesoLargo.map((m) => ({
              moto: `${m.moto.marca} ${m.moto.modelo} (${m.moto.patente})`,
              tipo: m.tipo,
              dias: Math.ceil((Date.now() - new Date(m.fechaInicio!).getTime()) / (1000 * 60 * 60 * 24)),
            })),
            repuestosStockBajo: repuestosBajo.map((r) => ({
              nombre: r.nombre,
              stock: r.stock,
              minimo: r.stockMinimo,
            })),
          };
        },
      }),

      getClientsSummary: tool({
        description: "Obtener resumen de clientes: total, activos con contrato, con pagos pendientes",
        inputSchema: z.object({}),
        execute: async () => {
          const [total, conContrato, conPagosPendientes] = await Promise.all([
            prisma.cliente.count({ where: { estado: "aprobado" } }),
            prisma.cliente.count({
              where: { estado: "aprobado", contratos: { some: { estado: "activo" } } },
            }),
            prisma.pago.findMany({
              where: { estado: "pendiente" },
              select: {
                monto: true,
                vencimientoAt: true,
                contrato: {
                  select: { cliente: { select: { nombre: true, email: true } } },
                },
              },
              take: 10,
              orderBy: { vencimientoAt: "asc" },
            }),
          ]);

          return {
            totalAprobados: total,
            conContratoActivo: conContrato,
            pagosPendientes: conPagosPendientes.map((p) => ({
              cliente: p.contrato.cliente.nombre ?? p.contrato.cliente.email,
              monto: p.monto,
              vencimiento: p.vencimientoAt?.toLocaleDateString("es-AR") ?? "Sin vencimiento",
            })),
          };
        },
      }),

      getPricingSuggestion: tool({
        description: "Obtener sugerencia de pricing basada en costos operativos y margen deseado",
        inputSchema: z.object({
          margen: z.number().min(10).max(50).default(30).describe("Margen deseado en porcentaje"),
        }),
        execute: async ({ margen }) => {
          const motos = await prisma.moto.findMany({
            where: { estado: { not: "baja" } },
            select: { id: true, marca: true, modelo: true, patente: true, precioMensual: true, createdAt: true },
          });

          const now = new Date();
          const hace6m = new Date(now.getFullYear(), now.getMonth() - 6, 1);

          const result = await Promise.all(
            motos.map(async (moto) => {
              const gastos = await prisma.gasto.aggregate({
                where: { motoId: moto.id, fecha: { gte: hace6m } },
                _sum: { monto: true },
              });
              const meses = Math.max(1, Math.min(6, (now.getTime() - moto.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)));
              const costoMensual = (gastos._sum.monto ?? 0) / meses;
              const sugerido = costoMensual * (1 + margen / 100);
              return {
                moto: `${moto.marca} ${moto.modelo} (${moto.patente})`,
                costoOperativoMensual: Math.round(costoMensual),
                precioActual: moto.precioMensual,
                precioSugerido: Math.round(sugerido),
                diferencia: Math.round(moto.precioMensual - sugerido),
                subpreciada: moto.precioMensual < sugerido * 0.95,
              };
            })
          );

          const subpreciadas = result.filter((r) => r.subpreciada);
          return {
            margenDeseado: margen,
            totalMotos: result.length,
            motosSubpreciadas: subpreciadas.length,
            costoPromedioFlota: result.length > 0
              ? Math.round(result.reduce((s, r) => s + r.costoOperativoMensual, 0) / result.length)
              : 0,
            detalle: result.slice(0, 10),
          };
        },
      }),

      getContractsSummary: tool({
        description: "Obtener resumen de contratos: activos, por vencer, vencidos, monto total",
        inputSchema: z.object({}),
        execute: async () => {
          const now = new Date();
          const en7dias = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

          const [activos, porVencer, vencidos, montoTotal] = await Promise.all([
            prisma.contrato.count({ where: { estado: "activo" } }),
            prisma.contrato.count({
              where: { estado: "activo", fechaFin: { gte: now, lte: en7dias } },
            }),
            prisma.contrato.count({
              where: { estado: "activo", fechaFin: { lt: now } },
            }),
            prisma.contrato.aggregate({
              where: { estado: "activo" },
              _sum: { montoTotal: true },
            }),
          ]);

          return {
            activos,
            porVencerEn7Dias: porVencer,
            vencidos,
            montoTotalActivos: Math.round(montoTotal._sum.montoTotal ?? 0),
          };
        },
      }),

      getRevenueByPeriod: tool({
        description: "Obtener ingresos agrupados por período para graficar tendencias",
        inputSchema: z.object({
          periodo: z.enum(["diario", "semanal", "mensual"]).describe("Granularidad del agrupamiento"),
        }),
        execute: async ({ periodo }) => {
          const now = new Date();
          let desde: Date;
          if (periodo === "diario") {
            desde = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          } else if (periodo === "semanal") {
            desde = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
          } else {
            desde = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          }

          const pagos = await prisma.pago.findMany({
            where: { estado: "aprobado", pagadoAt: { gte: desde } },
            select: { monto: true, pagadoAt: true },
            orderBy: { pagadoAt: "asc" },
          });

          const grouped = new Map<string, number>();
          for (const p of pagos) {
            if (!p.pagadoAt) continue;
            const d = new Date(p.pagadoAt);
            let key: string;
            if (periodo === "diario") {
              key = d.toLocaleDateString("es-AR");
            } else if (periodo === "semanal") {
              const weekStart = new Date(d);
              weekStart.setDate(d.getDate() - d.getDay());
              key = `Sem ${weekStart.toLocaleDateString("es-AR")}`;
            } else {
              key = d.toLocaleDateString("es-AR", { month: "short", year: "numeric" });
            }
            grouped.set(key, (grouped.get(key) ?? 0) + p.monto);
          }

          return Array.from(grouped.entries()).map(([fecha, monto]) => ({
            fecha,
            monto: Math.round(monto),
          }));
        },
      }),

      searchMoto: tool({
        description: "Buscar una moto específica por patente, marca o modelo y obtener sus datos completos",
        inputSchema: z.object({
          query: z.string().describe("Patente, marca o modelo a buscar"),
        }),
        execute: async ({ query }) => {
          const moto = await prisma.moto.findFirst({
            where: {
              OR: [
                { patente: { contains: query, mode: "insensitive" } },
                { marca: { contains: query, mode: "insensitive" } },
                { modelo: { contains: query, mode: "insensitive" } },
              ],
            },
            include: {
              contratos: {
                where: { estado: "activo" },
                include: { cliente: { select: { nombre: true, email: true } } },
                take: 3,
              },
              mantenimientos: {
                orderBy: { createdAt: "desc" },
                take: 3,
                select: { tipo: true, estado: true, costoTotal: true, createdAt: true },
              },
            },
          });

          if (!moto) return { encontrada: false, mensaje: `No se encontró moto con "${query}"` };

          return {
            encontrada: true,
            id: moto.id,
            marca: moto.marca,
            modelo: moto.modelo,
            patente: moto.patente,
            anio: moto.anio,
            kilometraje: moto.kilometraje,
            precioMensual: moto.precioMensual,
            estado: moto.estado,
            contratosActivos: moto.contratos.map((c) => ({
              cliente: c.cliente.nombre ?? c.cliente.email,
              fechaFin: c.fechaFin.toLocaleDateString("es-AR"),
              monto: c.montoTotal,
            })),
            ultimosMantenimientos: moto.mantenimientos.map((m) => ({
              tipo: m.tipo,
              estado: m.estado,
              costo: m.costoTotal,
              fecha: m.createdAt.toLocaleDateString("es-AR"),
            })),
          };
        },
      }),

      getExpenseBreakdown: tool({
        description: "Obtener desglose detallado de gastos por categoría o por moto",
        inputSchema: z.object({
          categoria: z.string().optional().describe("Categoría de gasto a filtrar"),
          motoId: z.string().optional().describe("ID de moto para filtrar gastos"),
        }),
        execute: async ({ categoria, motoId }) => {
          const where: Record<string, unknown> = {};
          if (categoria) where.categoria = categoria;
          if (motoId) where.motoId = motoId;

          const gastos = await prisma.gasto.findMany({
            where,
            select: {
              concepto: true,
              monto: true,
              categoria: true,
              fecha: true,
              moto: { select: { marca: true, modelo: true, patente: true } },
            },
            orderBy: { fecha: "desc" },
            take: 20,
          });

          const total = gastos.reduce((s, g) => s + g.monto, 0);

          return {
            totalGastos: Math.round(total),
            cantidad: gastos.length,
            detalle: gastos.map((g) => ({
              concepto: g.concepto,
              monto: Math.round(g.monto),
              categoria: g.categoria,
              fecha: g.fecha.toLocaleDateString("es-AR"),
              moto: g.moto ? `${g.moto.marca} ${g.moto.modelo} (${g.moto.patente})` : null,
            })),
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
