"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, Send, RotateCcw, Loader2, Bike, DollarSign, Wrench, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const quickSuggestions = [
  { icon: Bike, text: "Estado de la flota" },
  { icon: DollarSign, text: "Resumen financiero" },
  { icon: Wrench, text: "Alertas de mantenimiento" },
  { icon: TrendingUp, text: "Moto más rentable" },
];

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (messagesEndRef.current && scrollAreaRef.current) {
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

  // Get user initials for avatar
  const getUserInitial = () => "U"; // TODO: Get from session

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300",
          "bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white",
          "hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:scale-110",
          isOpen && "scale-0 opacity-0"
        )}
        title="Asistente IA"
        aria-label="Abrir asistente IA"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Chat Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex w-full flex-col bg-background p-0 sm:max-w-[420px]">
          {/* Header */}
          <SheetHeader className="flex-row items-center justify-between border-b bg-background px-5 py-3.5 shadow-sm space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-sm">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold tracking-tight">
                  Asistente MotoLibre
                </SheetTitle>
                <p className="text-xs text-muted-foreground">Datos en tiempo real</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-accent"
              onClick={handleNewConversation}
              title="Nueva conversación"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </SheetHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
            <div className="space-y-6 py-6">
              {messages.length === 0 && (
                <div className="space-y-8 pt-8">
                  <div className="text-center space-y-3">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 shadow-inner">
                      <Sparkles className="h-10 w-10 text-cyan-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">
                        Asistente MotoLibre
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground px-4">
                        Preguntame sobre la flota, finanzas, clientes o mantenimientos
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 px-2">
                    {quickSuggestions.map((s) => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.text}
                          onClick={() => handleSend(`¿${s.text}?`)}
                          className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:bg-accent hover:border-cyan-500/40 hover:shadow-sm active:scale-95"
                        >
                          <Icon className="h-5 w-5 text-muted-foreground group-hover:text-cyan-500 transition-colors" />
                          <span className="text-xs font-medium text-center leading-tight group-hover:text-foreground">
                            {s.text}
                          </span>
                        </button>
                      );
                    })}
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
                      "flex gap-3 animate-in fade-in-0 slide-in-from-bottom-3 duration-200",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Assistant Avatar */}
                    {message.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 ring-1 ring-cyan-500/30">
                        <Sparkles className="h-4 w-4 text-cyan-500" />
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={cn(
                        "rounded-xl text-[14px] leading-[1.6]",
                        message.role === "user"
                          ? "max-w-[80%] bg-gradient-to-br from-cyan-500 to-cyan-600 text-white px-4 py-3 shadow-sm"
                          : "max-w-[90%] bg-muted/50 border border-border/50 px-4 py-4"
                      )}
                    >
                      {message.role === "user" ? (
                        <p className="whitespace-pre-wrap">{text}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-3 prose-p:leading-[1.6] prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-[16px] prose-h1:mb-3 prose-h2:text-[16px] prose-h2:mb-2.5 prose-h3:text-[15px] prose-h3:mb-2 prose-ul:my-3 prose-ul:space-y-1.5 prose-ol:my-3 prose-ol:space-y-1.5 prose-li:my-0 prose-li:leading-relaxed prose-li:marker:text-cyan-500 prose-strong:font-semibold prose-strong:text-foreground prose-code:bg-muted prose-code:text-cyan-500 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-border prose-pre:p-4 prose-pre:rounded-lg prose-a:text-cyan-500 prose-a:no-underline prose-a:font-medium hover:prose-a:underline prose-hr:border-border/60 prose-hr:my-4 prose-table:text-sm prose-table:border-collapse prose-table:w-full prose-table:my-4 prose-thead:bg-muted prose-thead:border-b-2 prose-thead:border-border prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-[13px] prose-th:first:rounded-tl-lg prose-th:last:rounded-tr-lg prose-td:px-3 prose-td:py-2.5 prose-td:border-t prose-td:border-border prose-tr:transition-colors hover:prose-tr:bg-muted/50 prose-tbody>prose-tr:first:prose-td:first:rounded-bl-lg prose-tbody>prose-tr:last:prose-td:last:rounded-br-lg">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* User Avatar */}
                    {message.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {getUserInitial()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3 animate-in fade-in-0 duration-200">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 ring-1 ring-cyan-500/30">
                    <Sparkles className="h-4 w-4 text-cyan-500" />
                  </div>
                  <div className="max-w-[90%] rounded-xl bg-muted/50 border border-border/50 px-4 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse [animation-delay:0ms]" />
                        <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse [animation-delay:200ms]" />
                        <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse [animation-delay:400ms]" />
                      </div>
                      <span className="text-sm text-muted-foreground">Consultando datos...</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-center">
                  <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2.5">
                    <p className="text-xs text-red-400">
                      Error: {error.message || "No se pudo conectar con el asistente"}
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t bg-background p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Preguntá sobre tu negocio..."
                className="flex-1 rounded-full border border-input bg-background px-5 py-3 text-[14px] outline-none transition-all focus:border-cyan-500/60 focus:ring-4 focus:ring-cyan-500/10 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
