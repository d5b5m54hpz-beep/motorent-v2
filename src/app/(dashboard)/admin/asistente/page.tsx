"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, Send, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const quickSuggestions = [
  { emoji: "📊", text: "¿Cómo van las finanzas este mes?" },
  { emoji: "🏍️", text: "¿Qué motos necesitan service?" },
  { emoji: "💰", text: "¿Cuál es la moto más rentable?" },
  { emoji: "📋", text: "¿Hay contratos por vencer?" },
  { emoji: "⚠️", text: "¿Hay alertas pendientes?" },
  { emoji: "💲", text: "¿Debería ajustar los precios?" },
  { emoji: "👥", text: "Dame un resumen de clientes" },
  { emoji: "📈", text: "¿Cómo fueron los ingresos este trimestre?" },
];

export default function AsistentePage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || isLoading) return;
    setInput("");
    sendMessage({ text: msg });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  // Extract text content from message parts (AI SDK v6 UIMessage)
  const getMessageText = (message: { parts: Array<{ type: string; text?: string }> }) => {
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text" && !!p.text)
      .map((p) => p.text)
      .join("");
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Asistente IA</h1>
            <span className="rounded-md bg-cyan-500/20 px-2 py-0.5 text-xs font-medium text-cyan-500">
              IA
            </span>
          </div>
          <p className="text-muted-foreground">
            Consultá datos del negocio en tiempo real con inteligencia artificial
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setMessages([]); setInput(""); }}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Nueva conversación
        </Button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto rounded-lg border bg-card p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10">
              <Sparkles className="h-8 w-8 text-cyan-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">¡Hola! Soy tu asistente IA</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Tengo acceso a todos los datos de MotoLibre en tiempo real.
                Preguntame lo que necesites sobre tu flota, finanzas, clientes o contratos.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {quickSuggestions.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSend(s.text)}
                  className="rounded-full border bg-background px-4 py-2 text-sm transition-colors hover:bg-accent hover:border-cyan-500/50"
                >
                  {s.emoji} {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const text = getMessageText(message);
          if (!text) return null;
          return (
            <div
              key={message.id}
              className={cn(
                "flex animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl px-5 py-3 text-sm",
                  message.role === "user"
                    ? "bg-cyan-500/20 border border-cyan-500/30 rounded-br-sm"
                    : "bg-zinc-800/50 border border-zinc-700 rounded-bl-sm"
                )}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap">{text}</p>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-2 prose-code:text-cyan-400 prose-strong:text-white prose-table:text-sm">
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in-0 duration-300">
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl rounded-bl-sm px-5 py-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:0ms]" />
                <div className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:150ms]" />
                <div className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-2">
              Error: {error.message || "No se pudo conectar con el asistente"}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-4">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Preguntale algo al asistente..."
            className="flex-1 rounded-lg border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-11 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white px-5"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
