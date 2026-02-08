import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@motorent.com" },
    update: {},
    create: {
      email: "admin@motorent.com",
      name: "Admin MotoRent",
      password: adminPassword,
      provider: "credentials",
      role: Role.ADMIN,
    },
  });
  console.log("✅ Admin:", admin.email);

  // Default pricing
  await prisma.pricingConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      precioBaseMensual: 180000,
      descuentoSemanal: 10,
      descuentoMeses3: 5,
      descuentoMeses6: 10,
      descuentoMeses9: 15,
      descuentoMeses12: 20,
    },
  });
  console.log("✅ Pricing config created");

  // Sample motos
  const motos = [
    { marca: "Honda", modelo: "CB125F", patente: "AA123BB", anio: 2023 },
    { marca: "Yamaha", modelo: "FZ25", patente: "AC456DD", anio: 2024 },
    { marca: "Bajaj", modelo: "Dominar 250", patente: "AE789FF", anio: 2023 },
    { marca: "Honda", modelo: "XR150", patente: "AG012HH", anio: 2022 },
    { marca: "Yamaha", modelo: "MT-03", patente: "AI345JJ", anio: 2024 },
  ];

  for (const moto of motos) {
    await prisma.moto.upsert({
      where: { patente: moto.patente },
      update: {},
      create: moto,
    });
  }
  console.log(`✅ ${motos.length} motos created`);

  console.log("🎉 Seed completed!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
