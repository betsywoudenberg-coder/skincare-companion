import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { formatDateTime, cn } from "@/lib/utils";
import { Send, Trash2, Sparkles, BookOpen, Stethoscope } from "lucide-react";

const CONTEXTS = [
  { id: "general", label: "Skincare", icon: Sparkles, description: "Questions, advice, product help" },
  { id: "log-analysis", label: "Log Analysis", icon: BookOpen, description: "Analyze your recent logs" },
  { id: "derm", label: "Derm Prep", icon: Stethoscope, description: "Appointment questions" },
];

const STARTERS = [
  "How is my skin adapting to tretinoin based on my recent logs?",
  "Is it okay to apply Cyspera on a tret night?",
  "My anterior malar zone is showing bumps — should I be concerned?",
  "What's the best order for my AM routine?",
  "How should I adjust my routine before my next derm visit?",
  "My skin felt very dry this morning — what should I do tonight?",
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
        isUser ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border text-foreground rounded-bl-sm"
      )}>
        {msg.content.split("\n").map((line, i) => (
          <p key={i} className={cn(i > 0 && "mt-2", line.startsWith("- ") || line.startsWith("• ") ? "pl-2" : "")}>{line || <br />}</p>
        ))}
        <p className={cn("text-xs mt-1.5 opacity-60", isUser ? "text-right" : "")}>{formatDateTime(msg.createdAt)}</p>
      </div>
    </div>
  );
}

export default function Chat() {
  const [context, setContext] = useState("general");
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({ queryKey: ["/api/chat", context] });

  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      const r = await apiRequest("POST", `/api/chat/${context}`, { message: msg });
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chat", context] }),
    onError: () => queryClient.invalidateQueries({ queryKey: ["/api/chat", context] }),
  });

  const clearMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", `/api/chat/${context}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chat", context] }),
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    const msg = input.trim();
    if (!msg || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(msg);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
  };

  const currentCtx = CONTEXTS.find(c => c.id === context)!;

  return (
    <div className="flex flex-col h-[calc(100dvh-8.5rem)] -mx-4 -my-5">
      {/* Context tabs */}
      <div className="px-4 pt-4 pb-3 border-b border-border bg-background shrink-0">
        <div className="flex gap-2">
          {CONTEXTS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setContext(id)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                context === id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 bg-card")}
              data-testid={`context-${id}`}>
              <Icon size={13} />{label}
            </button>
          ))}
          <button onClick={() => clearMutation.mutate()} className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors" title="Clear chat" data-testid="button-clear">
            <Trash2 size={14} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{currentCtx.description} — your routine &amp; history are always in context</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading && <p className="text-center text-muted-foreground text-sm py-10">Loading…</p>}

        {!isLoading && messages.length === 0 && (
          <div className="space-y-3">
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-1">Your AI skincare coach is ready.</p>
              <p className="text-xs text-muted-foreground">Your full routine, history, and recent logs are always available to me.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Try asking:</p>
              {STARTERS.map((s) => (
                <button key={s} onClick={() => { setInput(s); }} className="w-full text-left px-3 py-2.5 rounded-lg border border-border text-sm text-foreground bg-card hover:border-primary/40 hover:bg-primary/5 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}

        {sendMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-muted-foreground">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border bg-background shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about your skin, routine, or logs…"
            className="min-h-[44px] max-h-[120px] text-sm resize-none flex-1"
            data-testid="input-message"
          />
          <Button onClick={send} disabled={!input.trim() || sendMutation.isPending} size="sm" className="h-11 px-4 shrink-0" data-testid="button-send">
            <Send size={16} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-right">⌘↵ to send</p>
      </div>
    </div>
  );
}
