import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { bajaMotoSchema } from "@/lib/validations";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.decommission,
    "execute"
  );
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await req.json();

    const validation = bajaMotoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar que la moto existe y no está dada de baja
    const moto = await prisma.moto.findUnique({
      where: { id },
      include: { bajaMoto: true },
    });

    if (!moto) {
      return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
    }

    if (moto.bajaMoto) {
      return NextResponse.json(
        { error: "La moto ya está dada de baja" },
        { status: 400 }
      );
    }

    // Validaciones específicas por tipo
    if (data.tipoBaja === "ROBO") {
      if (!data.numeroDenuncia) {
        return NextResponse.json(
          { error: "Número de denuncia es requerido para tipo ROBO" },
          { status: 400 }
        );
      }
    }

    if (data.tipoBaja === "SINIESTRO") {
      if (!data.numeroSiniestro) {
        return NextResponse.json(
          { error: "Número de siniestro es requerido para tipo SINIESTRO" },
          { status: 400 }
        );
      }
    }

    if (data.tipoBaja === "VENTA") {
      if (!data.compradorNombre || !data.precioVenta) {
        return NextResponse.json(
          { error: "Nombre del comprador y precio de venta son requeridos para tipo VENTA" },
          { status: 400 }
        );
      }
    }

    // Crear registro de baja
    const bajaMoto = await prisma.bajaMoto.create({
      data: {
        motoId: id,
        tipoBaja: data.tipoBaja,
        fechaBaja: new Date(data.fechaBaja),
        motivo: data.motivo,
        numeroDenuncia: data.numeroDenuncia,
        comisaria: data.comisaria,
        fechaDenuncia: data.fechaDenuncia ? new Date(data.fechaDenuncia) : null,
        numeroSiniestro: data.numeroSiniestro,
        aseguradora: data.aseguradora,
        montoIndemnizacion: data.montoIndemnizacion,
        fechaSiniestro: data.fechaSiniestro ? new Date(data.fechaSiniestro) : null,
        compradorNombre: data.compradorNombre,
        compradorDNI: data.compradorDNI,
        compradorTelefono: data.compradorTelefono,
        precioVenta: data.precioVenta,
        formaPago: data.formaPago,
        archivoUrl: data.archivoUrl,
        notas: data.notas,
        registradoPor: userId || undefined,
      },
    });

    // Actualizar estado de la moto
    let estadoLegal = "BAJA_DEFINITIVA";
    if (data.tipoBaja === "ROBO") estadoLegal = "DENUNCIA_ROBO";
    if (data.tipoBaja === "SINIESTRO") estadoLegal = "SINIESTRO_TOTAL";

    await prisma.moto.update({
      where: { id },
      data: {
        estado: "baja",
        estadoLegal,
      },
    });

    // Registrar en historial
    await prisma.historialEstadoMoto.create({
      data: {
        motoId: id,
        estadoAnterior: moto.estado,
        estadoNuevo: "baja",
        motivo: `BAJA ${data.tipoBaja} - ${data.motivo || ""}`,
        usuarioId: userId || undefined,
      },
    });

    // Emit decommission event
    eventBus.emit(
      OPERATIONS.fleet.moto.decommission,
      "Moto",
      id,
      { tipoBaja: data.tipoBaja, estadoLegal, bajaId: bajaMoto.id },
      userId
    ).catch((err) => {
      console.error("Error emitting fleet.moto.decommission event:", err);
    });

    return NextResponse.json({ data: bajaMoto }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error registrando baja:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.view,
    "view",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const { id } = await context.params;

    const bajaMoto = await prisma.bajaMoto.findUnique({
      where: { motoId: id },
      include: {
        moto: {
          select: {
            id: true,
            marca: true,
            modelo: true,
            patente: true,
            estado: true,
            estadoLegal: true,
          },
        },
      },
    });

    if (!bajaMoto) {
      return NextResponse.json({ error: "Baja no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data: bajaMoto });
  } catch (err: unknown) {
    console.error("Error obteniendo baja:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
