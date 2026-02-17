import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { facturaCompraSchema } from "@/lib/validations";
import {
  validarCUIT,
  validarMontosFactura,
  validarFechasFactura,
  validarTipoComprobante,
  generarHashFactura,
  detectarDuplicado,
} from "@/lib/controles-internos";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.invoice.purchase.view,
    "view",
    ["ADMIN", "OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const search = url.searchParams.get("search") ?? "";
    const sortBy = url.searchParams.get("sortBy") ?? "fecha";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const estado = url.searchParams.get("estado");
    const proveedorId = url.searchParams.get("proveedorId");
    const tipo = url.searchParams.get("tipo");

    const allowedSorts = ["fecha", "vencimiento", "total", "razonSocial", "numero"];
    const orderByColumn = allowedSorts.includes(sortBy) ? sortBy : "fecha";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { razonSocial: { contains: search, mode: "insensitive" } },
        { numero: { contains: search, mode: "insensitive" } },
        { cuit: { contains: search, mode: "insensitive" } },
      ];
    }

    if (estado) where.estado = estado;
    if (proveedorId) where.proveedorId = proveedorId;
    if (tipo) where.tipo = tipo;

    const [data, total] = await Promise.all([
      prisma.facturaCompra.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderByColumn]: sortOrder },
        include: {
          proveedor: { select: { id: true, nombre: true } },
          moto: { select: { id: true, marca: true, modelo: true, patente: true } },
          creador: { select: { id: true, name: true, email: true } },
          aprobador: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.facturaCompra.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching facturas compra:", err);
    return NextResponse.json({
      error: "Error interno del servidor",
      data: [],
      total: 0,
      page: 1,
      limit: 15,
      totalPages: 0,
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.invoice.purchase.create,
    "create",
    ["ADMIN", "OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = facturaCompraSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fecha, vencimiento, caeVencimiento, motoId, proveedorId, ...rest } = parsed.data;

    // ═══ CONTROL 1: VALIDAR CUIT ═══
    if (rest.cuit) {
      const cuitValidation = validarCUIT(rest.cuit);
      if (!cuitValidation.valido) {
        return NextResponse.json(
          {
            error: "CUIT inválido",
            details: { cuit: [cuitValidation.error] },
            validaciones: { cuit: cuitValidation }
          },
          { status: 400 }
        );
      }
    }

    // ═══ CONTROL 2: VALIDAR MONTOS MATEMÁTICOS ═══
    const fechaDate = new Date(fecha);
    const vencimientoDate = vencimiento ? new Date(vencimiento) : null;
    const caeVencimientoDate = caeVencimiento ? new Date(caeVencimiento) : null;

    const total =
      rest.subtotal +
      rest.iva21 +
      rest.iva105 +
      rest.iva27 +
      rest.percepcionIVA +
      rest.percepcionIIBB +
      rest.impInterno +
      rest.noGravado +
      rest.exento;

    const validacionMontos = validarMontosFactura({
      subtotal: rest.subtotal,
      iva21: rest.iva21,
      iva105: rest.iva105,
      iva27: rest.iva27,
      percepcionIVA: rest.percepcionIVA,
      percepcionIIBB: rest.percepcionIIBB,
      impInterno: rest.impInterno,
      noGravado: rest.noGravado,
      exento: rest.exento,
      total,
    });

    if (!validacionMontos.valido) {
      return NextResponse.json(
        {
          error: "Validación matemática falló",
          details: { montos: validacionMontos.errores },
          validaciones: { montos: validacionMontos },
        },
        { status: 400 }
      );
    }

    // ═══ CONTROL 3: VALIDAR FECHAS ═══
    const validacionFechas = validarFechasFactura({
      fechaEmision: fechaDate,
      fechaVencimiento: vencimientoDate,
      caeVencimiento: caeVencimientoDate,
    });

    if (!validacionFechas.valido) {
      return NextResponse.json(
        {
          error: "Validación de fechas falló",
          details: { fechas: validacionFechas.errores },
          validaciones: { fechas: validacionFechas },
        },
        { status: 400 }
      );
    }

    // ═══ CONTROL 4: GENERAR HASH ÚNICO ═══
    const hashUnico = generarHashFactura({
      cuit: rest.cuit || null,
      tipo: rest.tipo,
      puntoVenta: rest.puntoVenta || null,
      numero: rest.numero,
    });

    // ═══ CONTROL 5: DETECTAR DUPLICADOS EXACTOS ═══
    try {
      const duplicadosExactos = await prisma.facturaCompra.findMany({
        where: {
          OR: [
            { hashUnico },
            ...(rest.cae ? [{ cae: rest.cae }] : []),
          ],
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
        },
      });

      if (duplicadosExactos.length > 0) {
        const mensajes = duplicadosExactos.map((dup) => {
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
              cuit: rest.cuit || null,
              tipo: rest.tipo,
              puntoVenta: rest.puntoVenta || null,
              numero: rest.numero,
              total,
              fecha: fechaDate,
              cae: rest.cae,
            }
          );
          return deteccion.mensajes;
        }).flat();

        return NextResponse.json(
          {
            error: "Factura duplicada",
            details: { duplicado: mensajes },
            duplicados: duplicadosExactos.map((d) => ({
              id: d.visibleId,
              estado: d.estado,
              fecha: d.fecha,
            })),
          },
          { status: 409 } // Conflict
        );
      }
    } catch (duplicadosError) {
      console.error("Error verificando duplicados:", duplicadosError);
      // Continuar para permitir la creación si falla la verificación
    }

    // ═══ CONTROL 6: VERIFICAR PERÍODO CERRADO ═══
    try {
      const mesFactura = fechaDate.getMonth() + 1;
      const anioFactura = fechaDate.getFullYear();

      const periodoCerrado = await prisma.periodoContable.findUnique({
        where: {
          mes_anio: {
            mes: mesFactura,
            anio: anioFactura,
          },
        },
      });

      if (periodoCerrado?.cerrado) {
        return NextResponse.json(
          {
            error: `El período ${mesFactura}/${anioFactura} está cerrado y no permite modificaciones`,
            details: {
              periodo: `Cerrado por ${periodoCerrado.cerradoPor} el ${periodoCerrado.fechaCierre}`,
            },
          },
          { status: 403 }
        );
      }
    } catch (periodoError) {
      console.warn("Error verificando período contable (continuando):", periodoError);
      // Continuar si no existe la tabla o hay error
    }

    // ═══ CONTROL 7: VALIDAR TIPO DE COMPROBANTE (WARNING ONLY) ═══
    let warnings: string[] = [];

    if (rest.cuit && proveedorId) {
      // Obtener configuración de la empresa
      const empresaConfig = await prisma.configuracionEmpresa.findUnique({
        where: { id: "default" },
      });

      // Obtener proveedor
      const proveedor = await prisma.proveedor.findUnique({
        where: { id: proveedorId },
      });

      if (empresaConfig && proveedor?.condicionIva) {
        const validacionTipo = validarTipoComprobante({
          condicionIvaEmisor: proveedor.condicionIva,
          condicionIvaReceptor: empresaConfig.condicionIva,
          tipoComprobante: rest.tipo,
        });

        warnings = validacionTipo.warnings;
      }
    }

    // ═══ CREAR FACTURA ═══
    const facturaCompra = await prisma.facturaCompra.create({
      data: {
        ...rest,
        total,
        fecha: fechaDate,
        vencimiento: vencimientoDate,
        caeVencimiento: caeVencimientoDate,
        motoId: motoId || null,
        proveedorId: proveedorId || null,
        hashUnico,
        estado: "BORRADOR",
        creadoPor: userId || null,
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        moto: { select: { id: true, marca: true, modelo: true, patente: true } },
      },
    });

    // ═══ AUDIT LOG ═══
    if (userId) {
      await prisma.auditLog.create({
        data: {
          entidad: "FacturaCompra",
          entidadId: facturaCompra.id,
          accion: "CREAR",
          valorNuevo: JSON.stringify({
            numero: rest.numero,
            razonSocial: rest.razonSocial,
            total,
          }),
          usuarioId: userId,
          facturaCompraId: facturaCompra.id,
        },
      });
    }

    // Emit event for purchase invoice creation
    eventBus.emit(
      OPERATIONS.invoice.purchase.create,
      "FacturaCompra",
      facturaCompra.id,
      {
        numero: rest.numero,
        razonSocial: rest.razonSocial,
        total,
        proveedorId: facturaCompra.proveedor?.id ?? null,
      },
      userId
    ).catch((err) => {
      console.error("Error emitting invoice.purchase.create event:", err);
    });

    return NextResponse.json(
      {
        data: facturaCompra,
        warnings,
        validaciones: {
          montos: validacionMontos,
          fechas: validacionFechas,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Error creating factura compra:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
