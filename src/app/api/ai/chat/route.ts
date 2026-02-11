import { streamText, stepCountIs, convertToModelMessages, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { requireRole } from "@/lib/authz";
import { toolRegistry, getSystemPromptForRole, type UserRole } from "@/lib/ai";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY no está configurada");
}

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function POST(req: Request) {
  const { error, userId, role } = await requireRole([
    "ADMIN",
    "OPERADOR",
    "CONTADOR",
    "RRHH_MANAGER",
    "COMERCIAL",
    "CLIENTE",
  ]);
  if (error) return error;

  if (!checkRateLimit(userId!)) {
    return new Response(
      JSON.stringify({ error: "Límite de mensajes alcanzado. Esperá un minuto." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = await req.json();

  // Get tools for user's role
  const userRole = role as UserRole;
  const availableTools = toolRegistry.getToolsForRole(userRole);
  const availableModules = toolRegistry.getModulesForRole(userRole);

  // Convert Map to Record for streamText
  const tools = Object.fromEntries(availableTools);

  const result = await streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: getSystemPromptForRole(userRole, availableModules),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
