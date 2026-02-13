import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      loteId,
      tipo,
      porcentaje,
      items,
      categorias,
      repuestoIds,
      listaPrecioCodigo = "B2C",
      motivo,
      confirmar = false,
    } = body;

    if (!confirmar) {
      return NextResponse.json(
        { error: "El parámetro confirmar debe ser true para aplicar cambios" },
        { status: 400 }
      );
    }

    if (!motivo) {
      return NextResponse.json(
        { error: "Motivo es requerido" },
        { status: 400 }
      );
    }

    // Obtener lista de precios
    const listaPrecio = await prisma.listaPrecio.findUnique({
      where: { codigo: listaPrecioCodigo },
    });

    if (!listaPrecio) {
      return NextResponse.json(
        { error: "Lista de precios no encontrada" },
        { status: 404 }
      );
    }

    let cambios: any[] = [];
    let repuestosAfectados: any[] = [];

    // Caso 1: Lote pre-calculado (viene de calcular-retail)
    if (loteId) {
      const lote = await prisma.loteCambioPrecio.findUnique({
        where: { id: loteId },
      });

      if (!lote) {
        return NextResponse.json(
          { error: "Lote no encontrado" },
          { status: 404 }
        );
      }

      if (lote.aplicado) {
        return NextResponse.json(
          { error: "Este lote ya fue aplicado" },
          { status: 400 }
        );
      }

      // Los items vienen en el body
      cambios = items || [];
    }
    // Caso 2: Ajuste por porcentaje
    else if (tipo === "PORCENTAJE" && porcentaje !== undefined) {
      // Construir filtro
      const where: any = { activo: true };

      if (repuestoIds && repuestoIds.length > 0) {
        where.id = { in: repuestoIds };
      }

      if (categorias && categorias.length > 0) {
        where.categoria = { in: categorias };
      }

      const repuestos = await prisma.repuesto.findMany({ where });

      for (const rep of repuestos) {
        const precioActual = rep.precioVenta || 0;
        if (precioActual === 0) continue;

        const factor = 1 + porcentaje / 100;
        const precioNuevo = Math.round(precioActual * factor);

        cambios.push({
          repuestoId: rep.id,
          precioActual,
          precioNuevo,
        });
      }
    }
    // Caso 3: Items específicos
    else if (items && items.length > 0) {
      cambios = items;
    } else {
      return NextResponse.json(
        { error: "Debe proveer loteId, porcentaje con tipo PORCENTAJE, o items" },
        { status: 400 }
      );
    }

    // Aplicar cambios en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevoLoteId = loteId || randomUUID();

      // Crear o actualizar lote
      if (loteId) {
        await tx.loteCambioPrecio.update({
          where: { id: loteId },
          data: { aplicado: true },
        });
      } else {
        await tx.loteCambioPrecio.create({
          data: {
            id: nuevoLoteId,
            descripcion: motivo,
            tipo: tipo || "BULK_PORCENTAJE",
            cantidadItems: cambios.length,
            parametros: { porcentaje, categorias, listaPrecioCodigo },
            aplicado: true,
            usuario: session.user?.email || "sistema",
          },
        });
      }

      const historialCreado: any[] = [];

      // Aplicar cada cambio
      for (const cambio of cambios) {
        const repuesto = await tx.repuesto.findUnique({
          where: { id: cambio.repuestoId },
        });

        if (!repuesto) continue;

        const precioAnterior = repuesto.precioVenta;
        const precioNuevo = cambio.precioNuevo || cambio.precioCalculado;
        const costo = repuesto.costoPromedioArs || repuesto.precioCompra || 0;

        // Actualizar precio del repuesto (solo si es lista B2C)
        if (listaPrecioCodigo === "B2C") {
          await tx.repuesto.update({
            where: { id: cambio.repuestoId },
            data: { precioVenta: precioNuevo },
          });
        }

        // Crear/actualizar ItemListaPrecio
        const itemExistente = await tx.itemListaPrecio.findFirst({
          where: {
            listaPrecioId: listaPrecio.id,
            repuestoId: cambio.repuestoId,
            cantidadMinima: 1,
          },
          orderBy: { vigenciaDesde: "desc" },
        });

        if (itemExistente) {
          // Invalidar el anterior
          await tx.itemListaPrecio.update({
            where: { id: itemExistente.id },
            data: { vigenciaHasta: new Date() },
          });
        }

        // Crear nuevo item
        await tx.itemListaPrecio.create({
          data: {
            listaPrecioId: listaPrecio.id,
            repuestoId: cambio.repuestoId,
            precioArs: precioNuevo,
            cantidadMinima: 1,
            vigenciaDesde: new Date(),
            costoBase: costo,
            metodoCalculo: tipo || "BULK_UPDATE",
          },
        });

        // Crear historial
        const margen = precioNuevo > 0 ? (precioNuevo - costo) / precioNuevo : 0;

        const hist = await tx.historialPrecioRepuesto.create({
          data: {
            repuestoId: cambio.repuestoId,
            listaPrecioId: listaPrecio.id,
            precioAnterior,
            precioNuevo,
            tipoCambio: tipo || "BULK_UPDATE",
            motivo,
            loteId: nuevoLoteId,
            costoAlMomento: costo,
            margenAlMomento: margen,
            usuario: session.user?.email || "sistema",
          },
        });

        historialCreado.push(hist);
      }

      return { loteId: nuevoLoteId, historial: historialCreado };
    });

    return NextResponse.json({
      success: true,
      message: `${cambios.length} precios actualizados exitosamente`,
      loteId: resultado.loteId,
      cantidadItems: cambios.length,
    });
  } catch (err: unknown) {
    console.error("Error aplicando bulk:", err);
    return NextResponse.json(
      { error: "Error al aplicar cambios" },
      { status: 500 }
    );
  }
}
