import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { generarHashFactura, detectarDuplicado } from "@/lib/controles-internos";
import type { TipoFacturaCompra } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const { cuit, tipo, puntoVenta, numero, total, fecha, cae } = body;

    if (!numero || !tipo) {
      return NextResponse.json(
        { error: "Número y tipo son requeridos" },
        { status: 400 }
      );
    }

    // Generar hash
    const hashUnico = generarHashFactura({
      cuit: cuit || null,
      tipo: tipo as TipoFacturaCompra,
      puntoVenta: puntoVenta || null,
      numero,
    });

    // Buscar duplicados por hash o CAE
    const whereConditions: Array<Record<string, unknown>> = [{ hashUnico }];

    if (cae) {
      whereConditions.push({ cae });
    }

    // Buscar también duplicados sospechosos: mismo CUIT + monto similar + fecha cercana
    if (cuit && total && fecha) {
      const fechaDate = new Date(fecha);
      const hace5Dias = new Date(fechaDate);
      hace5Dias.setDate(hace5Dias.getDate() - 5);
      const en5Dias = new Date(fechaDate);
      en5Dias.setDate(en5Dias.getDate() + 5);

      whereConditions.push({
        cuit,
        total: {
          gte: total - 1,
          lte: total + 1,
        },
        fecha: {
          gte: hace5Dias,
          lte: en5Dias,
        },
      });
    }

    const duplicadosPotenciales = await prisma.facturaCompra.findMany({
      where: {
        OR: whereConditions,
      },
      select: {
        id: true,
        visibleId: true,
        cuit: true,
        tipo: true,
        puntoVenta: true,
        numero: true,
        total: true,
        fecha: true,
        cae: true,
        estado: true,
        razonSocial: true,
        createdAt: true,
        proveedor: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (duplicadosPotenciales.length === 0) {
      return NextResponse.json({
        duplicados: [],
        mensajes: ["✅ No se encontraron duplicados"],
      });
    }

    // Analizar cada duplicado
    const analisis = duplicadosPotenciales.map((dup) => {
      const deteccion = detectarDuplicado(
        {
          id: dup.id,
          cuit: dup.cuit,
          tipo: dup.tipo,
          puntoVenta: dup.puntoVenta,
          numero: dup.numero,
          total: dup.total,
          fecha: dup.fecha,
          cae: dup.cae,
        },
        {
          cuit: cuit || null,
          tipo: tipo as TipoFacturaCompra,
          puntoVenta: puntoVenta || null,
          numero,
          total: total || 0,
          fecha: fecha ? new Date(fecha) : new Date(),
          cae,
        }
      );

      return {
        factura: {
          id: dup.visibleId,
          numero: dup.numero,
          tipo: dup.tipo,
          puntoVenta: dup.puntoVenta,
          razonSocial: dup.razonSocial,
          total: dup.total,
          fecha: dup.fecha,
          estado: dup.estado,
          cae: dup.cae,
          createdAt: dup.createdAt,
        },
        severidad: deteccion.esDuplicadoExacto
          ? "CRITICO"
          : deteccion.esDuplicadoSospechoso
          ? "WARNING"
          : "INFO",
        mensajes: deteccion.mensajes,
      };
    });

    const duplicadosExactos = analisis.filter((a) => a.severidad === "CRITICO");
    const duplicadosSospechosos = analisis.filter((a) => a.severidad === "WARNING");

    return NextResponse.json({
      duplicados: analisis,
      resumen: {
        total: analisis.length,
        exactos: duplicadosExactos.length,
        sospechosos: duplicadosSospechosos.length,
      },
      bloqueado: duplicadosExactos.length > 0,
    });
  } catch (err: unknown) {
    console.error("Error detectando duplicados:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
