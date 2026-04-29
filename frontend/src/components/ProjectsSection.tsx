import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Github, MessageSquare, TrendingUp, Newspaper, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

type Project = {
  title: string;
  description: string;
  tech: string[];
  features: { icon: React.ReactNode; text: string }[];
  github?: string;
  liveDemo?: string;
  hoverText?: string;
};

const projects: Project[] = [
  {
    title: "Stock Assistance Agent",
    description: "AI-powered stock assistant providing real-time market data, fundamental analysis, and news aggregation through a streaming chat interface.",
    tech: ["FastAPI", "React", "LangChain", "MCP"],
    features: [
      { icon: <TrendingUp size={14} />, text: "Real-time stock data" },
      { icon: <BarChart3 size={14} />, text: "Fundamental analysis" },
      { icon: <Newspaper size={14} />, text: "Market news + scraping" },
      { icon: <MessageSquare size={14} />, text: "Streaming chat interface" },
    ],
    github: "https://github.com/Nitheesh2187/Stock-Assistant-Agent",
    liveDemo: "https://stock-assistant-agent.onrender.com/",
    hoverText: "Hosted on Render's free tier — first load can take some time while the service spins up.",
  },
];

const ProjectCard = ({ p }: { p: Project }) => {
  const liveDemoButton = p.liveDemo && (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="gap-2 rounded-xl border-border hover:bg-muted"
    >
      <a href={p.liveDemo} target="_blank" rel="noreferrer">
        <ExternalLink size={14} /> Live Demo
      </a>
    </Button>
  );

  return (
    <div className="glass-card glow-border p-5 sm:p-6 md:p-8 h-full">
      <h3 className="font-display text-xl sm:text-2xl font-bold mb-2 sm:mb-3">{p.title}</h3>
      <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6 max-w-2xl">
        {p.description}
      </p>

      <div className="grid sm:grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {p.features.map((f) => (
          <div key={f.text} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-accent">{f.icon}</span>
            {f.text}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
        {p.tech.map((t) => (
          <span key={t} className="skill-tag text-xs">{t}</span>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {p.liveDemo && (p.hoverText ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>{liveDemoButton}</TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {p.hoverText}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          liveDemoButton
        ))}
        {p.github && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl border-border hover:bg-muted"
          >
            <a href={p.github} target="_blank" rel="noreferrer">
              <Github size={14} /> GitHub
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};

const ProjectsSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [active, setActive] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const scrollCooldown = useRef(false);
  const count = projects.length;

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (isMobile || !isHovered || scrollCooldown.current) return;

      const goingDown = e.deltaY > 0;
      const goingUp = e.deltaY < 0;

      if (goingUp && active === 0) return;
      if (goingDown && active === count - 1) return;

      e.preventDefault();
      scrollCooldown.current = true;

      setActive((prev) => {
        if (goingDown && prev < count - 1) return prev + 1;
        if (goingUp && prev > 0) return prev - 1;
        return prev;
      });

      setTimeout(() => {
        scrollCooldown.current = false;
      }, 600);
    },
    [isHovered, active, count, isMobile]
  );

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || isMobile) return;
    section.addEventListener("wheel", handleWheel, { passive: false });
    return () => section.removeEventListener("wheel", handleWheel);
  }, [handleWheel, isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActive((prev) => (prev === idx ? prev : idx));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  const goTo = (i: number) => {
    setActive(i);
    if (isMobile && scrollRef.current) {
      scrollRef.current.scrollTo({ left: i * scrollRef.current.clientWidth, behavior: "smooth" });
    }
  };

  const progressPercent = count > 1 ? (active / (count - 1)) * 100 : 100;

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="pt-[10vh] pb-6 md:py-28 px-4 md:px-8 min-h-screen-nav flex flex-col justify-start md:justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-8 md:mb-12 overflow-hidden text-center md:text-left">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Featured <span className="text-gradient">Projects</span>
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "6rem" }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="h-1 bg-gradient-to-r from-primary to-accent rounded-full mx-auto md:mx-0"
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground mt-4 text-sm sm:text-base"
          >
            Systems built with care, deployed at scale.
          </motion.p>
        </div>

        {isMobile ? (
          // ── Mobile: horizontal swipe carousel ──────────────────────────
          <div>
            <div
              ref={scrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide -mx-4 px-4"
              style={{ scrollbarWidth: "none" }}
            >
              {projects.map((p, i) => (
                <div key={i} className="snap-center shrink-0 w-full pr-3 last:pr-0">
                  <ProjectCard p={p} />
                </div>
              ))}
            </div>

            {count > 1 && (
              <>
                <div className="flex justify-center gap-2 mt-5">
                  {projects.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      aria-label={`Go to project ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        i === active ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-center text-muted-foreground text-xs font-display mt-2">
                  swipe to navigate · {active + 1} / {count}
                </div>
              </>
            )}
          </div>
        ) : (
          // ── Desktop: timeline + wheel-hijacked layout ──────────────────
          <div className="flex gap-8 md:gap-12">
            <div className="flex flex-col items-center shrink-0">
              <div className="relative w-px bg-border" style={{ minHeight: 200 }}>
                <div
                  className="absolute top-0 left-0 w-full bg-gradient-to-b from-primary via-primary to-accent transition-all duration-500"
                  style={{ height: `${progressPercent}%` }}
                />
                {projects.map((_, i) => {
                  const topPercent = count === 1 ? 50 : (i / (count - 1)) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute left-1/2"
                      style={{ top: `${topPercent}%`, transform: "translate(-50%, -50%)" }}
                    >
                      <div
                        className={`absolute -inset-3 rounded-full transition-all duration-500 ${
                          i === active ? "bg-primary/25 scale-100" : "scale-0 bg-transparent"
                        }`}
                      />
                      <div
                        className={`relative w-4 h-4 rounded-full border-2 transition-all duration-500 cursor-pointer ${
                          i === active
                            ? "bg-primary border-primary shadow-lg shadow-primary/50 scale-150"
                            : i < active
                              ? "bg-primary/60 border-primary/60"
                              : "bg-background border-muted-foreground/30"
                        }`}
                        onClick={() => goTo(i)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-w-0 relative" style={{ minHeight: 320 }}>
              {projects.map((p, i) => (
                <div
                  key={i}
                  className={`transition-all duration-500 ${
                    i === active
                      ? "opacity-100 translate-y-0 pointer-events-auto relative"
                      : "opacity-0 absolute inset-0 pointer-events-none"
                  } ${
                    i === active ? "" : i > active ? "translate-y-8" : "-translate-y-8"
                  }`}
                >
                  <ProjectCard p={p} />
                </div>
              ))}

              {count > 1 && (
                <div className="mt-6 text-center">
                  <span className="text-muted-foreground text-sm font-display">
                    {active + 1} / {count}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectsSection;
