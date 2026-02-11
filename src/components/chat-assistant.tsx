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
  { emoji: "📊", text: "Estado de la flota" },
  { emoji: "💰", text: "Finanzas del mes" },
  { emoji: "🔧", text: "Alertas de mantenimiento" },
  { emoji: "📈", text: "Moto más rentable" },
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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isLoading]);

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
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110",
          "bg-cyan-500 hover:bg-cyan-600 text-white",
          "hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]",
          isOpen && "scale-0 opacity-0"
        )}
        title="Asistente IA"
        aria-label="Abrir asistente IA"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Chat Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex w-full flex-col bg-card p-0 sm:max-w-[420px]">
          {/* Header */}
          <SheetHeader className="flex-row items-center justify-between border-b border-border/40 bg-card px-4 py-3 shadow-sm space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
                <Sparkles className="h-4.5 w-4.5 text-cyan-500" />
              </div>
              <SheetTitle className="text-base font-semibold tracking-tight">
                Asistente IA
              </SheetTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-accent"
                onClick={handleNewConversation}
                title="Nueva conversación"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-accent"
                onClick={() => setIsOpen(false)}
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-card px-4 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-6 pt-4">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10">
                    <Sparkles className="h-8 w-8 text-cyan-500" />
                  </div>
                  <p className="text-base font-semibold tracking-tight">
                    ¡Hola! Soy tu asistente IA
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Preguntame sobre tu negocio y te doy datos en tiempo real
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center px-2">
                  {quickSuggestions.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => handleSend(`¿${s.text}?`)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:border-cyan-500/50 hover:shadow-sm"
                    >
                      <span className="text-base">{s.emoji}</span>
                      <span>{s.text}</span>
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
                      "rounded-2xl px-4 py-2.5 text-sm",
                      message.role === "user"
                        ? "max-w-[80%] bg-cyan-500 text-white rounded-br-sm shadow-sm"
                        : "max-w-[85%] bg-muted text-foreground rounded-bl-sm border border-border/40"
                    )}
                  >
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-ul:my-2 prose-ul:space-y-1 prose-ol:my-2 prose-ol:space-y-1 prose-li:my-0.5 prose-li:leading-relaxed prose-strong:font-semibold prose-strong:text-foreground prose-code:bg-zinc-800 prose-code:text-cyan-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-hr:border-border/60 prose-hr:my-3">
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start animate-in fade-in-0 duration-300">
                <div className="rounded-2xl rounded-bl-sm bg-muted border border-border/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:0ms]" />
                      <div className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:150ms]" />
                      <div className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-xs text-muted-foreground">Analizando datos...</span>
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
          <div className="border-t border-border/40 bg-card p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Preguntale algo al asistente..."
                className="flex-1 rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 shrink-0 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm disabled:opacity-50"
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
