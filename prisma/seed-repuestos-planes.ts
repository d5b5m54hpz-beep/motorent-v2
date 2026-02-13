import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Repuestos mecánicos esenciales ─────────────────────────────────────────

const REPUESTOS = [
  { codigo: "REP-ACE-001", nombre: "Aceite Motor 20W-50 1L", categoria: "MOTOR", unidad: "litros", precioCompra: 3500, stockMinimo: 20, vidaUtilKm: 5000, stock: 50 },
  { codigo: "REP-FIL-001", nombre: "Filtro de Aire Moto 110cc", categoria: "MOTOR", unidad: "unidad", precioCompra: 1500, stockMinimo: 15, vidaUtilKm: 10000, stock: 15 },
  { codigo: "REP-BUJ-001", nombre: "Bujía NGK C7HSA", categoria: "MOTOR", unidad: "unidad", precioCompra: 800, stockMinimo: 20, vidaUtilKm: 10000, stock: 20 },
  { codigo: "REP-FRE-001", nombre: "Zapatas de Freno Trasero 110cc (par)", categoria: "FRENOS", unidad: "par", precioCompra: 2000, stockMinimo: 10, vidaUtilKm: 15000, stock: 10 },
  { codigo: "REP-FRE-002", nombre: "Pastillas de Freno Disco 110cc (juego)", categoria: "FRENOS", unidad: "juego", precioCompra: 3000, stockMinimo: 10, vidaUtilKm: 12000, stock: 10 },
  { codigo: "REP-TRA-001", nombre: "Kit Arrastre 428H (cadena+corona+piñón)", categoria: "TRANSMISION", unidad: "juego", precioCompra: 5000, stockMinimo: 5, vidaUtilKm: 20000, stock: 5 },
  { codigo: "REP-TRA-002", nombre: "Cadena 428H 118 eslabones", categoria: "TRANSMISION", unidad: "unidad", precioCompra: 2500, stockMinimo: 5, vidaUtilKm: 20000, stock: 5 },
  { codigo: "REP-TRA-003", nombre: "Lubricante Cadena Spray 250ml", categoria: "TRANSMISION", unidad: "unidad", precioCompra: 1800, stockMinimo: 15, vidaUtilKm: 5000, stock: 15 },
  { codigo: "REP-NEU-001", nombre: "Cubierta Delantera 250-17", categoria: "NEUMATICOS", unidad: "unidad", precioCompra: 8000, stockMinimo: 5, vidaUtilKm: 25000, stock: 5 },
  { codigo: "REP-NEU-002", nombre: "Cubierta Trasera 275-17", categoria: "NEUMATICOS", unidad: "unidad", precioCompra: 9000, stockMinimo: 5, vidaUtilKm: 20000, stock: 5 },
  { codigo: "REP-NEU-003", nombre: "Cámara de Aire R17", categoria: "NEUMATICOS", unidad: "unidad", precioCompra: 1200, stockMinimo: 10, vidaUtilKm: 25000, stock: 10 },
  { codigo: "REP-ELE-001", nombre: "Batería 12V 5Ah Gel", categoria: "ELECTRICO", unidad: "unidad", precioCompra: 6000, stockMinimo: 3, vidaUtilKm: 30000, stock: 3 },
  { codigo: "REP-ELE-002", nombre: "Lámpara Faro 12V 35W", categoria: "ELECTRICO", unidad: "unidad", precioCompra: 400, stockMinimo: 10, vidaUtilKm: null, stock: 10 },
  { codigo: "REP-CAB-001", nombre: "Cable Acelerador 110cc", categoria: "GENERAL", unidad: "unidad", precioCompra: 800, stockMinimo: 5, vidaUtilKm: 20000, stock: 5 },
  { codigo: "REP-CAB-002", nombre: "Cable Freno Delantero 110cc", categoria: "GENERAL", unidad: "unidad", precioCompra: 800, stockMinimo: 5, vidaUtilKm: 20000, stock: 5 },
  { codigo: "REP-CAB-003", nombre: "Cable Freno Trasero 110cc", categoria: "GENERAL", unidad: "unidad", precioCompra: 800, stockMinimo: 5, vidaUtilKm: 20000, stock: 5 },
  { codigo: "REP-CAB-004", nombre: "Cable Embrague 110cc", categoria: "GENERAL", unidad: "unidad", precioCompra: 800, stockMinimo: 5, vidaUtilKm: 20000, stock: 5 },
  { codigo: "REP-MOT-001", nombre: "Junta Tapa Válvulas 110cc", categoria: "MOTOR", unidad: "unidad", precioCompra: 500, stockMinimo: 5, vidaUtilKm: null, stock: 5 },
  { codigo: "REP-MOT-002", nombre: "Retén Válvulas 110cc (juego)", categoria: "MOTOR", unidad: "juego", precioCompra: 600, stockMinimo: 5, vidaUtilKm: null, stock: 5 },
  { codigo: "REP-SUS-001", nombre: "Retén Horquilla Delantera (par)", categoria: "SUSPENSION", unidad: "par", precioCompra: 1200, stockMinimo: 5, vidaUtilKm: 25000, stock: 5 },
  { codigo: "REP-GEN-001", nombre: "Tornillería General Kit", categoria: "GENERAL", unidad: "juego", precioCompra: 300, stockMinimo: 10, vidaUtilKm: null, stock: 10 },
];

// ─── Planes de mantenimiento ────────────────────────────────────────────────

const PLANES = [
  { nombre: "Service Básico", tipo: "BASICO" as const, descripcion: "Service preventivo básico cada 5.000 km. Incluye cambio de aceite, lubricación de cadena y verificaciones generales.", kmDesde: 0, kmHasta: 4999 },
  { nombre: "Service Intermedio", tipo: "INTERMEDIO" as const, descripcion: "Service preventivo intermedio cada 10.000 km. Incluye todo el básico más reemplazo de filtro, bujía y regulaciones.", kmDesde: 5000, kmHasta: 9999 },
  { nombre: "Service Mayor", tipo: "MAYOR" as const, descripcion: "Service preventivo mayor cada 20.000 km. Incluye todo el intermedio más reemplazo de kit arrastre, frenos y evaluación general.", kmDesde: 10000, kmHasta: 19999 },
];

// ─── Tareas por plan con repuestos vinculados ───────────────────────────────

type TareaConRepuestos = {
  nombre: string;
  descripcion?: string;
  categoria: "MOTOR" | "FRENOS" | "TRANSMISION" | "ELECTRICO" | "NEUMATICOS" | "SUSPENSION" | "CARROCERIA" | "GENERAL";
  orden: number;
  obligatoria: boolean;
  tiempoEstimado?: number;
  repuestos: {
    codigo: string;
    cantidad: number;
    obligatorio: boolean;
    observaciones?: string;
  }[];
};

const TAREAS_BASICO: TareaConRepuestos[] = [
  { nombre: "Cambio de aceite motor (0.8L)", categoria: "MOTOR", orden: 1, obligatoria: true, tiempoEstimado: 15, repuestos: [
    { codigo: "REP-ACE-001", cantidad: 0.8, obligatorio: true },
  ]},
  { nombre: "Limpieza colador/tamiz de aceite", categoria: "MOTOR", orden: 2, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
  { nombre: "Limpieza del filtro de aire", categoria: "MOTOR", orden: 3, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
  { nombre: "Lubricación de cadena de transmisión", categoria: "TRANSMISION", orden: 4, obligatoria: true, tiempoEstimado: 5, repuestos: [
    { codigo: "REP-TRA-003", cantidad: 0.5, obligatorio: true },
  ]},
  { nombre: "Ajuste de tensión de cadena", categoria: "TRANSMISION", orden: 5, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
  { nombre: "Verificación y ajuste freno delantero", categoria: "FRENOS", orden: 6, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
  { nombre: "Verificación y ajuste freno trasero", categoria: "FRENOS", orden: 7, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
  { nombre: "Verificación presión neumáticos", categoria: "NEUMATICOS", orden: 8, obligatoria: true, tiempoEstimado: 5, repuestos: [] },
  { nombre: "Inspección visual de cubiertas", categoria: "NEUMATICOS", orden: 9, obligatoria: true, tiempoEstimado: 5, repuestos: [] },
  { nombre: "Verificación de luces", categoria: "ELECTRICO", orden: 10, obligatoria: true, tiempoEstimado: 5, repuestos: [
    { codigo: "REP-ELE-002", cantidad: 1, obligatorio: false, observaciones: "Solo si está quemada" },
  ]},
  { nombre: "Verificación de bocina", categoria: "ELECTRICO", orden: 11, obligatoria: true, tiempoEstimado: 2, repuestos: [] },
  { nombre: "Control cables (acelerador, frenos)", categoria: "GENERAL", orden: 12, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
  { nombre: "Verificación apriete tornillería", categoria: "GENERAL", orden: 13, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
  { nombre: "Registro de kilometraje", categoria: "GENERAL", orden: 14, obligatoria: true, tiempoEstimado: 2, repuestos: [] },
];

const TAREAS_INTERMEDIO: TareaConRepuestos[] = [
  { nombre: "Reemplazo filtro de aire", categoria: "MOTOR", orden: 15, obligatoria: true, tiempoEstimado: 10, repuestos: [
    { codigo: "REP-FIL-001", cantidad: 1, obligatorio: true },
  ]},
  { nombre: "Reemplazo/calibración bujía", categoria: "MOTOR", orden: 16, obligatoria: true, tiempoEstimado: 10, repuestos: [
    { codigo: "REP-BUJ-001", cantidad: 1, obligatorio: true },
  ]},
  { nombre: "Regulación de válvulas", categoria: "MOTOR", orden: 17, obligatoria: true, tiempoEstimado: 30, repuestos: [
    { codigo: "REP-MOT-001", cantidad: 1, obligatorio: false, observaciones: "Solo si la junta está dañada" },
  ]},
  { nombre: "Ajuste carburador/ralentí", categoria: "MOTOR", orden: 18, obligatoria: true, tiempoEstimado: 15, repuestos: [] },
  { nombre: "Limpieza respiradero cárter", categoria: "MOTOR", orden: 19, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
  { nombre: "Medición desgaste pastillas/zapatas", categoria: "FRENOS", orden: 20, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
  { nombre: "Lubricación de cables", categoria: "GENERAL", orden: 21, obligatoria: true, tiempoEstimado: 15, repuestos: [
    { codigo: "REP-TRA-003", cantidad: 0.3, obligatorio: true },
  ]},
  { nombre: "Inspección suspensión", categoria: "SUSPENSION", orden: 22, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
  { nombre: "Verificación batería y conexiones", categoria: "ELECTRICO", orden: 23, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
  { nombre: "Inspección rodamientos dirección", categoria: "GENERAL", orden: 24, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
];

const TAREAS_MAYOR: TareaConRepuestos[] = [
  { nombre: "Reemplazo kit de arrastre", categoria: "TRANSMISION", orden: 25, obligatoria: true, tiempoEstimado: 30, repuestos: [
    { codigo: "REP-TRA-001", cantidad: 1, obligatorio: true },
  ]},
  { nombre: "Reemplazo zapatas/pastillas freno", categoria: "FRENOS", orden: 26, obligatoria: true, tiempoEstimado: 20, repuestos: [
    { codigo: "REP-FRE-001", cantidad: 1, obligatorio: true },
    { codigo: "REP-FRE-002", cantidad: 1, obligatorio: true },
  ]},
  { nombre: "Evaluación/reemplazo cubiertas", categoria: "NEUMATICOS", orden: 27, obligatoria: true, tiempoEstimado: 40, repuestos: [
    { codigo: "REP-NEU-001", cantidad: 1, obligatorio: false, observaciones: "Solo si desgaste > 70%" },
    { codigo: "REP-NEU-002", cantidad: 1, obligatorio: false, observaciones: "Solo si desgaste > 70%" },
    { codigo: "REP-NEU-003", cantidad: 2, obligatorio: false, observaciones: "Solo si se cambian cubiertas" },
  ]},
  { nombre: "Reemplazo cables deteriorados", categoria: "GENERAL", orden: 28, obligatoria: true, tiempoEstimado: 30, repuestos: [
    { codigo: "REP-CAB-001", cantidad: 1, obligatorio: false, observaciones: "Solo si deteriorado" },
    { codigo: "REP-CAB-002", cantidad: 1, obligatorio: false, observaciones: "Solo si deteriorado" },
    { codigo: "REP-CAB-003", cantidad: 1, obligatorio: false, observaciones: "Solo si deteriorado" },
    { codigo: "REP-CAB-004", cantidad: 1, obligatorio: false, observaciones: "Solo si deteriorado" },
  ]},
  { nombre: "Evaluación/reemplazo batería", categoria: "ELECTRICO", orden: 29, obligatoria: true, tiempoEstimado: 15, repuestos: [
    { codigo: "REP-ELE-001", cantidad: 1, obligatorio: false, observaciones: "Solo si no carga" },
  ]},
  { nombre: "Revisión cadena distribución", categoria: "MOTOR", orden: 30, obligatoria: true, tiempoEstimado: 20, repuestos: [] },
  { nombre: "Revisión integral motor", categoria: "MOTOR", orden: 31, obligatoria: true, tiempoEstimado: 30, repuestos: [
    { codigo: "REP-MOT-002", cantidad: 1, obligatorio: false, observaciones: "Solo si hay fuga" },
  ]},
  { nombre: "Revisión sistema de escape", categoria: "MOTOR", orden: 32, obligatoria: true, tiempoEstimado: 10, repuestos: [] },
  { nombre: "Inspección embrague centrífugo", categoria: "MOTOR", orden: 33, obligatoria: true, tiempoEstimado: 15, repuestos: [] },
  { nombre: "Revisión bujes y rulemanes ruedas", categoria: "GENERAL", orden: 34, obligatoria: true, tiempoEstimado: 20, repuestos: [] },
  { nombre: "Evaluación general: continuidad vs reemplazo", categoria: "GENERAL", orden: 35, obligatoria: true, tiempoEstimado: 15, repuestos: [] },
];

async function main() {
  console.log("🔧 Seeding repuestos y planes de mantenimiento...\n");

  // 1. Create/update repuestos
  console.log("📦 Creando repuestos...");
  const repuestoMap = new Map<string, string>(); // codigo -> id

  for (const rep of REPUESTOS) {
    const existing = await prisma.repuesto.findFirst({ where: { codigo: rep.codigo } });
    if (existing) {
      await prisma.repuesto.update({
        where: { id: existing.id },
        data: {
          nombre: rep.nombre,
          categoria: rep.categoria,
          unidad: rep.unidad,
          precioCompra: rep.precioCompra,
          stockMinimo: rep.stockMinimo,
          vidaUtilKm: rep.vidaUtilKm,
          stock: rep.stock,
        },
      });
      repuestoMap.set(rep.codigo, existing.id);
      console.log(`  ✅ ${rep.codigo} — ${rep.nombre} (actualizado)`);
    } else {
      const created = await prisma.repuesto.create({
        data: {
          nombre: rep.nombre,
          codigo: rep.codigo,
          categoria: rep.categoria,
          unidad: rep.unidad,
          precioCompra: rep.precioCompra,
          precioVenta: Math.round(rep.precioCompra * 1.3), // 30% markup
          stockMinimo: rep.stockMinimo,
          vidaUtilKm: rep.vidaUtilKm,
          stock: rep.stock,
        },
      });
      repuestoMap.set(rep.codigo, created.id);
      console.log(`  ✅ ${rep.codigo} — ${rep.nombre} (creado)`);
    }
  }

  // 2. Create/update planes de mantenimiento
  console.log("\n📋 Creando planes de mantenimiento...");
  const planMap = new Map<string, string>(); // tipo -> id

  for (const plan of PLANES) {
    const existing = await prisma.planMantenimiento.findFirst({ where: { tipo: plan.tipo } });
    if (existing) {
      await prisma.planMantenimiento.update({
        where: { id: existing.id },
        data: { nombre: plan.nombre, descripcion: plan.descripcion, kmDesde: plan.kmDesde, kmHasta: plan.kmHasta },
      });
      planMap.set(plan.tipo, existing.id);
      console.log(`  ✅ ${plan.nombre} (actualizado)`);
    } else {
      const created = await prisma.planMantenimiento.create({
        data: plan,
      });
      planMap.set(plan.tipo, created.id);
      console.log(`  ✅ ${plan.nombre} (creado)`);
    }
  }

  // 3. Create tareas and link repuestos
  const tareasConfig: { tipo: string; tareas: TareaConRepuestos[] }[] = [
    { tipo: "BASICO", tareas: TAREAS_BASICO },
    { tipo: "INTERMEDIO", tareas: [...TAREAS_BASICO, ...TAREAS_INTERMEDIO] },
    { tipo: "MAYOR", tareas: [...TAREAS_BASICO, ...TAREAS_INTERMEDIO, ...TAREAS_MAYOR] },
  ];

  for (const { tipo, tareas } of tareasConfig) {
    const planId = planMap.get(tipo);
    if (!planId) continue;

    console.log(`\n🔨 Configurando tareas para ${tipo}...`);

    // Delete existing tareas for this plan (clean slate)
    await prisma.repuestoTareaPlan.deleteMany({
      where: { tareaPlan: { planId } },
    });
    await prisma.tareaPlan.deleteMany({ where: { planId } });

    for (const tarea of tareas) {
      const createdTarea = await prisma.tareaPlan.create({
        data: {
          planId,
          nombre: tarea.nombre,
          descripcion: tarea.descripcion,
          categoria: tarea.categoria,
          orden: tarea.orden,
          obligatoria: tarea.obligatoria,
          tiempoEstimado: tarea.tiempoEstimado,
        },
      });

      // Link repuestos via RepuestoTareaPlan
      for (const rep of tarea.repuestos) {
        const repuestoId = repuestoMap.get(rep.codigo);
        if (!repuestoId) {
          console.log(`  ⚠️  Repuesto ${rep.codigo} no encontrado, skipping`);
          continue;
        }

        const repuestoData = REPUESTOS.find(r => r.codigo === rep.codigo);

        await prisma.repuestoTareaPlan.create({
          data: {
            tareaPlanId: createdTarea.id,
            repuestoId,
            cantidad: rep.cantidad,
          },
        });
      }

      const repCount = tarea.repuestos.length;
      console.log(`  ✅ #${tarea.orden} ${tarea.nombre}${repCount > 0 ? ` (${repCount} repuesto${repCount > 1 ? "s" : ""})` : ""}`);
    }
  }

  // 4. Summary
  const totalRepuestos = await prisma.repuesto.count();
  const totalPlanes = await prisma.planMantenimiento.count();
  const totalTareas = await prisma.tareaPlan.count();
  const totalVinculaciones = await prisma.repuestoTareaPlan.count();

  console.log("\n═══════════════════════════════════════════════");
  console.log("📊 Resumen:");
  console.log(`  Repuestos: ${totalRepuestos}`);
  console.log(`  Planes: ${totalPlanes}`);
  console.log(`  Tareas: ${totalTareas}`);
  console.log(`  Vinculaciones tarea→repuesto: ${totalVinculaciones}`);
  console.log("═══════════════════════════════════════════════");
  console.log("\n🎉 Seed de repuestos y planes completado!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
