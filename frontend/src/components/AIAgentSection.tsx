import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Bot, Send, User, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Message = { role: "user" | "assistant"; content: string };

const examplePrompts = [
  "What projects has Nitheesh worked on?",
  "What are his strengths?",
  "Explain his experience with LLMs",
];

const botResponses: Record<string, string> = {
  "what projects has nitheesh worked on?":
    "Nitheesh has built a **Stock Assistance Agent** — an AI-powered stock assistant using FastAPI, React, LangChain, and MCP. It features real-time stock data, fundamental analysis, market news scraping, and a streaming chat interface. He's also worked on multimodal AI pipelines at Skylark Labs covering vision, NLP, and audio domains.",
  "what are his strengths?":
    "Nitheesh's key strengths include:\n\n• **Inference Optimization** — Triton + TensorRT achieving 120+ inf/sec at <50ms latency\n• **LLM Deployment** — vLLM serving for large models like Mixtral-8x7B\n• **Full-stack AI** — End-to-end pipeline design from training to production\n• **Multimodal Systems** — Experience across vision, language, and audio",
  "explain his experience with llms":
    "Nitheesh has deep experience with LLMs:\n\n• Deployed **Mixtral-8x7B** via vLLM with long context (12k–16k tokens)\n• Built **RAG pipelines** using LangChain, LlamaIndex, and LangGraph\n• Engineered **Whisper-based** transcription pipelines\n• Expertise in **Transformers**, Hugging Face ecosystem, and agentic AI architectures",
};

const getResponse = (input: string): string => {
  const lower = input.toLowerCase().trim();
  for (const [key, val] of Object.entries(botResponses)) {
    if (lower.includes(key.split(" ").slice(0, 3).join(" ")) || key.includes(lower.slice(0, 20))) {
      return val;
    }
  }
  return "I'm Nitheesh's AI assistant! I can tell you about his projects, skills, experience, and expertise in ML/AI systems. Try asking about his work with LLMs, inference optimization, or his projects!";
};

const AIAgentSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: "-100px" });
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! 👋 I'm Nitheesh's AI assistant. Ask me anything about his experience, skills, or projects!" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate typing delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

    const response = getResponse(text);
    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    setIsTyping(false);
  };

  return (
    <section id="ai-agent" className="section-padding" ref={ref}>
      <div className="container mx-auto max-w-3xl">
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
          <p className="text-muted-foreground">Chat with my AI to learn more about my experience and skills.</p>
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
                <p className="font-display font-semibold text-sm">Nitheesh's AI Agent</p>
                <p className="text-xs text-accent">Online</p>
              </div>
            </div>
            {messages.length > 1 && (
              <button
                onClick={() => setMessages([{ role: "assistant", content: "Hi! 👋 I'm Nitheesh's AI assistant. Ask me anything about his experience, skills, or projects!" }])}
                className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10"
                title="Clear chat"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-6 space-y-4">
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
                  {m.content.split("\n").map((line, j) => (
                    <p key={j} className={j > 0 ? "mt-1" : ""}>
                      {line.split("**").map((part, k) =>
                        k % 2 === 1 ? <strong key={k} className="text-foreground">{part}</strong> : part
                      )}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Bot size={14} className="text-accent" />
                </div>
                <div className="bg-muted/50 border border-border/50 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce animation-delay-200" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce animation-delay-400" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Example prompts */}
          <div className="px-6 pb-3 flex flex-wrap gap-2">
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
          <div className="px-6 pb-6">
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
                placeholder="Ask me anything about Nitheesh..."
                className="flex-1 bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <Button type="submit" size="icon" className="rounded-xl bg-primary hover:bg-primary/90 h-11 w-11">
                <Send size={16} />
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AIAgentSection;
