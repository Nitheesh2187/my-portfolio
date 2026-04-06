import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { GraduationCap, Target, Cpu } from "lucide-react";

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

const AboutSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: "-100px" });

  return (
    <section id="about" className="section-padding min-h-screen flex items-center" ref={ref}>
      <div className="container mx-auto max-w-5xl">
        {/* Heading with slide-in line */}
        <div className="mb-12 overflow-hidden">
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
              className="h-1 bg-gradient-to-r from-primary to-accent rounded-full mb-4"
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground max-w-2xl"
          >
            From electronics to AI — building systems that think, see, and speak.
          </motion.p>
        </div>

        {/* Staggered cards with 3D tilt */}
        <motion.div
          variants={container}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          className="grid md:grid-cols-3 gap-6"
          style={{ perspective: 1000 }}
        >
          {cards.map((card) => (
            <motion.div
              key={card.title}
              variants={cardVariant}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 30px hsla(0, 72%, 51%, 0.2)",
                transition: { duration: 0.25 },
              }}
              className="glass-card glow-border p-6 space-y-4 cursor-default"
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
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
