import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

// Configuration
const DEFAULT_KM_POR_MES = 4000;
const LEAD_TIME_CHINA_DIAS = 60;
const LEAD_TIME_LOCAL_DIAS = 7;
const SAFETY_STOCK_PERCENT = 0.2;
const DEFAULT_TASA_CONDICIONAL = 0.3;

type RepuestoForecast = {
  repuestoId: string;
  sku: string;
  nombre: string;
  unidad: string | null;
  cantidadObligatoria: number;
  cantidadCondicional: number;
  cantidadTotal: number;
  costoUnitario: number;
  costoTotal: number;
  costoFaltante: number;
  stockActual: number;
  stockMinimo: number;
  faltante: number;
  puntoReorden: number;
  alertaReorden: boolean;
  leadTimeDias: number;
  fechaLimitePedido: string | null;
  fuenteCalculo: 'DATOS_REALES' | 'VIDA_UTIL_KM' | 'PLAN_FALLBACK';
  desglosePorMes: Array<{ mes: string; cantidad: number }>;
};

// GET /api/mantenimientos/pronostico-repuestos — Intelligent spare parts forecast
export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission(OPERATIONS.inventory.part.view, "view", ["OPERADOR"]);
    if (error) return error;

    const searchParams = req.nextUrl.searchParams;
    const meses = Math.min(parseInt(searchParams.get('meses') || '3'), 6);
    const kmPromedioOverride = searchParams.get('kmPromedioPorMes')
      ? parseInt(searchParams.get('kmPromedioPorMes')!)
      : null;

    // 1. Get active motos with current km
    const motos = await prisma.moto.findMany({
      where: { estado: { not: 'BAJA' } },
      select: {
        id: true,
        patente: true,
        marca: true,
        modelo: true,
        kmActual: true,
        kmUltimoService: true,
        fechaUltimoService: true,
      },
    });

    // 2. Calculate fleet km average from real data (CAPA 1)
    let kmPromedioFlota = DEFAULT_KM_POR_MES;
    let fuenteDatos: 'REAL' | 'ESTIMADO' = 'ESTIMADO';
    let totalOTsHistoricas = 0;

    const otsCompletadas = await prisma.ordenTrabajo.findMany({
      where: { estado: 'COMPLETADA', kmAlEgreso: { not: null } },
      select: {
        motoId: true,
        kmAlIngreso: true,
        kmAlEgreso: true,
        fechaIngreso: true,
        fechaEgreso: true,
        planId: true,
        tipoService: true,
        costoTotal: true,
      },
      orderBy: { fechaEgreso: 'desc' },
      take: 200,
    });

    totalOTsHistoricas = otsCompletadas.length;

    if (otsCompletadas.length >= 5) {
      // Calculate average km per month from real data
      const motoKmData: Record<string, { totalKm: number; totalDias: number }> = {};
      for (const ot of otsCompletadas) {
        if (!ot.kmAlEgreso || !ot.fechaIngreso || !ot.fechaEgreso) continue;
        const dias = Math.max(1, (new Date(ot.fechaEgreso).getTime() - new Date(ot.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24));
        const km = ot.kmAlEgreso - ot.kmAlIngreso;
        if (!motoKmData[ot.motoId]) {
          motoKmData[ot.motoId] = { totalKm: 0, totalDias: 0 };
        }
        motoKmData[ot.motoId].totalKm += km;
        motoKmData[ot.motoId].totalDias += dias;
      }

      const entries = Object.values(motoKmData);
      if (entries.length > 0) {
        const totalKm = entries.reduce((s, e) => s + e.totalKm, 0);
        const totalDias = entries.reduce((s, e) => s + e.totalDias, 0);
        if (totalDias > 0) {
          kmPromedioFlota = Math.round((totalKm / totalDias) * 30);
          fuenteDatos = 'REAL';
        }
      }
    }

    const kmPorMes = kmPromedioOverride || kmPromedioFlota;

    // 3. Get all plans with their repuestos
    const planes = await prisma.planMantenimiento.findMany({
      where: { activo: true },
      include: {
        tareas: {
          include: {
            repuestosTareaPlan: {
              include: {
                repuesto: {
                  select: {
                    id: true,
                    nombre: true,
                    codigo: true,
                    precioCompra: true,
                    stock: true,
                    stockMinimo: true,
                    unidad: true,
                    proveedor: { select: { nombre: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { kmDesde: 'asc' },
    });

    // Build plan lookup by tipo
    const planPorTipo: Record<string, typeof planes[0]> = {};
    for (const plan of planes) {
      planPorTipo[plan.tipo] = plan;
    }

    // 4. Project services per moto per month
    const now = new Date();
    type ServiceProjection = {
      motoId: string;
      patente: string;
      mesIndex: number;
      mesLabel: string;
      tipoService: string;
      kmEstimado: number;
    };

    const servicesFuturos: ServiceProjection[] = [];
    const detallePorMoto: Array<{
      motoId: string;
      patente: string;
      marca: string;
      modelo: string;
      kmActual: number;
      kmPorMes: number;
      services: Array<{ mes: string; tipo: string; kmEstimado: number }>;
    }> = [];

    for (const moto of motos) {
      const kmActual = moto.kmActual || 0;
      const kmDesdeService = kmActual - (moto.kmUltimoService || 0);
      const motoServices: Array<{ mes: string; tipo: string; kmEstimado: number }> = [];

      let kmAcumuladoDesdeBasico = kmDesdeService;
      let kmAcumuladoDesdeIntermedio = kmDesdeService;
      let kmAcumuladoDesdeMayor = kmDesdeService;

      for (let mes = 1; mes <= meses; mes++) {
        kmAcumuladoDesdeBasico += kmPorMes;
        kmAcumuladoDesdeIntermedio += kmPorMes;
        kmAcumuladoDesdeMayor += kmPorMes;

        const mesDate = new Date(now.getFullYear(), now.getMonth() + mes, 1);
        const mesLabel = `${mesDate.getFullYear()}-${String(mesDate.getMonth() + 1).padStart(2, '0')}`;

        let tipoService: string | null = null;

        // Mayor supersedes Intermedio supersedes Basico
        if (kmAcumuladoDesdeMayor >= 20000) {
          tipoService = 'MAYOR';
          kmAcumuladoDesdeMayor = 0;
          kmAcumuladoDesdeIntermedio = 0;
          kmAcumuladoDesdeBasico = 0;
        } else if (kmAcumuladoDesdeIntermedio >= 10000) {
          tipoService = 'INTERMEDIO';
          kmAcumuladoDesdeIntermedio = 0;
          kmAcumuladoDesdeBasico = 0;
        } else if (kmAcumuladoDesdeBasico >= 5000) {
          tipoService = 'BASICO';
          kmAcumuladoDesdeBasico = 0;
        }

        if (tipoService) {
          const kmEstimado = kmActual + kmPorMes * mes;
          servicesFuturos.push({
            motoId: moto.id,
            patente: moto.patente,
            mesIndex: mes,
            mesLabel,
            tipoService,
            kmEstimado,
          });
          motoServices.push({ mes: mesLabel, tipo: tipoService, kmEstimado });
        }
      }

      if (motoServices.length > 0) {
        detallePorMoto.push({
          motoId: moto.id,
          patente: moto.patente,
          marca: moto.marca,
          modelo: moto.modelo,
          kmActual,
          kmPorMes: kmPorMes,
          services: motoServices,
        });
      }
    }

    // 5. Count services per type per month
    const mesesLabels: string[] = [];
    for (let m = 1; m <= meses; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
      mesesLabels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const detallePorMes = mesesLabels.map((mesLabel) => {
      const servicesDelMes = servicesFuturos.filter((s) => s.mesLabel === mesLabel);
      return {
        mes: mesLabel,
        basicos: servicesDelMes.filter((s) => s.tipoService === 'BASICO').length,
        intermedios: servicesDelMes.filter((s) => s.tipoService === 'INTERMEDIO').length,
        mayores: servicesDelMes.filter((s) => s.tipoService === 'MAYOR').length,
      };
    });

    // 6. Consolidate repuestos needed across all projected services
    const repuestosMap: Record<string, RepuestoForecast & {
      desgloseMes: Record<string, number>;
      proveedorNombre: string | null;
    }> = {};

    for (const service of servicesFuturos) {
      const plan = planPorTipo[service.tipoService];
      if (!plan) continue;

      for (const tarea of plan.tareas) {
        for (const rtp of tarea.repuestosTareaPlan) {
          const key = rtp.repuesto.id;
          if (!repuestosMap[key]) {
            repuestosMap[key] = {
              repuestoId: rtp.repuesto.id,
              sku: rtp.repuesto.codigo || '',
              nombre: rtp.repuesto.nombre,
              unidad: rtp.repuesto.unidad,
              cantidadObligatoria: 0,
              cantidadCondicional: 0,
              cantidadTotal: 0,
              costoUnitario: Number(rtp.repuesto.precioCompra),
              costoTotal: 0,
              costoFaltante: 0,
              stockActual: rtp.repuesto.stock,
              stockMinimo: rtp.repuesto.stockMinimo,
              faltante: 0,
              puntoReorden: 0,
              alertaReorden: false,
              leadTimeDias: LEAD_TIME_LOCAL_DIAS,
              fechaLimitePedido: null,
              fuenteCalculo: 'PLAN_FALLBACK',
              desglosePorMes: [],
              desgloseMes: {},
              proveedorNombre: rtp.repuesto.proveedor?.nombre || null,
            };
            // Initialize months
            for (const ml of mesesLabels) {
              repuestosMap[key].desgloseMes[ml] = 0;
            }
          }

          // Determine quantity - simplified since vidaUtilKm and tasaUsoReal are not in RepuestoTareaPlan model
          let cantidad = rtp.cantidad;
          let fuenteCalculo: 'DATOS_REALES' | 'VIDA_UTIL_KM' | 'PLAN_FALLBACK' = 'PLAN_FALLBACK';

          // Use tipoConsumo to determine if it's obligatorio
          const esObligatorio = rtp.tipoConsumo === 'PLANIFICADO';

          if (esObligatorio) {
            repuestosMap[key].cantidadObligatoria += cantidad;
          } else {
            // Conditional/emergency parts - use default rate
            const cantidadCondicional = rtp.cantidad * DEFAULT_TASA_CONDICIONAL;
            repuestosMap[key].cantidadCondicional += cantidadCondicional;
            cantidad = cantidadCondicional;
          }

          repuestosMap[key].cantidadTotal += cantidad;
          repuestosMap[key].desgloseMes[service.mesLabel] = (repuestosMap[key].desgloseMes[service.mesLabel] || 0) + cantidad;

          // Set source to PLAN_FALLBACK since advanced fields (vidaUtilKm, tasaUsoReal) are not in the model yet
          repuestosMap[key].fuenteCalculo = fuenteCalculo;
        }
      }
    }

    // 7. Calculate reorder points, shortages, and alerts
    const alertasCriticas: Array<{ tipo: string; sku: string; mensaje: string }> = [];
    const repuestosNecesarios: RepuestoForecast[] = [];

    for (const rep of Object.values(repuestosMap)) {
      // Round quantities
      rep.cantidadObligatoria = Math.round(rep.cantidadObligatoria * 100) / 100;
      rep.cantidadCondicional = Math.round(rep.cantidadCondicional * 100) / 100;
      rep.cantidadTotal = Math.round(rep.cantidadTotal * 100) / 100;

      rep.costoTotal = Math.round(rep.cantidadTotal * rep.costoUnitario);
      rep.faltante = Math.max(0, Math.ceil(rep.cantidadTotal - rep.stockActual));
      rep.costoFaltante = rep.faltante * rep.costoUnitario;

      // Reorder point
      const consumoDiario = rep.cantidadTotal / (meses * 30);
      rep.puntoReorden = Math.ceil(consumoDiario * rep.leadTimeDias * (1 + SAFETY_STOCK_PERCENT));
      rep.alertaReorden = rep.stockActual <= rep.puntoReorden;

      // Deadline to order
      if (rep.alertaReorden && consumoDiario > 0) {
        const diasHastaAgotamiento = Math.floor(rep.stockActual / consumoDiario);
        const fechaLimite = new Date(now.getTime() + Math.max(0, diasHastaAgotamiento - rep.leadTimeDias) * 24 * 60 * 60 * 1000);
        rep.fechaLimitePedido = fechaLimite.toISOString().split('T')[0];
      }

      // Build monthly breakdown
      rep.desglosePorMes = mesesLabels.map((ml) => ({
        mes: ml,
        cantidad: Math.round((rep.desgloseMes[ml] || 0) * 100) / 100,
      }));

      // Generate alerts
      if (rep.stockActual <= 0 && rep.cantidadTotal > 0) {
        alertasCriticas.push({
          tipo: 'STOCK_CRITICO',
          sku: rep.sku,
          mensaje: `${rep.nombre}: SIN STOCK. Se necesitan ${Math.ceil(rep.cantidadTotal)} unidades en los proximos ${meses} meses.`,
        });
      } else if (rep.alertaReorden) {
        const diasStock = consumoDiario > 0 ? Math.floor(rep.stockActual / consumoDiario) : 999;
        alertasCriticas.push({
          tipo: diasStock < rep.leadTimeDias ? 'LEAD_TIME' : 'STOCK_BAJO',
          sku: rep.sku,
          mensaje: `${rep.nombre}: stock para ${diasStock} dias. ${rep.leadTimeDias > 30 ? 'Proveedor importacion, pedir AHORA.' : `Pedir antes del ${rep.fechaLimitePedido}.`}`,
        });
      }

      // Clean up internal fields before output
      const { desgloseMes: _d, proveedorNombre: _p, ...cleanRep } = rep;
      repuestosNecesarios.push(cleanRep);
    }

    // Sort: critical first
    repuestosNecesarios.sort((a, b) => b.faltante - a.faltante);

    // Build period label
    const periodoDesde = mesesLabels[0];
    const periodoHasta = mesesLabels[mesesLabels.length - 1];

    const totalBasicos = servicesFuturos.filter((s) => s.tipoService === 'BASICO').length;
    const totalIntermedios = servicesFuturos.filter((s) => s.tipoService === 'INTERMEDIO').length;
    const totalMayores = servicesFuturos.filter((s) => s.tipoService === 'MAYOR').length;

    const costoTotalEstimado = repuestosNecesarios.reduce((s, r) => s + r.costoTotal, 0);
    const costoFaltante = repuestosNecesarios.reduce((s, r) => s + r.costoFaltante, 0);

    return NextResponse.json({
      data: {
        periodo: `${periodoDesde} — ${periodoHasta}`,
        meses,
        totalMotos: motos.length,
        kmPromedioFlota: kmPorMes,
        fuenteDatos,
        totalOTsHistoricas,
        servicesProgramados: {
          basicos: totalBasicos,
          intermedios: totalIntermedios,
          mayores: totalMayores,
          total: totalBasicos + totalIntermedios + totalMayores,
          detallePorMes,
        },
        costoTotalEstimado,
        costoFaltante,
        repuestosNecesarios,
        alertasCriticas,
        detallePorMoto: detallePorMoto.slice(0, 50), // limit output
      },
    });
  } catch (error: unknown) {
    console.error('Error calculating forecast:', error);
    return NextResponse.json(
      { error: 'Error al calcular pronostico', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
