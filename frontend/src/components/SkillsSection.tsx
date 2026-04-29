import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Code, Brain, Layers, Server, Eye, Wrench } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const categories = [
  { icon: <Code size={22} />, title: "Languages", skills: ["C++", "Python", "SQL"] },
  { icon: <Brain size={22} />, title: "Frameworks & Libraries", skills: ["PyTorch", "TensorFlow", "Keras", "Hugging Face"] },
  { icon: <Layers size={22} />, title: "LLM & AI Systems", skills: ["Transformers", "vLLM", "LangChain", "LangGraph", "LlamaIndex"] },
  { icon: <Server size={22} />, title: "MLOps & Deployment", skills: ["Triton", "Docker", "FastAPI", "gRPC", "TensorRT"] },
  { icon: <Eye size={22} />, title: "AI Domains", skills: ["NLP", "Computer Vision", "Generative AI", "RAG", "Agentic AI"] },
  { icon: <Wrench size={22} />, title: "Tools", skills: ["Git", "Scikit-learn", "NLTK", "OpenCV"] },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 40, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 14 },
  },
};

const tagContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const tagVariant = {
  hidden: { opacity: 0, scale: 0, x: -10 },
  show: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
};

type Category = (typeof categories)[number];

const SkillCard = ({ cat, inView }: { cat: Category; inView: boolean }) => (
  <motion.div
    variants={cardVariant}
    whileHover={{
      scale: 1.04,
      boxShadow: "0 0 25px hsla(0, 72%, 51%, 0.15)",
      transition: { duration: 0.2 },
    }}
    className="glass-card p-5 sm:p-6 group cursor-default h-full overflow-hidden flex flex-col"
  >
    <div className="flex items-center gap-3 mb-3 sm:mb-4 shrink-0">
      <motion.div
        whileHover={{ rotate: 15, scale: 1.2 }}
        className="text-accent group-hover:text-primary transition-colors"
      >
        {cat.icon}
      </motion.div>
      <h3 className="font-display font-semibold">{cat.title}</h3>
    </div>

    {/* Skill tags pop in one by one */}
    <motion.div
      variants={tagContainer}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className="flex flex-wrap gap-2 overflow-y-auto"
    >
      {cat.skills.map((s) => (
        <motion.span
          key={s}
          variants={tagVariant}
          whileHover={{ scale: 1.1, y: -2 }}
          className="skill-tag text-xs cursor-default"
        >
          {s}
        </motion.span>
      ))}
    </motion.div>
  </motion.div>
);

const SkillsSection = () => {
  const ref = useRef(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const inView = useInView(ref, { once: false, margin: "-100px" });
  const [active, setActive] = useState(0);

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
      id="skills"
      ref={ref}
      className="pt-[10vh] pb-6 md:py-28 px-4 md:px-8 min-h-screen-nav flex flex-col justify-start md:justify-center"
    >
      <div className="container mx-auto max-w-5xl px-4">
        {/* Heading — centered on mobile, left on desktop */}
        <div className="mb-8 md:mb-12 overflow-hidden text-center md:text-left">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={inView ? { x: 0, opacity: 1 } : { x: -100, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              My <span className="text-gradient">Skills</span>
            </h2>
            <motion.div
              initial={{ width: 0 }}
              animate={inView ? { width: "6rem" } : { width: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="h-1 bg-gradient-to-r from-primary to-accent rounded-full mx-auto md:mx-0"
            />
          </motion.div>
        </div>

        {isMobile ? (
          // ── Mobile: horizontal swipe carousel, 2 cards stacked per slide ─
          (() => {
            // Chunk into pairs so each slide shows two cards stacked vertically.
            const slides: Category[][] = [];
            for (let i = 0; i < categories.length; i += 2) {
              slides.push(categories.slice(i, i + 2));
            }
            const slideCount = slides.length;
            const safeActive = Math.min(active, slideCount - 1);

            return (
              <motion.div
                variants={container}
                initial="hidden"
                animate={inView ? "show" : "hidden"}
              >
                <div
                  ref={scrollRef}
                  className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide -mx-4 px-4"
                  style={{ scrollbarWidth: "none" }}
                >
                  {slides.map((pair, idx) => (
                    <div
                      key={idx}
                      className="snap-center shrink-0 w-full pr-3 last:pr-0"
                    >
                      {/*
                        grid-rows-2 + fixed height splits the slide into two
                        equal rows so both cards have the exact same size,
                        regardless of how much text each one contains.
                      */}
                      <div className="grid grid-rows-2 gap-4 h-[440px]">
                        {pair.map((cat) => (
                          <SkillCard key={cat.title} cat={cat} inView={inView} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center gap-2 mt-5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      aria-label={`Go to skill slide ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        i === safeActive ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-center text-muted-foreground text-xs font-display mt-2">
                  swipe to navigate · {safeActive + 1} / {slideCount}
                </div>
              </motion.div>
            );
          })()
        ) : (
          // ── Desktop: 2/3-column staggered grid ──────────────────────────
          <motion.div
            variants={container}
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {categories.map((cat) => (
              <SkillCard key={cat.title} cat={cat} inView={inView} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default SkillsSection;
