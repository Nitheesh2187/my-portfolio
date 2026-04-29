import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const experiences = [
  {
    role: "Machine Learning Engineer",
    company: "Skylark Labs AI",
    period: "July 2024 – Present",
    items: [
      "Built multimodal AI pipelines across vision, NLP, and audio domains",
      "Optimized inference with Triton + TensorRT: 120+ inferences/sec, <50ms latency",
      "Deployed Mixtral-8x7B using vLLM with long context support (12k–16k tokens)",
      "Engineered Whisper-based transcription pipelines for production use",
    ],
    metrics: ["120+ inf/sec", "<50ms latency", "16k context"],
  },
  {
    role: "ML Intern",
    company: "Skylark Labs AI",
    period: "Jan 2024 – July 2024",
    items: [
      "Improved video classification accuracy from 85% → 92%",
      "Built high-accuracy audio classification system achieving 98% accuracy",
    ],
    metrics: ["92% video acc.", "98% audio acc."],
  },
  {
    role: "Software Engineering Intern",
    company: "Honeywell Technology Solutions",
    period: "May 2023 – July 2023",
    items: [
      "Developed desktop application using PyQt5 + PyODBC for data management",
      "Automated JFrog workflows using Selenium for CI/CD pipeline optimization",
    ],
    metrics: [],
  },
];

const ExperienceCard = ({ exp }: { exp: (typeof experiences)[number] }) => (
  <div className="glass-card p-5 sm:p-6 md:p-8 h-full">
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
      <div>
        <h3 className="font-display text-lg sm:text-xl font-semibold flex items-center gap-2">
          <Briefcase size={18} className="text-accent" />
          {exp.role}
        </h3>
        <p className="text-primary font-medium text-sm sm:text-base">{exp.company}</p>
      </div>
      <span className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
        {exp.period}
      </span>
    </div>

    <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-5">
      {exp.items.map((item) => (
        <li key={item} className="text-muted-foreground text-sm flex gap-2">
          <span className="text-accent mt-0.5 shrink-0">▹</span>
          {item}
        </li>
      ))}
    </ul>

    {exp.metrics.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {exp.metrics.map((m) => (
          <span key={m} className="skill-tag text-xs">{m}</span>
        ))}
      </div>
    )}
  </div>
);

const ExperienceSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [active, setActive] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const scrollCooldown = useRef(false);
  const count = experiences.length;

  // Desktop wheel-hijack — disabled on mobile (touch users get scroll-snap below).
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

  // Mobile: track active index from scroll position so the dots stay in sync.
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
      id="experience"
      ref={sectionRef}
      className="section-padding min-h-screen flex flex-col justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-8 md:mb-12 overflow-hidden text-center md:text-left">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Work <span className="text-gradient">Experience</span>
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "6rem" }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="h-1 bg-gradient-to-r from-primary to-accent rounded-full mx-auto md:mx-0"
            />
          </motion.div>
        </div>

        {isMobile ? (
          // ── Mobile: horizontal swipe carousel with scroll-snap ──────────
          <div>
            <div
              ref={scrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide -mx-4 px-4"
              style={{ scrollbarWidth: "none" }}
            >
              {experiences.map((exp, i) => (
                <div
                  key={i}
                  className="snap-center shrink-0 w-full pr-3 last:pr-0"
                >
                  <ExperienceCard exp={exp} />
                </div>
              ))}
            </div>

            {/* Pagination dots */}
            <div className="flex justify-center gap-2 mt-5">
              {experiences.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to experience ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === active ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
            <div className="text-center text-muted-foreground text-xs font-display mt-2">
              swipe to navigate · {active + 1} / {count}
            </div>
          </div>
        ) : (
          // ── Desktop: timeline + wheel-hijacked vertical slides ─────────
          <div className="flex gap-8 md:gap-12">
            <div className="flex flex-col items-center shrink-0">
              <div className="relative w-px bg-border" style={{ minHeight: 200 }}>
                <div
                  className="absolute top-0 left-0 w-full bg-gradient-to-b from-primary via-primary to-accent transition-all duration-500"
                  style={{ height: `${progressPercent}%` }}
                />
                {experiences.map((_, i) => {
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

            <div className="flex-1 min-w-0 relative" style={{ minHeight: 280 }}>
              {experiences.map((exp, i) => (
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
                  <ExperienceCard exp={exp} />
                </div>
              ))}

              <div className="mt-6 text-center">
                <span className="text-muted-foreground text-sm font-display">
                  {active + 1} / {count}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ExperienceSection;
