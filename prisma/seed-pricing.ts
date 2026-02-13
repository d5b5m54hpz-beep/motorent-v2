import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedPricing() {
  console.log("🏁 Iniciando seed de pricing...");

  // ─── 1. Listas de Precios ────────────────────────────────────
  console.log("📝 Creando listas de precios...");

  const listas = [
    {
      nombre: "B2C Retail",
      codigo: "B2C",
      tipo: "RETAIL" as const,
      prioridad: 0,
      descripcion: "Precio público para venta directa y e-commerce",
    },
    {
      nombre: "Rider Activo",
      codigo: "RIDER",
      tipo: "PREFERENCIAL" as const,
      prioridad: 10,
      descuentoGlobalPct: 0.10,
      descripcion: "Riders con moto en alquiler activo. Descuento base 10%, más bonificaciones por plan y antigüedad",
    },
    {
      nombre: "Taller Externo",
      codigo: "TALLER",
      tipo: "MAYORISTA" as const,
      prioridad: 5,
      descuentoGlobalPct: 0.20,
      descripcion: "Talleres mecánicos externos con acuerdo comercial",
    },
    {
      nombre: "Uso Interno Flota",
      codigo: "INTERNO",
      tipo: "INTERNO" as const,
      prioridad: 20,
      descripcion: "Para uso interno en mantenimiento de flota propia. Precio = costo + 5%",
    },
  ];

  for (const lista of listas) {
    await prisma.listaPrecio.upsert({
      where: { codigo: lista.codigo },
      update: lista,
      create: lista,
    });
  }

  console.log(`✅ ${listas.length} listas de precios creadas`);

  // ─── 2. Reglas de Markup ──────────────────────────────────────
  console.log("📐 Creando reglas de markup...");

  const reglasMarkup = [
    {
      nombre: "Banda Ultra Low (< $2.000)",
      costoBandaDesde: 0,
      costoBandaHasta: 2000,
      multiplicador: 3.0,
      redondeo: "NEAREST_50",
      prioridad: 10,
    },
    {
      nombre: "Banda Low ($2.000 - $15.000)",
      costoBandaDesde: 2000,
      costoBandaHasta: 15000,
      multiplicador: 2.5,
      redondeo: "NEAREST_50",
      prioridad: 9,
    },
    {
      nombre: "Banda Medium ($15.000 - $50.000)",
      costoBandaDesde: 15000,
      costoBandaHasta: 50000,
      multiplicador: 2.0,
      redondeo: "NEAREST_99",
      prioridad: 8,
    },
    {
      nombre: "Banda High ($50.000 - $150.000)",
      costoBandaDesde: 50000,
      costoBandaHasta: 150000,
      multiplicador: 1.85,
      redondeo: "NEAREST_99",
      prioridad: 7,
    },
    {
      nombre: "Banda Premium (> $150.000)",
      costoBandaDesde: 150000,
      costoBandaHasta: null,
      multiplicador: 1.65,
      redondeo: "NEAREST_99",
      prioridad: 6,
    },
  ];

  for (const regla of reglasMarkup) {
    const existing = await prisma.reglaMarkup.findFirst({
      where: { nombre: regla.nombre },
    });

    if (!existing) {
      await prisma.reglaMarkup.create({ data: regla });
    }
  }

  console.log(`✅ ${reglasMarkup.length} reglas de markup creadas`);

  // ─── 3. Reglas de Descuento ───────────────────────────────────
  console.log("💰 Creando reglas de descuento...");

  const reglasDescuento = [
    // Por plan de alquiler
    {
      nombre: "Descuento Plan Básico",
      tipoCondicion: "PLAN_ALQUILER" as const,
      planAlquiler: "BASICO",
      tipoDescuento: "PORCENTAJE" as const,
      valorDescuento: 0.05,
      prioridad: 10,
    },
    {
      nombre: "Descuento Plan Premium",
      tipoCondicion: "PLAN_ALQUILER" as const,
      planAlquiler: "PREMIUM",
      tipoDescuento: "PORCENTAJE" as const,
      valorDescuento: 0.10,
      prioridad: 11,
    },
    {
      nombre: "Descuento Plan VIP",
      tipoCondicion: "PLAN_ALQUILER" as const,
      planAlquiler: "VIP",
      tipoDescuento: "PORCENTAJE" as const,
      valorDescuento: 0.15,
      prioridad: 12,
    },

    // Por antigüedad
    {
      nombre: "Antigüedad 6+ meses",
      tipoCondicion: "ANTIGUEDAD" as const,
      antiguedadMeses: 6,
      tipoDescuento: "PORCENTAJE" as const,
      valorDescuento: 0.02,
      acumulable: true,
      prioridad: 5,
    },
    {
      nombre: "Antigüedad 1+ año",
      tipoCondicion: "ANTIGUEDAD" as const,
      antiguedadMeses: 12,
      tipoDescuento: "PORCENTAJE" as const,
      valorDescuento: 0.05,
      acumulable: true,
      prioridad: 6,
    },
    {
      nombre: "Antigüedad 2+ años",
      tipoCondicion: "ANTIGUEDAD" as const,
      antiguedadMeses: 24,
      tipoDescuento: "PORCENTAJE" as const,
      valorDescuento: 0.08,
      acumulable: true,
      prioridad: 7,
    },

    // Por cantidad
    {
      nombre: "Descuento 10+ unidades",
      tipoCondicion: "CANTIDAD" as const,
      cantidadMinima: 10,
      tipoDescuento: "PORCENTAJE" as const,
      valorDescuento: 0.05,
      acumulable: true,
      prioridad: 3,
    },
    {
      nombre: "Descuento 50+ unidades",
      tipoCondicion: "CANTIDAD" as const,
      cantidadMinima: 50,
      tipoDescuento: "PORCENTAJE" as const,
      valorDescuento: 0.10,
      acumulable: true,
      prioridad: 4,
    },
  ];

  for (const regla of reglasDescuento) {
    const existing = await prisma.reglaDescuento.findFirst({
      where: { nombre: regla.nombre },
    });

    if (!existing) {
      await prisma.reglaDescuento.create({ data: regla });
    }
  }

  console.log(`✅ ${reglasDescuento.length} reglas de descuento creadas`);

  // ─── 4. Grupos de Clientes ────────────────────────────────────
  console.log("👥 Creando grupos de clientes...");

  // Primero obtener las listas de precios creadas
  const listaRider = await prisma.listaPrecio.findUnique({
    where: { codigo: "RIDER" },
  });
  const listaTaller = await prisma.listaPrecio.findUnique({
    where: { codigo: "TALLER" },
  });
  const listaInterno = await prisma.listaPrecio.findUnique({
    where: { codigo: "INTERNO" },
  });

  const grupos = [
    {
      nombre: "Riders Activos",
      descripcion: "Riders con contrato de alquiler activo",
      listaPrecioId: listaRider?.id,
    },
    {
      nombre: "Talleres Externos",
      descripcion: "Talleres mecánicos con acuerdo comercial",
      listaPrecioId: listaTaller?.id,
    },
    {
      nombre: "Uso Interno",
      descripcion: "Operaciones internas de flota",
      listaPrecioId: listaInterno?.id,
    },
  ];

  for (const grupo of grupos) {
    await prisma.grupoCliente.upsert({
      where: { nombre: grupo.nombre },
      update: grupo,
      create: grupo,
    });
  }

  console.log(`✅ ${grupos.length} grupos de clientes creados`);

  console.log("\n✨ Seed de pricing completado exitosamente!\n");
}

seedPricing()
  .catch((e) => {
    console.error("❌ Error en seed de pricing:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
