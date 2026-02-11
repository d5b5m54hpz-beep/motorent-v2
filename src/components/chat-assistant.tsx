"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, X, Send, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const quickSuggestions = [
  { emoji: "📊", text: "¿Cómo van las finanzas este mes?" },
  { emoji: "🏍️", text: "¿Qué motos necesitan service?" },
  { emoji: "💰", text: "¿Cuál es la moto más rentable?" },
  { emoji: "📋", text: "¿Hay contratos por vencer?" },
  { emoji: "⚠️", text: "¿Hay alertas pendientes?" },
  { emoji: "💲", text: "¿Debería ajustar los precios?" },
];

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleNewConversation = () => {
    setMessages([]);
    setInput("");
  };

  // Extract text content from message parts (AI SDK v6 UIMessage)
  const getMessageText = (message: { parts: Array<{ type: string; text?: string }> }) => {
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text" && !!p.text)
      .map((p) => p.text)
      .join("");
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105",
          "bg-cyan-500 hover:bg-cyan-600 text-white",
          "hover:shadow-[0_0_25px_rgba(35,224,255,0.4)]",
          isOpen && "scale-0 opacity-0"
        )}
        title="Asistente IA"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Chat Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex w-full flex-col p-0 sm:max-w-[450px]">
          {/* Header */}
          <SheetHeader className="flex-row items-center justify-between border-b px-4 py-3 space-y-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20">
                <Sparkles className="h-4 w-4 text-cyan-500" />
              </div>
              <SheetTitle className="text-base">Asistente IA</SheetTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNewConversation}
                title="Nueva conversación"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10">
                    <Sparkles className="h-6 w-6 text-cyan-500" />
                  </div>
                  <p className="font-medium">¡Hola! Soy tu asistente IA</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Preguntame sobre tu negocio y te doy datos en tiempo real
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickSuggestions.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => handleSend(s.text)}
                      className="rounded-full border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-accent hover:border-cyan-500/50"
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
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                      message.role === "user"
                        ? "bg-cyan-500/20 border border-cyan-500/30 rounded-br-sm"
                        : "bg-zinc-800/50 border border-zinc-700 rounded-bl-sm"
                    )}
                  >
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap">{text}</p>
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-2 prose-code:text-cyan-400 prose-strong:text-white">
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start animate-in fade-in-0 duration-300">
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl rounded-bl-sm px-4 py-3">
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
                <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                  Error: {error.message || "No se pudo conectar con el asistente"}
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Preguntale algo al asistente..."
                className="flex-1 rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 placeholder:text-muted-foreground"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 shrink-0 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
