import { prisma } from "@/lib/prisma";
import { Prisma, TipoAnomalia, SeveridadAnomalia, EstadoMoto, EstadoPago } from "@prisma/client";

// ─── Helper: idempotency check ──────────────────────────────────────────────

async function anomaliaExiste(
  tipo: TipoAnomalia,
  entidadId: string
): Promise<boolean> {
  const existing = await prisma.anomalia.findFirst({
    where: {
      tipo,
      entidadId,
      estado: { in: ["NUEVA", "EN_REVISION"] },
    },
  });
  return !!existing;
}

// ─── 1. Gastos Inusuales ────────────────────────────────────────────────────

export async function detectarGastosInusuales(): Promise<number> {
  try {
    let created = 0;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get average expense by category over last 3 months
    const avgByCategory = await prisma.gasto.groupBy({
      by: ["categoria"],
      where: {
        fecha: { gte: threeMonthsAgo, lt: sevenDaysAgo },
      },
      _avg: { monto: true },
      _count: true,
    });

    const avgMap = new Map<string, number>();
    for (const row of avgByCategory) {
      if (row._avg.monto !== null && row._count >= 3) {
        avgMap.set(row.categoria, Number(row._avg.monto));
      }
    }

    // Get recent gastos (last 7 days)
    const recentGastos = await prisma.gasto.findMany({
      where: { fecha: { gte: sevenDaysAgo } },
    });

    for (const gasto of recentGastos) {
      const avg = avgMap.get(gasto.categoria);
      if (!avg || avg === 0) continue;

      const ratio = Number(gasto.monto) / avg;
      let severidad: SeveridadAnomalia | null = null;

      if (ratio >= 3) {
        severidad = "ALTA" as SeveridadAnomalia;
      } else if (ratio >= 2) {
        severidad = "MEDIA" as SeveridadAnomalia;
      }

      if (!severidad) continue;

      if (await anomaliaExiste("GASTO_INUSUAL" as TipoAnomalia, gasto.id)) continue;

      await prisma.anomalia.create({
        data: {
          tipo: "GASTO_INUSUAL" as TipoAnomalia,
          severidad,
          titulo: `Gasto inusual en ${gasto.categoria}`,
          descripcion: `El gasto "${gasto.concepto}" por $${Number(gasto.monto).toLocaleString("es-AR")} es ${ratio.toFixed(1)}x el promedio de la categoría ($${avg.toLocaleString("es-AR")}).`,
          entidadTipo: "Gasto",
          entidadId: gasto.id,
          montoInvolucrado: new Prisma.Decimal(Number(gasto.monto)),
          datosAnalisis: {
            montoGasto: Number(gasto.monto),
            promedioCategoria: avg,
            ratio: Math.round(ratio * 100) / 100,
            categoria: gasto.categoria,
          },
          autoDetectada: true,
        },
      });
      created++;
    }

    return created;
  } catch (error: unknown) {
    console.error("[AnomalyDetector] Error en detectarGastosInusuales:", error);
    return 0;
  }
}

// ─── 2. Pagos Duplicados ────────────────────────────────────────────────────

export async function detectarPagosDuplicados(
  pagoId?: string
): Promise<number> {
  try {
    let created = 0;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get pagos to check
    const pagosToCheck = pagoId
      ? await prisma.pago.findMany({ where: { id: pagoId } })
      : await prisma.pago.findMany({
          where: { createdAt: { gte: sevenDaysAgo } },
        });

    for (const pago of pagosToCheck) {
      // Find potential duplicates: same monto + same contratoId within 48 hours
      const fortyEightHoursBefore = new Date(
        pago.createdAt.getTime() - 48 * 60 * 60 * 1000
      );
      const fortyEightHoursAfter = new Date(
        pago.createdAt.getTime() + 48 * 60 * 60 * 1000
      );

      const duplicates = await prisma.pago.findMany({
        where: {
          id: { not: pago.id },
          contratoId: pago.contratoId,
          monto: pago.monto,
          createdAt: {
            gte: fortyEightHoursBefore,
            lte: fortyEightHoursAfter,
          },
        },
      });

      if (duplicates.length === 0) continue;

      // Create anomaly for this pago (not for each duplicate — the pair is noted in datosAnalisis)
      if (await anomaliaExiste("PAGO_DUPLICADO" as TipoAnomalia, pago.id)) continue;

      await prisma.anomalia.create({
        data: {
          tipo: "PAGO_DUPLICADO" as TipoAnomalia,
          severidad: "ALTA" as SeveridadAnomalia,
          titulo: `Posible pago duplicado por $${Number(pago.monto).toLocaleString("es-AR")}`,
          descripcion: `El pago ${pago.id} tiene ${duplicates.length} pago(s) con el mismo monto ($${Number(pago.monto).toLocaleString("es-AR")}) para el mismo contrato dentro de 48 horas.`,
          entidadTipo: "Pago",
          entidadId: pago.id,
          montoInvolucrado: new Prisma.Decimal(Number(pago.monto)),
          datosAnalisis: {
            pagoId: pago.id,
            contratoId: pago.contratoId,
            monto: Number(pago.monto),
            duplicadosIds: duplicates.map((d: { id: string }) => d.id),
            fechaPago: pago.createdAt.toISOString(),
          },
          autoDetectada: true,
        },
      });
      created++;
    }

    return created;
  } catch (error: unknown) {
    console.error(
      "[AnomalyDetector] Error en detectarPagosDuplicados:",
      error
    );
    return 0;
  }
}

// ─── 3. Facturas Sin Pago ───────────────────────────────────────────────────

export async function detectarFacturasSinPago(): Promise<number> {
  try {
    let created = 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Facturas emitidas linked to pagos that are NOT aprobado
    // Since Factura requires pagoId (non-nullable), we check if the linked pago is not "aprobado"
    const facturasSinCobro = await prisma.factura.findMany({
      where: {
        emitida: true,
        createdAt: { lt: thirtyDaysAgo },
        pago: {
          estado: { not: "APROBADO" },
        },
      },
      include: { pago: true },
    });

    for (const factura of facturasSinCobro) {
      let severidad: SeveridadAnomalia;
      const ageMs = now.getTime() - factura.createdAt.getTime();
      const ageDays = ageMs / (24 * 60 * 60 * 1000);

      if (ageDays > 90) {
        severidad = "CRITICA" as SeveridadAnomalia;
      } else if (ageDays > 60) {
        severidad = "ALTA" as SeveridadAnomalia;
      } else {
        severidad = "MEDIA" as SeveridadAnomalia;
      }

      if (await anomaliaExiste("FACTURA_SIN_PAGO" as TipoAnomalia, factura.id)) continue;

      await prisma.anomalia.create({
        data: {
          tipo: "FACTURA_SIN_PAGO" as TipoAnomalia,
          severidad,
          titulo: `Factura ${factura.numero} sin cobro hace ${Math.floor(ageDays)} días`,
          descripcion: `La factura ${factura.numero} (tipo ${factura.tipo}) por $${Number(factura.montoTotal).toLocaleString("es-AR")} fue emitida hace ${Math.floor(ageDays)} días y el pago vinculado tiene estado "${factura.pago?.estado ?? "desconocido"}".`,
          entidadTipo: "Factura",
          entidadId: factura.id,
          montoInvolucrado: new Prisma.Decimal(Number(factura.montoTotal)),
          datosAnalisis: {
            facturaNumero: factura.numero,
            tipo: factura.tipo,
            montoTotal: Number(factura.montoTotal),
            diasSinCobro: Math.floor(ageDays),
            pagoEstado: factura.pago?.estado,
            pagoId: factura.pagoId,
          },
          autoDetectada: true,
        },
      });
      created++;
    }

    return created;
  } catch (error: unknown) {
    console.error(
      "[AnomalyDetector] Error en detectarFacturasSinPago:",
      error
    );
    return 0;
  }
}

// ─── 4. Margen Bajo ─────────────────────────────────────────────────────────

export async function detectarMargenBajo(): Promise<number> {
  try {
    let created = 0;

    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get motos currently rented
    const motosAlquiladas = await prisma.moto.findMany({
      where: { estado: "ALQUILADA" },
      include: {
        contratos: {
          where: { estado: "ACTIVO" },
          include: {
            pagos: {
              where: {
                estado: "APROBADO",
                createdAt: { gte: threeMonthsAgo },
              },
            },
          },
        },
        gastos: {
          where: { fecha: { gte: threeMonthsAgo } },
        },
      },
    });

    for (const moto of motosAlquiladas) {
      const ingresos = moto.contratos.reduce(
        (sum: number, c) => sum + c.pagos.reduce((s: number, p) => s + Number(p.monto), 0),
        0
      );
      const gastos = moto.gastos.reduce((sum: number, g) => sum + Number(g.monto), 0);

      if (ingresos === 0) continue; // No income data yet — skip

      const margen = ((ingresos - gastos) / ingresos) * 100;
      let severidad: SeveridadAnomalia | null = null;

      if (margen < 0) {
        severidad = "CRITICA" as SeveridadAnomalia;
      } else if (margen < 10) {
        severidad = "MEDIA" as SeveridadAnomalia;
      }

      if (!severidad) continue;

      if (await anomaliaExiste("MARGEN_BAJO" as TipoAnomalia, moto.id)) continue;

      await prisma.anomalia.create({
        data: {
          tipo: "MARGEN_BAJO" as TipoAnomalia,
          severidad,
          titulo: `Margen bajo en ${moto.marca} ${moto.modelo} (${moto.patente})`,
          descripcion: `La moto ${moto.patente} tiene un margen del ${margen.toFixed(1)}% en los últimos 3 meses. Ingresos: $${ingresos.toLocaleString("es-AR")}, Gastos: $${gastos.toLocaleString("es-AR")}.`,
          entidadTipo: "Moto",
          entidadId: moto.id,
          montoInvolucrado: new Prisma.Decimal(Math.abs(ingresos - gastos)),
          datosAnalisis: {
            motoPatente: moto.patente,
            ingresos,
            gastos,
            margenPorcentaje: Math.round(margen * 100) / 100,
            periodo: "3_meses",
          },
          autoDetectada: true,
        },
      });
      created++;
    }

    return created;
  } catch (error: unknown) {
    console.error("[AnomalyDetector] Error en detectarMargenBajo:", error);
    return 0;
  }
}

// ─── 5. Stock Critico ───────────────────────────────────────────────────────

export async function detectarStockCritico(
  repuestoId?: string
): Promise<number> {
  try {
    let created = 0;

    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const repuestos = await prisma.repuesto.findMany({
      where: {
        ...(repuestoId ? { id: repuestoId } : {}),
        activo: true,
      },
    });

    // Filter in application code since we can't reference another column in `where`
    const repuestosBajos = repuestos.filter(
      (r: { stock: number; stockMinimo: number }) => r.stock < r.stockMinimo
    );

    for (const repuesto of repuestosBajos) {
      // Calculate average consumption from MovimientoStock (outgoing) in last 3 months
      const movimientos = await prisma.movimientoStock.aggregate({
        where: {
          repuestoId: repuesto.id,
          cantidad: { lt: 0 }, // Outgoing movements are negative
          createdAt: { gte: threeMonthsAgo },
        },
        _sum: { cantidad: true },
      });

      const totalSalidas = Math.abs(movimientos._sum.cantidad ?? 0);
      // Average daily consumption over 90 days
      const consumoDiario = totalSalidas / 90;
      const diasHastaAgotamiento =
        consumoDiario > 0
          ? Math.floor(repuesto.stock / consumoDiario)
          : repuesto.stock > 0
            ? 999
            : 0;

      let severidad: SeveridadAnomalia;
      if (repuesto.stock === 0) {
        severidad = "CRITICA" as SeveridadAnomalia;
      } else {
        severidad = "ALTA" as SeveridadAnomalia;
      }

      if (await anomaliaExiste("STOCK_CRITICO" as TipoAnomalia, repuesto.id)) continue;

      await prisma.anomalia.create({
        data: {
          tipo: "STOCK_CRITICO" as TipoAnomalia,
          severidad,
          titulo: `Stock crítico: ${repuesto.nombre}`,
          descripcion: `El repuesto "${repuesto.nombre}" (${repuesto.codigo ?? "sin código"}) tiene ${repuesto.stock} unidades (mínimo: ${repuesto.stockMinimo}). ${diasHastaAgotamiento < 999 ? `Estimación: ${diasHastaAgotamiento} días hasta agotamiento.` : ""}`,
          entidadTipo: "Repuesto",
          entidadId: repuesto.id,
          montoInvolucrado: new Prisma.Decimal(
            Number(repuesto.precioCompra) * repuesto.stockMinimo
          ),
          datosAnalisis: {
            repuestoNombre: repuesto.nombre,
            codigo: repuesto.codigo,
            stockActual: repuesto.stock,
            stockMinimo: repuesto.stockMinimo,
            consumoDiario: Math.round(consumoDiario * 100) / 100,
            diasHastaAgotamiento,
            totalSalidasTrimestre: totalSalidas,
          },
          autoDetectada: true,
        },
      });
      created++;
    }

    return created;
  } catch (error: unknown) {
    console.error("[AnomalyDetector] Error en detectarStockCritico:", error);
    return 0;
  }
}

// ─── 6. Desviacion Presupuesto ──────────────────────────────────────────────

export async function detectarDesviacionPresupuesto(): Promise<number> {
  try {
    let created = 0;

    const now = new Date();
    const mesActual = now.getMonth() + 1; // 1-12
    const anioActual = now.getFullYear();

    // Start and end of current month
    const inicioMes = new Date(anioActual, mesActual - 1, 1);
    const finMes = new Date(anioActual, mesActual, 1);

    // Get budgets for current month
    const presupuestos = await prisma.presupuestoMensual.findMany({
      where: { mes: mesActual, anio: anioActual },
    });

    if (presupuestos.length === 0) return 0;

    // Get actual expenses grouped by category for this month
    const gastosReales = await prisma.gasto.groupBy({
      by: ["categoria"],
      where: {
        fecha: { gte: inicioMes, lt: finMes },
      },
      _sum: { monto: true },
    });

    const gastosMap = new Map<string, number>();
    for (const g of gastosReales) {
      gastosMap.set(g.categoria, Number(g._sum.monto ?? 0));
    }

    const periodoId = `${anioActual}-${String(mesActual).padStart(2, "0")}`;

    for (const presupuesto of presupuestos) {
      const real = gastosMap.get(presupuesto.categoria) ?? 0;
      if (Number(presupuesto.montoPresupuestado) === 0) continue;

      const montoPresupuestadoNum = Number(presupuesto.montoPresupuestado);
      const desvio =
        ((real - montoPresupuestadoNum) /
          montoPresupuestadoNum) *
        100;

      let severidad: SeveridadAnomalia | null = null;
      if (desvio > 50) {
        severidad = "ALTA" as SeveridadAnomalia;
      } else if (desvio > 20) {
        severidad = "MEDIA" as SeveridadAnomalia;
      }

      if (!severidad) continue;

      const entidadId = `${periodoId}-${presupuesto.categoria}`;
      if (await anomaliaExiste("DESVIO_PRESUPUESTO" as TipoAnomalia, entidadId)) continue;

      await prisma.anomalia.create({
        data: {
          tipo: "DESVIO_PRESUPUESTO" as TipoAnomalia,
          severidad,
          titulo: `Desvío presupuestario en ${presupuesto.categoria} (+${desvio.toFixed(0)}%)`,
          descripcion: `La categoría ${presupuesto.categoria} lleva $${real.toLocaleString("es-AR")} gastados vs $${montoPresupuestadoNum.toLocaleString("es-AR")} presupuestados (${periodoId}). Desvío del ${desvio.toFixed(1)}%.`,
          entidadTipo: "PresupuestoMensual",
          entidadId,
          montoInvolucrado: new Prisma.Decimal(
            real - montoPresupuestadoNum
          ),
          datosAnalisis: {
            periodo: periodoId,
            categoria: presupuesto.categoria,
            presupuestado: montoPresupuestadoNum,
            real,
            desvioPorcentaje: Math.round(desvio * 100) / 100,
          },
          autoDetectada: true,
        },
      });
      created++;
    }

    return created;
  } catch (error: unknown) {
    console.error(
      "[AnomalyDetector] Error en detectarDesviacionPresupuesto:",
      error
    );
    return 0;
  }
}

// ─── 7. Flujo de Caja Negativo ──────────────────────────────────────────────

export async function detectarFlujoCajaNegativo(): Promise<number> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    // Cobros esperados: pagos pendientes with vencimiento in next 30 days
    const cobrosEsperados = await prisma.pago.aggregate({
      where: {
        estado: "PENDIENTE",
        vencimientoAt: { lte: thirtyDaysFromNow, gte: now },
      },
      _sum: { monto: true },
    });

    // Saldo actual approximation: approved payments last 30 days minus expenses last 30 days
    const ingresosRecientes = await prisma.pago.aggregate({
      where: {
        estado: "APROBADO",
        pagadoAt: { gte: thirtyDaysAgo },
      },
      _sum: { monto: true },
    });

    const gastosRecientes = await prisma.gasto.aggregate({
      where: {
        fecha: { gte: thirtyDaysAgo },
      },
      _sum: { monto: true },
    });

    // Pagos comprometidos: facturas compra pendientes (not yet paid) — approximate with upcoming gastos
    // Since there's no direct "upcoming expense" field, we use recent gastos as a baseline projection
    const pagosComprometidos = Number(gastosRecientes._sum.monto ?? 0);

    const saldoActual =
      Number(ingresosRecientes._sum.monto ?? 0) - Number(gastosRecientes._sum.monto ?? 0);
    const proyeccion =
      saldoActual +
      Number(cobrosEsperados._sum.monto ?? 0) -
      pagosComprometidos;

    if (proyeccion >= 0) return 0;

    const mesActual = now.getMonth() + 1;
    const anioActual = now.getFullYear();
    const periodoId = `${anioActual}-${String(mesActual).padStart(2, "0")}`;

    if (await anomaliaExiste("FLUJO_CAJA_NEGATIVO" as TipoAnomalia, periodoId)) return 0;

    await prisma.anomalia.create({
      data: {
        tipo: "FLUJO_CAJA_NEGATIVO" as TipoAnomalia,
        severidad: "CRITICA" as SeveridadAnomalia,
        titulo: `Flujo de caja negativo proyectado: -$${Math.abs(proyeccion).toLocaleString("es-AR")}`,
        descripcion: `Proyección de flujo de caja a 30 días: saldo actual $${saldoActual.toLocaleString("es-AR")} + cobros esperados $${Number(cobrosEsperados._sum.monto ?? 0).toLocaleString("es-AR")} - gastos proyectados $${pagosComprometidos.toLocaleString("es-AR")} = -$${Math.abs(proyeccion).toLocaleString("es-AR")}.`,
        entidadTipo: "FlujoCaja",
        entidadId: periodoId,
        montoInvolucrado: new Prisma.Decimal(Math.abs(proyeccion)),
        datosAnalisis: {
          periodo: periodoId,
          saldoActual,
          cobrosEsperados: Number(cobrosEsperados._sum.monto ?? 0),
          pagosComprometidos,
          proyeccion,
          ingresosUltimos30Dias: Number(ingresosRecientes._sum.monto ?? 0),
          gastosUltimos30Dias: Number(gastosRecientes._sum.monto ?? 0),
        },
        autoDetectada: true,
      },
    });

    return 1;
  } catch (error: unknown) {
    console.error(
      "[AnomalyDetector] Error en detectarFlujoCajaNegativo:",
      error
    );
    return 0;
  }
}

// ─── 8. Vencimientos Proximos ───────────────────────────────────────────────

export async function detectarVencimientosProximos(): Promise<number> {
  try {
    let created = 0;

    const now = new Date();
    const fifteenDaysFromNow = new Date(
      now.getTime() + 15 * 24 * 60 * 60 * 1000
    );
    // A) Check Moto.fechaVencimientoSeguro
    const motosConSeguroProximo = await prisma.moto.findMany({
      where: {
        estado: { not: "BAJA_DEFINITIVA" as EstadoMoto },
        fechaVencimientoSeguro: {
          lte: fifteenDaysFromNow,
        },
      },
    });

    for (const moto of motosConSeguroProximo) {
      if (!moto.fechaVencimientoSeguro) continue;

      const diasRestantes = Math.floor(
        (moto.fechaVencimientoSeguro.getTime() - now.getTime()) /
          (24 * 60 * 60 * 1000)
      );

      let severidad: SeveridadAnomalia;
      if (diasRestantes < 0) {
        severidad = "CRITICA" as SeveridadAnomalia;
      } else if (diasRestantes < 7) {
        severidad = "ALTA" as SeveridadAnomalia;
      } else {
        severidad = "MEDIA" as SeveridadAnomalia;
      }

      const entidadId = `seguro-${moto.id}`;
      if (await anomaliaExiste("VENCIMIENTO_PROXIMO" as TipoAnomalia, entidadId)) continue;

      const vencimientoLabel =
        diasRestantes < 0
          ? `VENCIDO hace ${Math.abs(diasRestantes)} días`
          : `vence en ${diasRestantes} días`;

      await prisma.anomalia.create({
        data: {
          tipo: "VENCIMIENTO_PROXIMO" as TipoAnomalia,
          severidad,
          titulo: `Seguro ${vencimientoLabel}: ${moto.marca} ${moto.modelo} (${moto.patente})`,
          descripcion: `El seguro de la moto ${moto.patente} ${vencimientoLabel} (${moto.fechaVencimientoSeguro.toLocaleDateString("es-AR")}).`,
          entidadTipo: "Moto",
          entidadId,
          datosAnalisis: {
            motoId: moto.id,
            motoPatente: moto.patente,
            tipoVencimiento: "SEGURO",
            fechaVencimiento:
              moto.fechaVencimientoSeguro.toISOString(),
            diasRestantes,
          },
          autoDetectada: true,
        },
      });
      created++;
    }

    // B) Check DocumentoMoto (VTV, POLIZA)
    const documentosProximos = await prisma.documentoMoto.findMany({
      where: {
        tipo: { in: ["VTV", "POLIZA"] },
        fechaVencimiento: {
          lte: fifteenDaysFromNow,
        },
      },
      include: {
        moto: { select: { id: true, marca: true, modelo: true, patente: true, estado: true } },
      },
    });

    for (const doc of documentosProximos) {
      if (!doc.fechaVencimiento) continue;
      if (doc.moto.estado === "BAJA_DEFINITIVA") continue;

      const diasRestantes = Math.floor(
        (doc.fechaVencimiento.getTime() - now.getTime()) /
          (24 * 60 * 60 * 1000)
      );

      let severidad: SeveridadAnomalia;
      if (diasRestantes < 0) {
        severidad = "CRITICA" as SeveridadAnomalia;
      } else if (diasRestantes < 7) {
        severidad = "ALTA" as SeveridadAnomalia;
      } else {
        severidad = "MEDIA" as SeveridadAnomalia;
      }

      const entidadId = `doc-${doc.id}`;
      if (await anomaliaExiste("VENCIMIENTO_PROXIMO" as TipoAnomalia, entidadId)) continue;

      const vencimientoLabel =
        diasRestantes < 0
          ? `VENCIDO hace ${Math.abs(diasRestantes)} días`
          : `vence en ${diasRestantes} días`;

      await prisma.anomalia.create({
        data: {
          tipo: "VENCIMIENTO_PROXIMO" as TipoAnomalia,
          severidad,
          titulo: `${doc.tipo} ${vencimientoLabel}: ${doc.moto.marca} ${doc.moto.modelo} (${doc.moto.patente})`,
          descripcion: `El documento ${doc.tipo} "${doc.nombre}" de la moto ${doc.moto.patente} ${vencimientoLabel} (${doc.fechaVencimiento.toLocaleDateString("es-AR")}).`,
          entidadTipo: "DocumentoMoto",
          entidadId,
          datosAnalisis: {
            documentoId: doc.id,
            motoId: doc.moto.id,
            motoPatente: doc.moto.patente,
            tipoDocumento: doc.tipo,
            nombreDocumento: doc.nombre,
            fechaVencimiento: doc.fechaVencimiento.toISOString(),
            diasRestantes,
          },
          autoDetectada: true,
        },
      });
      created++;
    }

    return created;
  } catch (error: unknown) {
    console.error(
      "[AnomalyDetector] Error en detectarVencimientosProximos:",
      error
    );
    return 0;
  }
}

// ─── 9. Patrones Sospechosos ────────────────────────────────────────────────

export async function detectarPatronesSospechosos(): Promise<number> {
  try {
    let created = 0;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // A) Pagos aprobados at unusual hours (22:00 - 06:00) in last 7 days
    const pagosRecientes = await prisma.pago.findMany({
      where: {
        estado: "APROBADO",
        pagadoAt: { gte: sevenDaysAgo },
      },
      include: {
        contrato: { select: { clienteId: true } },
      },
    });

    for (const pago of pagosRecientes) {
      if (!pago.pagadoAt) continue;

      const hora = pago.pagadoAt.getHours();
      if (hora >= 6 && hora < 22) continue; // Normal hours — skip

      if (await anomaliaExiste("PATRON_SOSPECHOSO" as TipoAnomalia, `hora-${pago.id}`))
        continue;

      await prisma.anomalia.create({
        data: {
          tipo: "PATRON_SOSPECHOSO" as TipoAnomalia,
          severidad: "MEDIA" as SeveridadAnomalia,
          titulo: `Pago en horario inusual (${hora}:00hs)`,
          descripcion: `El pago ${pago.id} por $${Number(pago.monto).toLocaleString("es-AR")} fue aprobado a las ${hora}:${String(pago.pagadoAt.getMinutes()).padStart(2, "0")}hs, fuera del horario habitual (06:00-22:00).`,
          entidadTipo: "Pago",
          entidadId: `hora-${pago.id}`,
          montoInvolucrado: new Prisma.Decimal(Number(pago.monto)),
          datosAnalisis: {
            pagoId: pago.id,
            monto: Number(pago.monto),
            horaLocal: hora,
            fechaPago: pago.pagadoAt.toISOString(),
            contratoId: pago.contratoId,
          },
          autoDetectada: true,
        },
      });
      created++;
    }

    // B) Multiple refunds: pagos reembolsados grouped by clienteId, >2 in 30 days
    const pagosReembolsados = await prisma.pago.findMany({
      where: {
        estado: "REEMBOLSADO",
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        contrato: { select: { clienteId: true } },
      },
    });

    // Group by clienteId
    const reembolsosPorCliente = new Map<
      string,
      Array<{ id: string; monto: number }>
    >();
    for (const pago of pagosReembolsados) {
      const clienteId = pago.contrato.clienteId;
      if (!reembolsosPorCliente.has(clienteId)) {
        reembolsosPorCliente.set(clienteId, []);
      }
      reembolsosPorCliente
        .get(clienteId)!
        .push({ id: pago.id, monto: Number(pago.monto) });
    }

    const entries = Array.from(reembolsosPorCliente.entries());
    for (const [clienteId, reembolsos] of entries) {
      if (reembolsos.length <= 2) continue;

      const entidadId = `reembolsos-${clienteId}`;
      if (await anomaliaExiste("PATRON_SOSPECHOSO" as TipoAnomalia, entidadId)) continue;

      const totalReembolsado = reembolsos.reduce((s: number, r) => s + r.monto, 0);

      await prisma.anomalia.create({
        data: {
          tipo: "PATRON_SOSPECHOSO" as TipoAnomalia,
          severidad: "ALTA" as SeveridadAnomalia,
          titulo: `Cliente con ${reembolsos.length} reembolsos en 30 días`,
          descripcion: `El cliente ${clienteId} tiene ${reembolsos.length} pagos reembolsados en los últimos 30 días por un total de $${totalReembolsado.toLocaleString("es-AR")}.`,
          entidadTipo: "Cliente",
          entidadId,
          montoInvolucrado: new Prisma.Decimal(totalReembolsado),
          datosAnalisis: {
            clienteId,
            cantidadReembolsos: reembolsos.length,
            totalReembolsado,
            pagosIds: reembolsos.map((r) => r.id),
            periodo: "30_dias",
          },
          autoDetectada: true,
        },
      });
      created++;
    }

    return created;
  } catch (error: unknown) {
    console.error(
      "[AnomalyDetector] Error en detectarPatronesSospechosos:",
      error
    );
    return 0;
  }
}

// ─── Master Function ────────────────────────────────────────────────────────

export async function ejecutarTodasLasDetecciones(): Promise<{
  total: number;
  porDetector: Record<string, number>;
}> {
  const results: Record<string, number> = {};

  results.gastosInusuales = await detectarGastosInusuales();
  results.pagosDuplicados = await detectarPagosDuplicados();
  results.facturasSinPago = await detectarFacturasSinPago();
  results.margenBajo = await detectarMargenBajo();
  results.stockCritico = await detectarStockCritico();
  results.desviacionPresupuesto = await detectarDesviacionPresupuesto();
  results.flujoCajaNegativo = await detectarFlujoCajaNegativo();
  results.vencimientosProximos = await detectarVencimientosProximos();
  results.patronesSospechosos = await detectarPatronesSospechosos();

  const total = Object.values(results).reduce((s, v) => s + v, 0);
  return { total, porDetector: results };
}
