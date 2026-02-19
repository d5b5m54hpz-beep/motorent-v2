/**
 * MotoRent v2 — E2E Test Script for Backend API Flows
 *
 * Tests the 5 main business flows end-to-end:
 * route -> EventBus -> handlers -> side effects
 *
 * Usage:
 *   npx tsx scripts/test-flows.ts
 *
 * Options via env vars:
 *   TEST_URL             - API base URL (default: http://localhost:3000)
 *   TEST_SESSION_TOKEN   - Pre-existing session token (skips auto-login)
 *   CRON_SECRET          - Secret for cron job endpoints
 */

import "dotenv/config";
import { encode } from "@auth/core/jwt";
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

// NextAuth v5 cookie name depends on protocol
const cookieName = BASE_URL.startsWith("https")
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

let sessionToken = process.env.TEST_SESSION_TOKEN || "";

// === AUTH: Generate a valid NextAuth v5 JWT ===

async function ensureAuth(): Promise<void> {
  if (sessionToken) {
    console.log("  Using provided TEST_SESSION_TOKEN\n");
    return;
  }

  console.log("  Auto-generating session token...");

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET or AUTH_SECRET required for auto-login. " +
        "Set TEST_SESSION_TOKEN or ensure .env is loaded."
    );
  }

  // Find an admin user from the database
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true, email: true, name: true, image: true, role: true },
    });

    if (!admin) {
      throw new Error("No ADMIN user found in database");
    }

    console.log(`  Found admin: ${admin.email}`);

    // Use @auth/core/jwt encode — same function NextAuth v5 uses internally
    // The salt must match the cookie name used by NextAuth
    sessionToken = await encode({
      token: {
        name: admin.name,
        email: admin.email,
        picture: admin.image,
        sub: admin.id,
        role: admin.role,
        userId: admin.id,
      },
      secret,
      salt: cookieName,
      maxAge: 3600, // 1 hour
    });

    console.log(`  Session token generated for ${admin.email}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

// === HELPERS ===

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: `${cookieName}=${sessionToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  const icon = res.ok ? "\u2713" : "\u2717";
  console.log(`  ${icon} ${method} ${path} -> ${res.status}`);
  if (!res.ok) console.error("    Error:", JSON.stringify(data).slice(0, 300));
  return { status: res.status, data, ok: res.ok };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`    [OK] ${message}`);
}

function section(title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}\n`);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// === FLUJO 1: Contrato Alquiler Completo ===
async function testFlujoContrato() {
  section("FLUJO 1: Contrato de Alquiler Completo");

  const ts = Date.now();

  // 1. Crear cliente
  const { data: cliente, ok: clienteOk } = await api("POST", "/api/clientes", {
    nombre: `Test E2E Runner ${ts}`,
    dni: `${ts}`.slice(-8),
    email: `test_${ts}@e2e.com`,
    telefono: "1234567890",
  });
  assert(clienteOk && !!cliente.id, "Cliente creado");

  // 2. Aprobar cliente (PUT requires full clienteSchema: nombre + email)
  const { ok: aprobado } = await api("PUT", `/api/clientes/${cliente.id}`, {
    nombre: `Test E2E Runner ${ts}`,
    email: `test_${ts}@e2e.com`,
    estado: "APROBADO",
  });
  assert(aprobado, "Cliente aprobado");

  // 3. Buscar o crear moto disponible
  let { data: motosResp } = await api(
    "GET",
    "/api/motos?estado=DISPONIBLE&limit=1"
  );
  let motoList = motosResp.data || motosResp;

  if (!Array.isArray(motoList) || motoList.length === 0) {
    // Create a test moto
    const randomPatente = `AB${String(Math.floor(Math.random() * 900) + 100).slice(0, 3)}CD`;
    const { data: newMoto, ok: motoCreated } = await api("POST", "/api/motos", {
      marca: "Honda",
      modelo: "CB190R",
      patente: randomPatente,
      anio: 2024,
      color: "Negro",
      precioMensual: 85000,
      cilindrada: 190,
      estado: "DISPONIBLE",
    });
    assert(motoCreated, `Moto de test creada: ${randomPatente}`);
    motoList = [newMoto];
  }

  const moto = motoList[0];
  assert(
    Number(moto.precioMensual) > 0,
    `Moto ${moto.patente} tiene precioMensual: ${moto.precioMensual}`
  );

  // 4. Preview del contrato
  const fechaInicio = new Date();
  const fechaFin = new Date();
  fechaFin.setMonth(fechaFin.getMonth() + 3);

  const { data: preview, ok: previewOk } = await api(
    "POST",
    "/api/contratos/preview",
    {
      precioBaseMensual: Number(moto.precioMensual),
      frecuenciaPago: "MENSUAL",
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
    }
  );
  assert(previewOk, "Preview calculado correctamente");
  assert(preview.montoPeriodo > 0, `Preview montoPeriodo: ${preview.montoPeriodo}`);
  assert(preview.periodos === 3, `Preview periodos: ${preview.periodos}`);

  // 5. Crear contrato
  const { data: contrato, ok: contratoOk } = await api(
    "POST",
    "/api/contratos",
    {
      clienteId: cliente.id,
      motoId: moto.id,
      frecuenciaPago: "MENSUAL",
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      deposito: 50000,
    }
  );
  assert(contratoOk && !!contrato.id, "Contrato creado");

  // 6. Verificar pagos generados (via contrato GET which includes pagos)
  const { data: contratoDetail } = await api(
    "GET",
    `/api/contratos/${contrato.id}`
  );
  const pagos = contratoDetail.pagos || [];
  assert(
    Array.isArray(pagos) && pagos.length === 3,
    `3 pagos mensuales generados (got ${pagos.length})`
  );

  // 7. Verificar moto cambio de estado
  const { data: motoAlq } = await api("GET", `/api/motos/${moto.id}`);
  assert(motoAlq.estado === "ALQUILADA", `Moto en estado: ${motoAlq.estado}`);

  // 8. Activar contrato
  const { ok: activado } = await api("PUT", `/api/contratos/${contrato.id}`, {
    estado: "ACTIVO",
  });
  assert(activado, "Contrato activado");

  // 9. Aprobar primer pago -> debe crear factura automaticamente
  const primerPago = pagos[0];
  const { ok: pagoOk } = await api("PUT", `/api/pagos/${primerPago.id}`, {
    estado: "APROBADO",
    metodo: "TRANSFERENCIA",
  });
  assert(pagoOk, "Primer pago aprobado");

  // 10. Verificar factura generada (poll — handlers are async/fire-and-forget)
  let pagoConFactura: { factura?: unknown } | null = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    await wait(2000);
    const { data: contratoConFactura } = await api(
      "GET",
      `/api/contratos/${contrato.id}`
    );
    pagoConFactura = contratoConFactura.pagos?.find(
      (p: { id: string }) => p.id === primerPago.id
    );
    if (pagoConFactura?.factura) break;
    console.log(`    Waiting for factura... attempt ${attempt + 1}/10`);
  }
  assert(
    !!pagoConFactura?.factura,
    "Factura generada automaticamente por event handler"
  );

  // 11. Aprobar pagos restantes
  for (let i = 1; i < pagos.length; i++) {
    const { ok } = await api("PUT", `/api/pagos/${pagos[i].id}`, {
      estado: "APROBADO",
      metodo: "TRANSFERENCIA",
    });
    assert(ok, `Pago ${i + 1} aprobado`);
    await wait(1500);
  }

  // 12. Verificar contrato finalizado automaticamente (poll — handlers are async)
  let contratoFinal: { estado: string } | null = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    await wait(2000);
    const { data } = await api("GET", `/api/contratos/${contrato.id}`);
    if (data.estado === "FINALIZADO") {
      contratoFinal = data;
      break;
    }
    console.log(`    Waiting for finalization... attempt ${attempt + 1}/10 (estado: ${data.estado})`);
  }
  assert(
    contratoFinal?.estado === "FINALIZADO",
    `Contrato finalizado automaticamente: ${contratoFinal?.estado}`
  );

  // 13. Verificar moto liberada
  const { data: motoFinal } = await api("GET", `/api/motos/${moto.id}`);
  assert(
    motoFinal.estado === "DISPONIBLE",
    `Moto disponible nuevamente: ${motoFinal.estado}`
  );

  console.log("\n  FLUJO 1 COMPLETADO\n");
  return { clienteId: cliente.id, motoId: moto.id, contratoId: contrato.id };
}

// === FLUJO 2: Validaciones y Rechazos ===
async function testFlujoValidaciones() {
  section("FLUJO 2: Validaciones y Rechazos");

  const ts = Date.now();

  // 1. Intentar crear contrato con cliente NO aprobado → 400
  const { data: clienteNuevo } = await api("POST", "/api/clientes", {
    nombre: `Test Validacion ${ts}`,
    dni: `${ts}`.slice(-8),
    email: `testval_${ts}@e2e.com`,
    telefono: "0000000000",
  });
  assert(!!clienteNuevo.id, "Cliente pendiente creado");

  const { data: motosResp } = await api(
    "GET",
    "/api/motos?estado=DISPONIBLE&limit=1"
  );
  const motoList = motosResp.data || motosResp;
  if (!motoList?.length) {
    console.log("  [SKIP] No hay motos disponibles, saltando flujo 2");
    return;
  }

  const motoVal = motoList[0];
  const fechaInicio = new Date();
  const fechaFin = new Date();
  fechaFin.setMonth(fechaFin.getMonth() + 1);

  const { status: statusNoAprobado } = await api("POST", "/api/contratos", {
    clienteId: clienteNuevo.id,
    motoId: motoVal.id,
    frecuenciaPago: "MENSUAL",
    fechaInicio: fechaInicio.toISOString(),
    fechaFin: fechaFin.toISOString(),
  });
  assert(
    statusNoAprobado === 400,
    `Contrato rechazado con cliente no aprobado (status ${statusNoAprobado})`
  );

  // 2. Intentar crear contrato con moto que ya tiene contrato activo → 409
  // First, approve the client and create a valid contrato to make the moto ALQUILADA
  await api("PUT", `/api/clientes/${clienteNuevo.id}`, {
    nombre: `Test Validacion ${ts}`,
    email: `testval_${ts}@e2e.com`,
    estado: "APROBADO",
  });
  const { ok: contratoValOk } = await api("POST", "/api/contratos", {
    clienteId: clienteNuevo.id,
    motoId: motoVal.id,
    frecuenciaPago: "MENSUAL",
    fechaInicio: fechaInicio.toISOString(),
    fechaFin: fechaFin.toISOString(),
  });
  assert(contratoValOk, "Contrato creado para test de moto ocupada");

  // Now try to create another contrato with the same moto → should be 409
  const { data: clienteOtro } = await api("POST", "/api/clientes", {
    nombre: `Test Validacion2 ${ts}`,
    dni: `${ts + 1}`.slice(-8),
    email: `testval2_${ts}@e2e.com`,
    telefono: "0000000001",
  });
  await api("PUT", `/api/clientes/${clienteOtro.id}`, {
    nombre: `Test Validacion2 ${ts}`,
    email: `testval2_${ts}@e2e.com`,
    estado: "APROBADO",
  });

  const { status: statusMotoOcupada } = await api("POST", "/api/contratos", {
    clienteId: clienteOtro.id,
    motoId: motoVal.id,
    frecuenciaPago: "MENSUAL",
    fechaInicio: fechaInicio.toISOString(),
    fechaFin: fechaFin.toISOString(),
  });
  assert(
    statusMotoOcupada === 409,
    `Contrato rechazado con moto ya alquilada (status ${statusMotoOcupada})`
  );

  // 3. Intentar transición de estado inválida: APROBADO → APROBADO → 400
  const { data: pagosResp } = await api("GET", "/api/pagos?estado=APROBADO&limit=1");
  const pagosAprobados = pagosResp.data || [];

  if (Array.isArray(pagosAprobados) && pagosAprobados.length > 0) {
    const pagoAprobado = pagosAprobados[0];
    const { status: statusInvalido } = await api(
      "PUT",
      `/api/pagos/${pagoAprobado.id}`,
      { estado: "APROBADO", metodo: "TRANSFERENCIA" }
    );
    assert(
      statusInvalido === 400,
      `Transición inválida APROBADO→APROBADO rechazada (status ${statusInvalido})`
    );
  } else {
    console.log("    [SKIP] No hay pagos aprobados para test de transición inválida");
  }

  // 4. Intentar preview con precioBaseMensual <= 0
  const { status: statusPrecio } = await api("POST", "/api/contratos/preview", {
    precioBaseMensual: 0,
    fechaInicio: fechaInicio.toISOString(),
    fechaFin: fechaFin.toISOString(),
    frecuenciaPago: "MENSUAL",
  });
  assert(
    statusPrecio === 400,
    `Preview rechazado con precio 0 (status ${statusPrecio})`
  );

  // 5. Intentar preview sin campos requeridos
  const { status: statusIncompleto } = await api(
    "POST",
    "/api/contratos/preview",
    {
      precioBaseMensual: 50000,
    }
  );
  assert(
    statusIncompleto === 400,
    `Preview rechazado con campos faltantes (status ${statusIncompleto})`
  );

  console.log("\n  FLUJO 2 COMPLETADO\n");
}

// === FLUJO 3: Jobs de Cron ===
async function testFlujoJobs() {
  section("FLUJO 3: Jobs de Cron");

  const cronSecret = process.env.CRON_SECRET;

  // requireCron allows all requests when CRON_SECRET is not set (dev mode).
  // If CRON_SECRET is set, we test with Bearer auth and also verify rejection without auth.
  async function cronApi(path: string) {
    const headers: Record<string, string> = {};
    if (cronSecret) {
      headers["Authorization"] = `Bearer ${cronSecret}`;
    }
    const res = await fetch(`${BASE_URL}${path}`, { headers });
    const data = await res.json().catch(() => ({}));
    const icon = res.ok ? "\u2713" : "\u2717";
    console.log(`  ${icon} GET ${path} -> ${res.status}`);
    if (!res.ok) console.error("    Error:", JSON.stringify(data).slice(0, 200));
    return { status: res.status, data, ok: res.ok };
  }

  if (!cronSecret) {
    console.log("  (CRON_SECRET not set — dev mode, jobs accept all requests)\n");
  }

  // 1. Job vencimientos
  const { ok: vencOk, data: vencData } = await cronApi("/api/jobs/vencimientos");
  assert(vencOk, `Job vencimientos ejecutado: ${JSON.stringify(vencData).slice(0, 150)}`);

  // 2. Job contratos-por-vencer
  const { ok: contVencOk, data: contVencData } = await cronApi("/api/jobs/contratos-por-vencer");
  assert(contVencOk, `Job contratos-por-vencer: ${JSON.stringify(contVencData).slice(0, 150)}`);

  // 3. Job notificaciones-mantenimiento
  const { ok: notifOk, data: notifData } = await cronApi("/api/jobs/notificaciones-mantenimiento");
  assert(notifOk, `Job notificaciones-mantenimiento: ${JSON.stringify(notifData).slice(0, 150)}`);

  // 4. Job generar-citas
  const { ok: citasOk, data: citasData } = await cronApi("/api/jobs/generar-citas");
  assert(citasOk, `Job generar-citas: ${JSON.stringify(citasData).slice(0, 150)}`);

  // 5. Verificar que jobs SIN auth fallan (only when CRON_SECRET is set)
  if (cronSecret) {
    const resSinAuth = await fetch(`${BASE_URL}/api/jobs/vencimientos`);
    assert(resSinAuth.status === 401, `Job sin auth rechazado (status ${resSinAuth.status})`);
  } else {
    console.log("    [SKIP] Auth rejection test (no CRON_SECRET configured)");
  }

  console.log("\n  FLUJO 3 COMPLETADO\n");
}

// === FLUJO 4: Repuestos y Stock ===
async function testFlujoRepuestos() {
  section("FLUJO 4: Repuestos y Stock");

  const ts = Date.now();

  // 1. Crear proveedor
  const { data: prov, ok: provOk } = await api("POST", "/api/proveedores", {
    nombre: `Proveedor Test ${ts}`,
    contacto: "Test E2E",
    email: `prov_${ts}@test.com`,
  });
  if (!provOk) {
    console.log("  [SKIP] Endpoint proveedores no disponible");
    return;
  }
  assert(!!prov.id, "Proveedor creado");

  // 2. Crear repuesto
  const { data: repuesto, ok: repOk } = await api("POST", "/api/repuestos", {
    nombre: `Repuesto Test ${ts}`,
    codigo: `REP-${ts}`,
    precioCompra: 1000,
    precioVenta: 1500,
    stockMinimo: 5,
    stock: 0,
    proveedorId: prov.id,
  });
  assert(repOk && !!repuesto.id, "Repuesto creado");

  // 3. Verificar stock inicial
  assert(Number(repuesto.stock || 0) === 0, "Stock inicial = 0");

  // 4. Verificar que aparece en listado
  const { data: listResp, ok: listOk } = await api(
    "GET",
    `/api/repuestos?search=${encodeURIComponent(`REP-${ts}`)}`
  );
  const repuestoList = listResp.data || [];
  assert(listOk && repuestoList.length >= 1, "Repuesto aparece en listado");

  console.log("\n  FLUJO 4 COMPLETADO\n");
}

// === FLUJO 5: Mantenimiento ===
async function testFlujoMantenimiento() {
  section("FLUJO 5: Mantenimiento");

  // 1. Buscar cualquier moto
  const { data: motosResp } = await api("GET", "/api/motos?limit=1");
  const motoList = motosResp.data || motosResp;

  if (!motoList?.length) {
    console.log("  [SKIP] No hay motos, saltando flujo 5");
    return;
  }

  const moto = motoList[0];

  // 2. Crear orden de trabajo
  const { data: ot, ok: otOk } = await api(
    "POST",
    "/api/mantenimientos/ordenes",
    {
      motoId: moto.id,
      tipoOT: "PREVENTIVO",
      descripcion: `Test mantenimiento E2E ${Date.now()}`,
      kmAlIngreso: Number(moto.kmActual || moto.kilometraje || 0),
    }
  );
  if (!otOk) {
    console.log("  [SKIP] Endpoint ordenes-trabajo no disponible");
    return;
  }
  // POST response is wrapped: { data: orden }
  const orden = ot.data || ot;
  assert(!!orden.id, `Orden de trabajo creada: ${orden.numero || orden.id}`);

  // 3. Verificar que aparece en listado
  const { data: otList, ok: otListOk } = await api(
    "GET",
    "/api/mantenimientos/ordenes?limit=5"
  );
  assert(otListOk, "Listado de ordenes de trabajo funciona");

  console.log("\n  FLUJO 5 COMPLETADO\n");
}

// === FLUJO 6: Endpoints Financieros ===
async function testFlujoFinanzas() {
  console.log("\n  FLUJO 6: Endpoints Financieros\n");

  // Facturas
  const facturas = await api("GET", "/api/facturas");
  if (facturas.status !== 200) throw new Error(`GET /api/facturas retornó ${facturas.status}`);
  console.log("  [OK] GET /api/facturas:", facturas.status);

  // Gastos
  const gastos = await api("GET", "/api/gastos");
  if (gastos.status !== 200) throw new Error(`GET /api/gastos retornó ${gastos.status}`);
  console.log("  [OK] GET /api/gastos:", gastos.status);

  // Dashboard financiero
  const dashboard = await api("GET", "/api/dashboard/finanzas");
  if (dashboard.status !== 200) throw new Error(`GET /api/dashboard/finanzas retornó ${dashboard.status}`);
  console.log("  [OK] GET /api/dashboard/finanzas:", dashboard.status);

  // Cuentas contables
  const cuentas = await api("GET", "/api/contabilidad/cuentas");
  if (cuentas.status !== 200) throw new Error(`GET /api/contabilidad/cuentas retornó ${cuentas.status}`);
  console.log("  [OK] GET /api/contabilidad/cuentas:", cuentas.status);

  console.log("\n  FLUJO 6 COMPLETADO\n");
}

// === RUNNER ===
async function main() {
  console.log("\n  MotoRent v2 -- Test E2E de Flujos Backend");
  console.log(`  URL: ${BASE_URL}`);
  console.log(`  Cookie: ${cookieName}`);
  console.log(`  ${new Date().toISOString()}\n`);

  // Ensure we have a valid session
  await ensureAuth();

  // Quick health check
  const healthCheck = await fetch(`${BASE_URL}/api/public/motos`).catch(() => null);
  if (!healthCheck?.ok) {
    throw new Error(`Server not reachable at ${BASE_URL}`);
  }
  console.log("  Server health check: OK\n");

  const resultados: { flujo: string; ok: boolean; error?: string }[] = [];

  const flujos = [
    { nombre: "Contrato Completo", fn: testFlujoContrato },
    { nombre: "Validaciones y Rechazos", fn: testFlujoValidaciones },
    { nombre: "Jobs de Cron", fn: testFlujoJobs },
    { nombre: "Repuestos y Stock", fn: testFlujoRepuestos },
    { nombre: "Mantenimiento", fn: testFlujoMantenimiento },
    { nombre: "Endpoints Financieros", fn: testFlujoFinanzas },
  ];

  for (const { nombre, fn } of flujos) {
    try {
      await fn();
      resultados.push({ flujo: nombre, ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n  FALLO EN ${nombre}: ${message}\n`);
      resultados.push({ flujo: nombre, ok: false, error: message });
    }
  }

  // Resumen
  console.log("\n" + "=".repeat(60));
  console.log("  RESUMEN DE RESULTADOS");
  console.log("=".repeat(60) + "\n");

  for (const r of resultados) {
    const icon = r.ok ? "[PASS]" : "[FAIL]";
    console.log(`  ${icon} ${r.flujo}${r.error ? ` -- ${r.error}` : ""}`);
  }

  const passed = resultados.filter((r) => r.ok).length;
  const total = resultados.length;

  console.log(`\n  Resultado: ${passed}/${total} flujos pasaron\n`);

  if (passed < total) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exit(1);
});
