import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { registrarPagoSchema } from "@/lib/validations";
import { enviarFacturaEmail } from "@/lib/email";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/pagos/[id] — get single pago with full details
export async function GET(req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  const pago = await prisma.pago.findUnique({
    where: { id },
    include: {
      contrato: {
        include: {
          cliente: {
            include: {
              user: { select: { name: true, email: true, phone: true } },
            },
          },
          moto: true,
        },
      },
    },
  });

  if (!pago) {
    return NextResponse.json(
      { error: "Pago no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(pago);
}

// PUT /api/pagos/[id] — registrar/actualizar pago
export async function PUT(req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = registrarPagoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos invalidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { estado, metodo, mpPaymentId, comprobante, notas } = parsed.data;

    const existing = await prisma.pago.findUnique({
      where: { id },
      include: {
        contrato: {
          include: {
            pagos: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    // Verificar permisos: solo ADMIN puede modificar pagos aprobados
    if (existing.estado === "aprobado" || existing.estado === "reembolsado") {
      const { error: adminError } = await requireRole(["ADMIN"]);
      if (adminError) {
        return NextResponse.json(
          { error: "Solo ADMIN puede modificar pagos aprobados o reembolsados" },
          { status: 403 }
        );
      }
    }

    // Actualizar pago en transacción
    let facturaId: string | null = null;

    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar pago
      const pagoActualizado = await tx.pago.update({
        where: { id },
        data: {
          estado,
          metodo: metodo || existing.metodo,
          mpPaymentId: mpPaymentId || existing.mpPaymentId,
          comprobante: comprobante || existing.comprobante,
          notas: notas || existing.notas,
          pagadoAt: estado === "aprobado" ? new Date() : existing.pagadoAt,
        },
        include: {
          contrato: {
            include: {
              cliente: { select: { nombre: true, email: true, dni: true } },
              moto: { select: { marca: true, modelo: true, patente: true } },
            },
          },
        },
      });

      // Si se aprobó, generar factura automáticamente
      if (estado === "aprobado" && existing.estado !== "aprobado") {
        // Solo si no estaba aprobado antes (para evitar duplicados)

        // Obtener el último número de factura para calcular el siguiente
        const ultimaFactura = await tx.factura.findFirst({
          orderBy: { numero: "desc" },
        });

        const proximoNumero = ultimaFactura
          ? String(parseInt(ultimaFactura.numero) + 1).padStart(8, "0")
          : "00000001";

        // Calcular montos según tipo de factura
        const tipo = "B" as "A" | "B" | "C"; // Por defecto tipo B
        const montoTotal = pagoActualizado.monto;
        const montoNeto = tipo === "A" ? montoTotal / 1.21 : montoTotal;
        const montoIva = tipo === "A" ? montoTotal - montoNeto : 0;

        // Crear la factura
        const factura = await tx.factura.create({
          data: {
            numero: proximoNumero,
            tipo,
            puntoVenta: 1,
            montoNeto,
            montoIva,
            montoTotal,
            emitida: false, // Hasta que se integre AFIP
            pagoId: pagoActualizado.id,
          },
        });

        // Guardar el ID de la factura para enviar email después
        facturaId = factura.id;
      }

      // Verificar si todos los pagos del contrato están aprobados
      if (estado === "aprobado") {
        const todosLosPagos = await tx.pago.findMany({
          where: { contratoId: existing.contratoId },
        });

        const todosPagados = todosLosPagos.every(
          (p) => p.estado === "aprobado" || p.estado === "cancelado"
        );

        if (todosPagados) {
          // Marcar contrato como finalizado y moto como disponible
          await tx.contrato.update({
            where: { id: existing.contratoId },
            data: { estado: "finalizado" },
          });

          await tx.moto.update({
            where: { id: existing.contrato.motoId },
            data: { estado: "disponible" },
          });
        }
      }

      return pagoActualizado;
    });

    // Enviar email con factura (fire and forget - no bloquea la respuesta)
    if (facturaId) {
      enviarFacturaEmail(facturaId).catch((error) => {
        console.error("Error sending factura email (non-blocking):", error);
      });
    }

    return NextResponse.json(resultado);
  } catch (error: unknown) {
    console.error("Error updating pago:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
