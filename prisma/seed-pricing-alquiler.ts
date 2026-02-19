import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function seedPricingAlquiler() {
  console.log("🏁 Seeding Pricing Engine V2...");

  await prisma.costoOperativoConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      seguroRC: 15000,
      seguroRoboIncendio: 25000,
      seguroTotal: 40000,
      patenteAnual: 120000,
      vtvAnual: 35000,
      otrosImpuestosAnuales: 0,
      costoIoTMensual: 8000,
      mantenimientoManoObra: 20000,
      mantenimientoRepuestos: 35000,
      mantenimientoTotal: 55000,
      reservaContingenciaPct: 5,
      costoMotoParadaDiario: 0,
      diasParadaEstimadoMes: 2,
      comisionCobranzaPct: 4,
      costoAdminPorMoto: 15000,
      morosidadEstimadaPct: 3,
      costoAlmacenamientoPorMoto: 5000,
      tasaInflacionMensualEst: 3,
      costoCapitalAnualPct: 0,
      tipoCambioUSD: 1200,
      tipoCambioFuente: "MANUAL",
    },
  });

  const planes = [
    {
      nombre: "Flex",
      codigo: "FLEX_3M",
      descripcion: "Alquilá tu moto por 3 meses. Ideal para probar.",
      duracionMeses: 3,
      esRentToOwn: false,
      descuentoPct: 0,
      depositoMeses: 1,
      depositoConDescuento: false,
      permiteSemanal: true,
      permiteQuincenal: true,
      permiteMensual: true,
      recargoSemanalPct: 10,
      recargoQuincenalPct: 5,
      recargoEfectivoPct: 5,
      recargoMercadoPagoPct: 0,
      activo: true,
      orden: 1,
      destacado: false,
    },
    {
      nombre: "Semestral",
      codigo: "SEMI_6M",
      descripcion: "6 meses con descuento.",
      duracionMeses: 6,
      esRentToOwn: false,
      descuentoPct: 8,
      depositoMeses: 1,
      depositoConDescuento: false,
      permiteSemanal: true,
      permiteQuincenal: true,
      permiteMensual: true,
      recargoSemanalPct: 10,
      recargoQuincenalPct: 5,
      recargoEfectivoPct: 5,
      recargoMercadoPagoPct: 0,
      activo: true,
      orden: 2,
      destacado: false,
    },
    {
      nombre: "Anual",
      codigo: "ANUAL_12M",
      descripcion: "12 meses, el mejor descuento.",
      duracionMeses: 12,
      esRentToOwn: false,
      descuentoPct: 15,
      depositoMeses: 1,
      depositoConDescuento: false,
      permiteSemanal: true,
      permiteQuincenal: true,
      permiteMensual: true,
      recargoSemanalPct: 8,
      recargoQuincenalPct: 4,
      recargoEfectivoPct: 5,
      recargoMercadoPagoPct: 0,
      activo: true,
      orden: 3,
      destacado: true,
    },
    {
      nombre: "Tu Moto",
      codigo: "TUMOTO_24M",
      descripcion: "24 cuotas y la moto es tuya.",
      duracionMeses: 24,
      esRentToOwn: true,
      descuentoPct: 20,
      depositoMeses: 2,
      depositoConDescuento: false,
      permiteSemanal: true,
      permiteQuincenal: true,
      permiteMensual: true,
      recargoSemanalPct: 8,
      recargoQuincenalPct: 4,
      recargoEfectivoPct: 5,
      recargoMercadoPagoPct: 0,
      activo: true,
      orden: 4,
      destacado: false,
    },
  ];

  for (const plan of planes) {
    await prisma.planAlquiler.upsert({
      where: { codigo: plan.codigo },
      update: plan,
      create: plan,
    });
  }

  console.log("✅ Pricing Engine V2 seed OK — 4 planes + 1 config creados");
}

seedPricingAlquiler()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
