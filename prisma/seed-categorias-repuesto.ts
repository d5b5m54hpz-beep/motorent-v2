import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding categorías de repuesto con configuración de márgenes...");

  const categorias = [
    { categoria: "FRENOS",       nombre: "Frenos",             margenObjetivo: 0.45, margenMinimo: 0.30, markupDefault: 1.82,  arancelImpo: 0.16, ncmDefault: "8714.10.00" },
    { categoria: "MOTOR",        nombre: "Motor",              margenObjetivo: 0.50, margenMinimo: 0.35, markupDefault: 2.0,   arancelImpo: 0.16, ncmDefault: "8409.91.00" },
    { categoria: "SUSPENSION",   nombre: "Suspensión",         margenObjetivo: 0.50, margenMinimo: 0.35, markupDefault: 2.0,   arancelImpo: 0.16, ncmDefault: "8714.10.00" },
    { categoria: "TRANSMISION",  nombre: "Transmisión",        margenObjetivo: 0.50, margenMinimo: 0.35, markupDefault: 2.0,   arancelImpo: 0.16, ncmDefault: "8714.10.00" },
    { categoria: "ELECTRICO",    nombre: "Eléctrico",          margenObjetivo: 0.50, margenMinimo: 0.35, markupDefault: 2.0,   arancelImpo: 0.16, ncmDefault: "8512.20.00" },
    { categoria: "NEUMATICOS",   nombre: "Neumáticos",         margenObjetivo: 0.30, margenMinimo: 0.15, markupDefault: 1.43,  arancelImpo: 0.16, ncmDefault: "4011.40.00" },
    { categoria: "FILTROS",      nombre: "Filtros",            margenObjetivo: 0.60, margenMinimo: 0.45, markupDefault: 2.5,   arancelImpo: 0.16, ncmDefault: "8421.23.00" },
    { categoria: "ACEITES",      nombre: "Aceites y Lubricantes", margenObjetivo: 0.35, margenMinimo: 0.20, markupDefault: 1.54, arancelImpo: 0.14, ncmDefault: "2710.19.00" },
    { categoria: "GENERAL",      nombre: "General",            margenObjetivo: 0.40, margenMinimo: 0.25, markupDefault: 1.67,  arancelImpo: 0.16, ncmDefault: "8714.10.00" },
  ];

  for (const c of categorias) {
    await prisma.categoriaRepuestoConfig.upsert({
      where: { categoria: c.categoria },
      update: { ...c },
      create: { ...c },
    });
  }

  console.log(`✅ ${categorias.length} categorías configuradas`);
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
