import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.import_shipment.calculate_costs, "execute", ["OPERADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const {
      tipoCambioArsUsd,
      tasaEstadisticaPct = 0.03,
      ivaPct = 0.21,
      ivaAdicionalPct = 0.20,
      gananciasPct = 0.06,
      iibbPct = 0.03,
      despachanteFee,
      gastosPuerto,
      transporteInterno,
      otrosGastos = 0,
      metodoAsignacion = "POR_VALOR",
    } = body;

    const embarque = await prisma.embarqueImportacion.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            repuesto: { select: { categoria: true, precioVenta: true, nombre: true } },
          },
        },
      },
    });

    if (!embarque) {
      return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
    }

    // 1. Calculate CIF
    const seguroUsd = Number(embarque.seguroUsd) || (Number(embarque.totalFobUsd) + Number(embarque.fleteUsd)) * 0.01;
    const cifUsd = Number(embarque.totalFobUsd) + Number(embarque.fleteUsd) + seguroUsd;

    // 2. Calculate totals for allocation
    const totalPesoEmbarque = embarque.items.reduce((sum, i) => sum + Number(i.pesoTotalKg || 0), 0);
    const totalVolumenEmbarque = embarque.items.reduce((sum, i) => sum + Number(i.volumenTotalCbm || 0), 0);

    const logisticaTotal = despachanteFee + gastosPuerto + transporteInterno + otrosGastos;

    // Load categories config
    const categorias = await prisma.categoriaRepuestoConfig.findMany();
    const categoriasMap = new Map(categorias.map(c => [c.categoria, c]));

    // Process each item
    const itemsResult = await Promise.all(
      embarque.items.map(async (item) => {
        // 3. Calculate allocation factor
        let factorAsignacion: number;
        const itemSubtotalFob = Number(item.subtotalFobUsd);
        const embarqueTotalFob = Number(embarque.totalFobUsd);
        switch (metodoAsignacion) {
          case "POR_VALOR":
            factorAsignacion = itemSubtotalFob / embarqueTotalFob;
            break;
          case "POR_PESO":
            factorAsignacion = Number(item.pesoTotalKg || 0) / (totalPesoEmbarque || 1);
            break;
          case "POR_VOLUMEN":
            factorAsignacion = Number(item.volumenTotalCbm || 0) / (totalVolumenEmbarque || 1);
            break;
          case "HIBRIDO":
            // Flete por volumen, resto por valor
            factorAsignacion = itemSubtotalFob / embarqueTotalFob;
            break;
          default:
            factorAsignacion = itemSubtotalFob / embarqueTotalFob;
        }

        // 4. Assign shared costs
        const fleteAsignado = Number(embarque.fleteUsd) * factorAsignacion;
        const seguroAsignado = seguroUsd * factorAsignacion;

        // 5. CIF del item
        const cifItem = itemSubtotalFob + fleteAsignado + seguroAsignado;

        // 6. Arancel específico del item
        const categoriaConfig = item.repuesto?.categoria ? categoriasMap.get(item.repuesto.categoria) : null;
        const arancelPct = Number(item.arancelPorcentaje ?? categoriaConfig?.arancelImpo ?? 0.16);
        const derechosItem = cifItem * arancelPct;

        // 7. Tasa de estadística
        const tasaEstItem = cifItem * tasaEstadisticaPct;

        // 8. Base imponible para IVA y otros
        const baseImponible = cifItem + derechosItem + tasaEstItem;

        // 9. Impuestos RECUPERABLES (NO suman al costo del inventario)
        const ivaItem = baseImponible * ivaPct;
        const ivaAdicionalItem = baseImponible * ivaAdicionalPct;
        const gananciasItem = baseImponible * gananciasPct;
        const iibbItem = baseImponible * iibbPct;

        // 10. Tasas fijas prorrateadas
        const tasasFijasItem = (10 + 28) * factorAsignacion;

        // 11. Logística prorrateada
        const logisticaItem = logisticaTotal * factorAsignacion;

        // 12. COSTO NO RECUPERABLE (el verdadero costo del inventario)
        const costoNoRecuperable = itemSubtotalFob + fleteAsignado + seguroAsignado
          + derechosItem + tasaEstItem + tasasFijasItem + logisticaItem;

        // 13. Costo por unidad
        const costoLandedUnitarioUsd = costoNoRecuperable / item.cantidad;
        const costoLandedUnitarioArs = costoLandedUnitarioUsd * tipoCambioArsUsd;

        // 14. Desembolso total (para cash flow)
        const desembolsoTotal = costoNoRecuperable + ivaItem + ivaAdicionalItem + gananciasItem + iibbItem;
        const desembolsoUnitarioUsd = desembolsoTotal / item.cantidad;

        // Calculate margin
        const precioVenta = Number(item.repuesto?.precioVenta) || 0;
        const margenActual = precioVenta > 0 ? (precioVenta - costoLandedUnitarioArs) / precioVenta : 0;
        const margenObjetivo = categoriaConfig?.margenObjetivo ?? 0.45;
        const margenMinimo = categoriaConfig?.margenMinimo ?? 0.25;

        let alertaMargen = "VERDE";
        if (margenActual < Number(margenMinimo)) alertaMargen = "ROJO";
        else if (margenActual < Number(margenObjetivo)) alertaMargen = "AMARILLO";

        return {
          repuestoId: item.repuestoId,
          nombre: item.repuesto?.nombre || "Sin repuesto vinculado",
          cantidad: item.cantidad,
          fobUnitarioUsd: Number(item.precioFobUnitarioUsd),
          costoLandedUnitarioUsd: Number(costoLandedUnitarioUsd.toFixed(2)),
          costoLandedUnitarioArs: Number(costoLandedUnitarioArs.toFixed(2)),
          desembolsoUnitarioUsd: Number(desembolsoUnitarioUsd.toFixed(2)),
          desglose: {
            fob: Number(Number(item.precioFobUnitarioUsd).toFixed(2)),
            flete: Number((fleteAsignado / item.cantidad).toFixed(2)),
            seguro: Number((seguroAsignado / item.cantidad).toFixed(2)),
            derechos: Number((derechosItem / item.cantidad).toFixed(2)),
            tasaEstadistica: Number((tasaEstItem / item.cantidad).toFixed(2)),
            tasasFijas: Number((tasasFijasItem / item.cantidad).toFixed(2)),
            logistica: Number((logisticaItem / item.cantidad).toFixed(2)),
          },
          margenActual: Number(margenActual.toFixed(4)),
          margenObjetivo,
          margenMinimo,
          alertaMargen,
          // Store for confirmation
          _internal: {
            fleteAsignado,
            seguroAsignado,
            derechosItem,
            tasaEstItem,
            logisticaItem,
          },
        };
      })
    );

    // Calculate totals
    const costoTotalNoRecuperable = itemsResult.reduce(
      (sum, i) => sum + i.costoLandedUnitarioUsd * i.cantidad,
      0
    );
    const desembolsoTotal = itemsResult.reduce(
      (sum, i) => sum + i.desembolsoUnitarioUsd * i.cantidad,
      0
    );
    const costoTotalRecuperable = desembolsoTotal - costoTotalNoRecuperable;

    // Resumen por categoría
    const porCategoria = new Map<string, any>();
    for (const item of embarque.items) {
      const categoria = item.repuesto?.categoria || "GENERAL";
      if (!porCategoria.has(categoria)) {
        porCategoria.set(categoria, { categoria, items: 0, costoTotal: 0 });
      }
      const cat = porCategoria.get(categoria);
      cat.items++;
      const itemResult = itemsResult.find(r => r.repuestoId === item.repuestoId);
      if (itemResult) {
        cat.costoTotal += itemResult.costoLandedUnitarioUsd * item.cantidad;
      }
    }

    const resumenPorCategoria = Array.from(porCategoria.values()).map(cat => ({
      ...cat,
      porcentaje: Number(((cat.costoTotal / costoTotalNoRecuperable) * 100).toFixed(1)),
    }));

    eventBus.emit(
      OPERATIONS.import_shipment.calculate_costs,
      "Embarque",
      id,
      { cifUsd, costoTotalNoRecuperable, desembolsoTotal, tipoCambioArsUsd, metodoAsignacion },
      userId
    ).catch(err => console.error("Error emitting import_shipment.calculate_costs event:", err));

    return NextResponse.json({
      embarqueId: id,
      cifUsd: Number(cifUsd.toFixed(2)),
      costoTotalNoRecuperable: Number(costoTotalNoRecuperable.toFixed(2)),
      costoTotalRecuperable: Number(costoTotalRecuperable.toFixed(2)),
      desembolsoTotal: Number(desembolsoTotal.toFixed(2)),
      tipoCambio: tipoCambioArsUsd,
      items: itemsResult,
      resumen: {
        porCategoria: resumenPorCategoria,
      },
    });
  } catch (err: unknown) {
    console.error("Error calculating costs:", err);
    return NextResponse.json(
      { error: "Error al calcular costos" },
      { status: 500 }
    );
  }
}
