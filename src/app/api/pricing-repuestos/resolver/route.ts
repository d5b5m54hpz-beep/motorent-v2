import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import type { Repuesto, ListaPrecio, ReglaDescuento } from "@prisma/client";

interface DescuentoAplicado {
  nombre: string;
  tipo: string;
  valor: number;
}

// ─── HELPERS ─────────────────────────────────────────────────────

function redondearPrecio(precio: number, metodo?: string | null): number {
  if (!metodo || metodo === "NONE") return precio;

  if (metodo === "NEAREST_10") {
    return Math.round(precio / 10) * 10;
  }

  if (metodo === "NEAREST_50") {
    return Math.round(precio / 50) * 50;
  }

  if (metodo === "NEAREST_99") {
    // Terminar en 99: ej 5401 → 5499
    const base = Math.floor(precio / 100) * 100;
    return base + 99;
  }

  return precio;
}

async function calcularPrecioConMarkup(
  repuesto: Repuesto,
  listaPrecio: ListaPrecio
): Promise<{ precio: number; reglaAplicada: string }> {
  const costo = Number(repuesto.costoPromedioArs) || Number(repuesto.precioCompra) || 0;

  if (costo === 0) {
    return { precio: 0, reglaAplicada: "Sin costo" };
  }

  // Buscar regla de markup que aplique
  const reglas = await prisma.reglaMarkup.findMany({
    where: {
      activa: true,
      OR: [
        { categoria: repuesto.categoria },
        { categoria: null }, // Regla genérica
      ],
      AND: [
        {
          OR: [
            { costoBandaDesde: null },
            { costoBandaDesde: { lte: costo } },
          ],
        },
        {
          OR: [
            { costoBandaHasta: null },
            { costoBandaHasta: { gt: costo } },
          ],
        },
      ],
    },
    orderBy: [
      { categoria: "desc" }, // Específicas primero
      { prioridad: "desc" },
    ],
  });

  const reglaAplicable = reglas[0];

  if (reglaAplicable) {
    const precioCalculado = costo * reglaAplicable.multiplicador;
    const precioRedondeado = redondearPrecio(precioCalculado, reglaAplicable.redondeo);
    return {
      precio: precioRedondeado,
      reglaAplicada: `${reglaAplicable.nombre} (${reglaAplicable.multiplicador}x)`,
    };
  }

  // Fallback: usar markupDefault de categoría
  const categoriaConfig = await prisma.categoriaRepuestoConfig.findFirst({
    where: { categoria: repuesto.categoria || "" },
  });

  const multiplicador = categoriaConfig?.markupDefault ?? 2.0;
  return {
    precio: costo * multiplicador,
    reglaAplicada: `Markup categoría (${multiplicador}x)`,
  };
}

async function evaluarDescuentos(
  repuesto: Repuesto,
  clienteId: string | undefined,
  listaPrecio: ListaPrecio,
  cantidad: number
): Promise<ReglaDescuento[]> {
  const descuentosAplicables: ReglaDescuento[] = [];

  // Obtener todas las reglas de descuento activas
  const reglas = await prisma.reglaDescuento.findMany({
    where: {
      activa: true,
      OR: [
        { vigenciaDesde: null },
        { vigenciaDesde: { lte: new Date() } },
      ],
      AND: [
        {
          OR: [
            { vigenciaHasta: null },
            { vigenciaHasta: { gte: new Date() } },
          ],
        },
      ],
    },
    orderBy: { prioridad: "desc" },
  });

  for (const regla of reglas) {
    let aplica = false;

    // Evaluar condición
    switch (regla.tipoCondicion) {
      case "SIEMPRE":
        aplica = true;
        break;

      case "CANTIDAD":
        if (regla.cantidadMinima && cantidad >= regla.cantidadMinima) {
          aplica = true;
        }
        break;

      case "CATEGORIA":
        if (regla.categoria === repuesto.categoria) {
          aplica = true;
        }
        break;

      case "PLAN_ALQUILER":
        // TODO: El modelo Contrato necesita agregar campo 'plan' para esta funcionalidad
        // Por ahora, inferir plan basándose en montoPeriodo del contrato
        if (clienteId && regla.planAlquiler) {
          const contratoActivo = await prisma.contrato.findFirst({
            where: {
              clienteId,
              estado: "activo",
            },
            orderBy: { fechaInicio: "desc" },
          });

          if (contratoActivo) {
            // Inferir plan por montoPeriodo: < 150k = BASICO, 150k-250k = PREMIUM, > 250k = VIP
            let planInferido = "BASICO";
            if (Number(contratoActivo.montoPeriodo) > 250000) planInferido = "VIP";
            else if (Number(contratoActivo.montoPeriodo) >= 150000) planInferido = "PREMIUM";

            if (planInferido === regla.planAlquiler) {
              aplica = true;
            }
          }
        }
        break;

      case "ANTIGUEDAD":
        if (clienteId && regla.antiguedadMeses) {
          // Buscar primer contrato del cliente
          const primerContrato = await prisma.contrato.findFirst({
            where: { clienteId },
            orderBy: { fechaInicio: "asc" },
          });

          if (primerContrato) {
            const mesesCliente =
              (new Date().getTime() - new Date(primerContrato.fechaInicio).getTime()) /
              (1000 * 60 * 60 * 24 * 30);

            if (mesesCliente >= regla.antiguedadMeses) {
              aplica = true;
            }
          }
        }
        break;

      case "GRUPO_CLIENTE":
        if (clienteId) {
          const pertenece = await prisma.miembroGrupoCliente.findFirst({
            where: { clienteId },
          });

          if (pertenece) {
            aplica = true;
          }
        }
        break;
    }

    if (aplica) {
      descuentosAplicables.push(regla);
    }
  }

  return descuentosAplicables;
}

function aplicarDescuento(precio: number, descuento: ReglaDescuento): number {
  if (descuento.tipoDescuento === "PORCENTAJE") {
    return precio * (1 - Number(descuento.valorDescuento));
  } else {
    // MONTO_FIJO
    return Math.max(0, precio - Number(descuento.valorDescuento));
  }
}

// ─── ENDPOINT PRINCIPAL ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.resolve, "execute", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const { repuestoId, clienteId, listaPrecioCodigo, cantidad = 1 } = body;

    if (!repuestoId) {
      return NextResponse.json(
        { error: "repuestoId es requerido" },
        { status: 400 }
      );
    }

    // Obtener repuesto
    const repuesto = await prisma.repuesto.findUnique({
      where: { id: repuestoId },
    });

    if (!repuesto) {
      return NextResponse.json(
        { error: "Repuesto no encontrado" },
        { status: 404 }
      );
    }

    // 1. Determinar lista de precios
    let listaPrecio: ListaPrecio | null | undefined;

    if (listaPrecioCodigo) {
      listaPrecio = await prisma.listaPrecio.findUnique({
        where: { codigo: listaPrecioCodigo },
      });
    } else if (clienteId) {
      // Buscar grupo del cliente
      const miembroGrupo = await prisma.miembroGrupoCliente.findFirst({
        where: { clienteId },
        include: { grupo: { include: { listaPrecio: true } } },
      });

      listaPrecio = miembroGrupo?.grupo?.listaPrecio;
    }

    // Default: B2C
    if (!listaPrecio) {
      listaPrecio = await prisma.listaPrecio.findUnique({
        where: { codigo: "B2C" },
      });
    }

    if (!listaPrecio) {
      return NextResponse.json(
        { error: "No se pudo determinar lista de precios" },
        { status: 500 }
      );
    }

    // 2. Buscar precio específico en la lista
    let precioBase: number;
    let metodoCalculo = "Calculado con markup";

    // ⭐ GAP 3: Auto-cálculo para listas con autoCalcular=true (ej: Uso Interno)
    if (listaPrecio.autoCalcular && listaPrecio.formulaMarkup) {
      const costo = Number(repuesto.costoPromedioArs) || Number(repuesto.precioCompra) || 0;
      precioBase = costo * listaPrecio.formulaMarkup;
      metodoCalculo = `Auto-calculado (costo × ${listaPrecio.formulaMarkup})`;
    } else {
      // Buscar precio manual en itemLista o calcular con markup
      const itemLista = await prisma.itemListaPrecio.findFirst({
        where: {
          listaPrecioId: listaPrecio.id,
          repuestoId,
          cantidadMinima: { lte: cantidad },
          vigenciaDesde: { lte: new Date() },
          OR: [
            { vigenciaHasta: null },
            { vigenciaHasta: { gt: new Date() } },
          ],
        },
        orderBy: [{ cantidadMinima: "desc" }, { vigenciaDesde: "desc" }],
      });

      if (itemLista) {
        precioBase = Number(itemLista.precioArs);
        metodoCalculo = itemLista.metodoCalculo || "Precio de lista";
      } else {
        // Calcular con markup
        const resultado = await calcularPrecioConMarkup(repuesto, listaPrecio);
        precioBase = resultado.precio;
        metodoCalculo = resultado.reglaAplicada;
      }
    }

    // Precio retail para comparación (siempre B2C)
    let precioRetailArs = precioBase;
    if (listaPrecio.codigo !== "B2C") {
      const listaB2C = await prisma.listaPrecio.findUnique({
        where: { codigo: "B2C" },
      });

      if (listaB2C) {
        const itemB2C = await prisma.itemListaPrecio.findFirst({
          where: {
            listaPrecioId: listaB2C.id,
            repuestoId,
            cantidadMinima: { lte: cantidad },
            vigenciaDesde: { lte: new Date() },
            OR: [
              { vigenciaHasta: null },
              { vigenciaHasta: { gt: new Date() } },
            ],
          },
        });

        if (itemB2C) {
          precioRetailArs = Number(itemB2C.precioArs);
        } else if (Number(repuesto.precioVenta) > 0) {
          precioRetailArs = Number(repuesto.precioVenta);
        } else {
          const resultadoB2C = await calcularPrecioConMarkup(repuesto, listaB2C);
          precioRetailArs = resultadoB2C.precio;
        }
      }
    }

    // 4. Aplicar descuento global de la lista
    if (listaPrecio.descuentoGlobalPct) {
      precioBase = precioBase * (1 - Number(listaPrecio.descuentoGlobalPct));
    }

    // 5. Evaluar y aplicar descuentos
    const descuentosDisponibles = await evaluarDescuentos(
      repuesto,
      clienteId,
      listaPrecio,
      cantidad
    );

    let precioFinal = precioBase;
    const descuentosAplicados: DescuentoAplicado[] = [];

    // Primero: mejor descuento NO acumulable
    const noAcumulables = descuentosDisponibles.filter((d) => !d.acumulable);
    const mejorNoAcumulable = noAcumulables.sort(
      (a, b) => Number(b.valorDescuento) - Number(a.valorDescuento)
    )[0];

    if (mejorNoAcumulable) {
      precioFinal = aplicarDescuento(precioFinal, mejorNoAcumulable);
      descuentosAplicados.push({
        nombre: mejorNoAcumulable.nombre,
        tipo: mejorNoAcumulable.tipoDescuento,
        valor: Number(mejorNoAcumulable.valorDescuento),
      });
    }

    // Después: todos los acumulables
    const acumulables = descuentosDisponibles
      .filter((d) => d.acumulable)
      .sort((a, b) => b.prioridad - a.prioridad);

    for (const desc of acumulables) {
      precioFinal = aplicarDescuento(precioFinal, desc);
      descuentosAplicados.push({
        nombre: desc.nombre,
        tipo: desc.tipoDescuento,
        valor: Number(desc.valorDescuento),
      });
    }

    // 7. GUARDRAIL: margen mínimo
    const costo = Number(repuesto.costoPromedioArs) || Number(repuesto.precioCompra) || 0;
    const categoriaConfig = await prisma.categoriaRepuestoConfig.findFirst({
      where: { categoria: repuesto.categoria || "" },
    });

    const margenMinimo =
      repuesto.margenMinimo ?? categoriaConfig?.margenMinimo ?? 0.15;
    const margenObjetivo =
      repuesto.margenObjetivo ?? categoriaConfig?.margenObjetivo ?? 0.35;

    let margenResultante = costo > 0 ? (precioFinal - costo) / precioFinal : 1;
    let alertaMargen: "OK" | "BAJO" | "CRITICO" = "OK";

    if (costo > 0 && margenResultante < margenMinimo) {
      // Forzar precio mínimo
      precioFinal = costo / (1 - margenMinimo);
      margenResultante = margenMinimo;
      alertaMargen = "CRITICO";
    } else if (margenResultante < margenObjetivo) {
      alertaMargen = "BAJO";
    }

    // 8. Redondear
    precioFinal = Math.round(precioFinal);

    const descuentoTotalPct =
      precioRetailArs > 0
        ? (precioRetailArs - precioFinal) / precioRetailArs
        : 0;
    const ahorroArs = precioRetailArs - precioFinal;

    return NextResponse.json({
      repuestoId,
      nombre: repuesto.nombre,
      categoria: repuesto.categoria,

      // Precio retail (referencia)
      precioRetailArs,

      // Precio resuelto
      precioFinalArs: precioFinal,
      listaPrecioAplicada: listaPrecio.codigo,
      metodoCalculo,

      // Descuentos
      descuentos: descuentosAplicados,
      descuentoTotalPct: Number(descuentoTotalPct.toFixed(4)),
      ahorroArs: Number(ahorroArs.toFixed(2)),

      // Info de margen (solo para admin)
      costoBase: costo,
      margenResultante: Number(margenResultante.toFixed(4)),
      margenMinimo,
      margenObjetivo,
      alertaMargen,
    });
  } catch (err: unknown) {
    console.error("Error resolviendo precio:", err);
    return NextResponse.json(
      { error: "Error al resolver precio" },
      { status: 500 }
    );
  }
}
