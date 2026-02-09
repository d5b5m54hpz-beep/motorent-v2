import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { auth } from "@/lib/auth";
import { contratoSchema } from "@/lib/validations";
import {
  calcularPreciosContrato,
  generarFechasVencimiento,
} from "@/lib/contratos";

const ALLOWED_SORT_COLUMNS = [
  "fechaInicio",
  "fechaFin",
  "montoPeriodo",
  "montoTotal",
  "estado",
  "createdAt",
];

// GET /api/contratos — list contratos (paginated, searchable, sortable)
export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "15");
  const search = url.searchParams.get("search") ?? "";
  const sortBy = url.searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const estado = url.searchParams.get("estado");

  const orderByColumn = ALLOWED_SORT_COLUMNS.includes(sortBy)
    ? sortBy
    : "createdAt";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { id: { contains: search, mode: "insensitive" } },
      { cliente: { nombre: { contains: search, mode: "insensitive" } } },
      { moto: { patente: { contains: search, mode: "insensitive" } } },
      { moto: { marca: { contains: search, mode: "insensitive" } } },
      { moto: { modelo: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (estado) {
    where.estado = estado;
  }

  const [data, total] = await Promise.all([
    prisma.contrato.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [orderByColumn]: sortOrder },
      include: {
        cliente: {
          select: { nombre: true, email: true, dni: true },
        },
        moto: {
          select: { marca: true, modelo: true, patente: true },
        },
        _count: {
          select: { pagos: true },
        },
      },
    }),
    prisma.contrato.count({ where }),
  ]);

  // Calcular monto cobrado por cada contrato
  const dataWithStats = await Promise.all(
    data.map(async (contrato) => {
      const pagos = await prisma.pago.findMany({
        where: { contratoId: contrato.id },
        select: { monto: true, estado: true },
      });

      const montoCobrado = pagos
        .filter((p) => p.estado === "pagado")
        .reduce((sum, p) => sum + p.monto, 0);

      return {
        ...contrato,
        montoCobrado,
      };
    })
  );

  return NextResponse.json({
    data: dataWithStats,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/contratos — create contrato with pricing and payment generation
export async function POST(req: NextRequest) {
  try {
    // Auth check - cualquier usuario autenticado puede crear contratos
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });
    }

    const body = await req.json();

    // If user is CLIENTE, get their clienteId automatically (ignore body.clienteId)
    let clienteId = body.clienteId;

    if (user.role === "CLIENTE") {
      // Find or create cliente for this user
      let cliente = await prisma.cliente.findUnique({
        where: { userId: user.id },
      });

      if (!cliente) {
        // Auto-create cliente
        cliente = await prisma.cliente.create({
          data: {
            userId: user.id,
            nombre: user.name,
            email: user.email,
          },
        });

        console.log("✅ Cliente auto-created for contract:", user.id);
      }

      clienteId = cliente.id;
      body.clienteId = clienteId; // Override body to ensure validation passes
    }

    const parsed = contratoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos invalidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { motoId, fechaInicio, fechaFin, frecuenciaPago, deposito, notas, renovacionAuto } = parsed.data;

    // Validar cliente existe
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Validar moto existe y está disponible
    const moto = await prisma.moto.findUnique({ where: { id: motoId } });
    if (!moto) {
      return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
    }

    if (moto.estado !== "disponible") {
      return NextResponse.json(
        { error: "La moto no esta disponible para alquiler" },
        { status: 409 }
      );
    }

    // Obtener pricing config activo
    const pricingConfig = await prisma.pricingConfig.findUnique({
      where: { id: "default" },
    });

    if (!pricingConfig) {
      return NextResponse.json(
        { error: "Configuracion de precios no encontrada" },
        { status: 500 }
      );
    }

    // Calcular precios
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    const calculo = calcularPreciosContrato(
      moto.precioMensual,
      inicio,
      fin,
      frecuenciaPago,
      pricingConfig
    );

    // Generar fechas de vencimiento
    const fechasVencimiento = generarFechasVencimiento(
      inicio,
      calculo.periodos,
      frecuenciaPago
    );

    // Crear contrato, pagos y actualizar moto en transacción
    const contrato = await prisma.$transaction(async (tx) => {
      // Crear contrato
      const nuevoContrato = await tx.contrato.create({
        data: {
          clienteId,
          motoId,
          fechaInicio: inicio,
          fechaFin: fin,
          frecuenciaPago,
          montoPeriodo: calculo.montoPeriodo,
          montoTotal: calculo.montoTotal,
          deposito,
          descuentoAplicado: calculo.descuentoTotal,
          notas,
          renovacionAuto,
          estado: "pendiente",
        },
        include: {
          cliente: { select: { nombre: true, email: true, dni: true } },
          moto: { select: { marca: true, modelo: true, patente: true } },
          _count: { select: { pagos: true } },
        },
      });

      // Generar pagos (batch para mejor performance)
      await tx.pago.createMany({
        data: fechasVencimiento.map((fechaVencimiento) => ({
          contratoId: nuevoContrato.id,
          monto: calculo.montoPeriodo,
          metodo: "pendiente",
          estado: "pendiente",
          vencimientoAt: fechaVencimiento,
        })),
      });

      // Actualizar estado de moto a alquilada
      await tx.moto.update({
        where: { id: motoId },
        data: { estado: "alquilada" },
      });

      return nuevoContrato;
    }, {
      timeout: 20000, // 20 segundos (por defecto es 5000ms)
    });

    return NextResponse.json(contrato, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating contrato:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
