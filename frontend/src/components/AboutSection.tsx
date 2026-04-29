import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { GraduationCap, Target, Cpu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const cards = [
  {
    icon: <GraduationCap size={28} />,
    title: "Education",
    desc: "B.Tech in Electronics & Communication Engineering from National Institute of Technology Warangal (2020–2024). Built a strong foundation in signal processing, mathematics, and systems thinking.",
  },
  {
    icon: <Target size={28} />,
    title: "Journey into AI",
    desc: "Transitioned from embedded systems to machine learning, driven by a passion for building intelligent systems. Focused on bridging the gap between research and real-world deployment.",
  },
  {
    icon: <Cpu size={28} />,
    title: "Philosophy",
    desc: "Performance, scalability, and production-grade quality define my approach. Every model I build is designed to serve millions of inferences efficiently and reliably.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 50, scale: 0.9, rotateX: 15 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

type Card = (typeof cards)[number];

const AboutCard = ({ card, inView }: { card: Card; inView: boolean }) => (
  <motion.div
    variants={cardVariant}
    whileHover={{
      scale: 1.05,
      boxShadow: "0 0 30px hsla(0, 72%, 51%, 0.2)",
      transition: { duration: 0.25 },
    }}
    className="glass-card glow-border p-6 space-y-4 cursor-default h-full"
  >
    <motion.div
      initial={{ rotate: -20, scale: 0 }}
      animate={inView ? { rotate: 0, scale: 1 } : { rotate: -20, scale: 0 }}
      transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
      className="text-accent w-fit"
    >
      {card.icon}
    </motion.div>
    <h3 className="font-display text-lg font-semibold">{card.title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{card.desc}</p>
  </motion.div>
);

const AboutSection = () => {
  const ref = useRef(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const inView = useInView(ref, { once: false, margin: "-100px" });
  const [active, setActive] = useState(0);

  // Track active slide on mobile from horizontal scroll position.
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
      scrollRef.current.scrollTo({
        left: i * scrollRef.current.clientWidth,
        behavior: "smooth",
      });
    }
  };

  return (
    <section
      id="about"
      ref={ref}
      className="pt-[10vh] pb-12 md:py-28 px-4 md:px-8 min-h-screen-nav flex items-start md:items-center"
    >
      <div className="container mx-auto max-w-5xl px-4">
        {/* Heading — centered on mobile, left-aligned on desktop */}
        <div className="mb-8 md:mb-12 overflow-hidden text-center md:text-left">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={inView ? { x: 0, opacity: 1 } : { x: -100, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              About <span className="text-gradient">Me</span>
            </h2>
            <motion.div
              initial={{ width: 0 }}
              animate={inView ? { width: "6rem" } : { width: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="h-1 bg-gradient-to-r from-primary to-accent rounded-full mb-4 mx-auto md:mx-0"
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground max-w-2xl text-sm md:text-base mx-auto md:mx-0"
          >
            From electronics to AI — building systems that think, see, and speak.
          </motion.p>
        </div>

        {isMobile ? (
          // ── Mobile: horizontal swipe carousel ───────────────────────────
          <motion.div
            variants={container}
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            style={{ perspective: 1000 }}
          >
            <div
              ref={scrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide -mx-4 px-4"
              style={{ scrollbarWidth: "none" }}
            >
              {cards.map((card) => (
                <div
                  key={card.title}
                  className="snap-center shrink-0 w-full pr-3 last:pr-0"
                >
                  <AboutCard card={card} inView={inView} />
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-2 mt-5">
              {cards.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to card ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === active ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
            <div className="text-center text-muted-foreground text-xs font-display mt-2">
              swipe to navigate · {active + 1} / {cards.length}
            </div>
          </motion.div>
        ) : (
          // ── Desktop: 3-column staggered grid ───────────────────────────
          <motion.div
            variants={container}
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            className="grid md:grid-cols-3 gap-6"
            style={{ perspective: 1000 }}
          >
            {cards.map((card) => (
              <AboutCard key={card.title} card={card} inView={inView} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default AboutSection;
