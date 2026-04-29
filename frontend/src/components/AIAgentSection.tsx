import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Bot, Send, User, Sparkles, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

type Message = { role: "user" | "assistant"; content: string };

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const examplePrompts = [
  "What projects have you worked on?",
  "What are your strengths?",
  "Tell me about your experience with LLMs",
];

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hey! 👋 I'm the digital version of Nitheesh. Ask me anything about my experience, skills, or projects!",
};

// How much prior history to send to the backend on each request.
// Large enough for multi-turn context, small enough to keep payload tight.
const MAX_HISTORY_SENT = 20;

// Storage key for the local chat transcript. Survives page refreshes within
// a tab, dies on tab close (sessionStorage semantics).
const HISTORY_STORAGE_KEY = "chat_history";

const loadSavedMessages = (): Message[] => {
  if (typeof window === "undefined") return [WELCOME];
  try {
    const raw = sessionStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      );
    }
  } catch {
    // ignore corrupt storage
  }
  return [WELCOME];
};

const AIAgentSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: "-100px" });
  const [messages, setMessages] = useState<Message[]>(loadSavedMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingStatus, setTypingStatus] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Persist history in sessionStorage as it changes so a refresh keeps context.
  // Debounced to avoid hammering storage on every streaming chunk.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // storage quota or disabled — silently ignore
      }
    }, 500);
    return () => clearTimeout(id);
  }, [messages]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    const userMsg: Message = { role: "user", content: text.trim() };

    // Snapshot history BEFORE appending the new user message, skip the welcome
    // (purely cosmetic — not real conversation context), and cap the length.
    const historyForRequest = messages
      .filter((m) => m !== WELCOME && m.content !== WELCOME.content)
      .slice(-MAX_HISTORY_SENT);

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setTypingStatus("");

    try {
      const resp = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: historyForRequest,
          message: text.trim(),
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to connect");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let assistantStarted = false;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            setTypingStatus("");
            break;
          }

          try {
            const parsed = JSON.parse(data);
            if (typeof parsed.status === "string") {
              setTypingStatus(parsed.status);
            }
            if (typeof parsed.content === "string" && parsed.content) {
              if (!assistantStarted) {
                assistantStarted = true;
                setIsTyping(false);
                setTypingStatus("");
                setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
              }
              assistantContent += parsed.content;
              const content = assistantContent;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content };
                return updated;
              });
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      setIsTyping(false);
      setTypingStatus("");
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting right now. Please try again later!",
        },
      ]);
      setIsTyping(false);
      setTypingStatus("");
    }
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    try {
      sessionStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <section id="ai-agent" className="section-padding min-h-screen flex flex-col justify-center" ref={ref}>
      <div className="container mx-auto max-w-3xl px-3 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={inView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -10 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/40 bg-secondary/10 text-secondary text-sm font-medium mb-4"
          >
            <Sparkles size={14} /> Featured
          </motion.div>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Ask My <span className="text-gradient">AI Agent</span>
          </h2>
          <motion.div
            initial={{ width: 0 }}
            animate={inView ? { width: "6rem" } : { width: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="h-1 bg-gradient-to-r from-primary to-accent rounded-full mx-auto mb-4"
          />
          <p className="text-muted-foreground">Chat with the digital me to learn about my experience and skills.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.95 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 15 }}
          className="glass-card glow-border overflow-hidden"
        >
          {/* Chat header */}
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot size={16} className="text-accent" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm">Digital Nitheesh</p>
                <p className="text-xs text-accent">Online</p>
              </div>
            </div>
            {messages.length > 1 && (
              <button
                onClick={clearChat}
                className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10"
                title="Clear chat"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="h-72 sm:h-80 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  m.role === "user" ? "bg-primary/20" : "bg-secondary/20"
                }`}>
                  {m.role === "user" ? <User size={14} className="text-primary" /> : <Bot size={14} className="text-accent" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary/15 border border-primary/20"
                    : "bg-muted/50 border border-border/50"
                }`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="leading-relaxed mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noreferrer" className="text-accent underline hover:opacity-80">
                          {children}
                        </a>
                      ),
                      ul: ({ children }) => <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      h1: ({ children }) => <h1 className="text-base font-bold mt-2 mb-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mt-1 mb-0.5">{children}</h3>,
                      code: ({ children, className }) => {
                        const isBlock = className?.includes("language-");
                        if (isBlock) {
                          return (
                            <pre className="bg-muted/60 border border-border/50 rounded-md p-2 my-2 overflow-x-auto">
                              <code className="text-xs">{children}</code>
                            </pre>
                          );
                        }
                        return <code className="bg-muted/60 px-1 py-0.5 rounded text-xs">{children}</code>;
                      },
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-accent/50 pl-3 my-2 italic text-muted-foreground">
                          {children}
                        </blockquote>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2">
                          <table className="text-xs border-collapse w-full">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-muted/40">{children}</thead>,
                      th: ({ children }) => (
                        <th className="border border-border/50 px-2 py-1 text-left font-semibold">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-border/50 px-2 py-1 align-top">{children}</td>
                      ),
                      hr: () => <hr className="my-2 border-border/50" />,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Bot size={14} className="text-accent" />
                </div>
                <div className="bg-muted/50 border border-border/50 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce animation-delay-200" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce animation-delay-400" />
                    </div>
                    {typingStatus && (
                      <span className="text-xs text-muted-foreground">{typingStatus}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Example prompts */}
          <div className="px-4 sm:px-6 pb-3 flex flex-wrap gap-2">
            {examplePrompts.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 min-w-0 bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Send message"
                className="shrink-0 rounded-xl bg-primary hover:bg-primary/90 h-12 w-12 sm:h-11 sm:w-11"
              >
                <Send size={20} className="sm:hidden" />
                <Send size={16} className="hidden sm:block" />
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AIAgentSection;
