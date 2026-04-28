import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowDown, Bot, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import profilePhoto from "@/assets/profile-photo.png";

const roles = [
  "Machine Learning Engineer",
  // "YouTuber",
  // "AI Systems Builder",
  // "Full-Stack Developer",
  // "Open Source Contributor",
];

const useRollingTypewriter = (items: string[], initialDelay: number, typeSpeed = 70, pauseMs = 2000, deleteSpeed = 40) => {
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), initialDelay);
    return () => clearTimeout(timeout);
  }, [initialDelay]);

  useEffect(() => {
    if (!started) return;
    const current = items[index];

    if (!isDeleting && displayed === current) {
      const timeout = setTimeout(() => setIsDeleting(true), pauseMs);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayed === "") {
      setIsDeleting(false);
      setIndex((prev) => (prev + 1) % items.length);
      return;
    }

    const speed = isDeleting ? deleteSpeed : typeSpeed;
    const timeout = setTimeout(() => {
      setDisplayed(
        isDeleting
          ? current.slice(0, displayed.length - 1)
          : current.slice(0, displayed.length + 1)
      );
    }, speed);

    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, index, started, items, typeSpeed, pauseMs, deleteSpeed]);

  return displayed;
};

const highlights = [
  "ML Engineer @ Skylark Labs AI",
  "LLMs, RAG & Inference Systems",
  "Large-Scale AI Deployments",
];

const techStack = [
  "PyTorch", "TensorFlow", "Triton", "vLLM", "LangChain", "Docker",
  "FastAPI", "React", "Python", "C++", "Hugging Face", "TensorRT",
  "gRPC", "OpenCV", "LlamaIndex", "LangGraph",
];

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const staggerItem = {
  hidden: { opacity: 0, scale: 0, y: 10 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
};

const buttonContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const buttonItem = {
  hidden: { opacity: 0, x: -30, scale: 0.9 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 150, damping: 15 },
  },
};

const vp = { once: false, margin: "-50px" as const };

const HeroSection = () => {
  const roleText = useRollingTypewriter(roles, 1200);
  const ref = useRef(null);
  const inView = useInView(ref, vp);

  return (
    <section id="home" ref={ref} className="relative min-h-screen flex items-center overflow-hidden">
      <div className="container mx-auto relative z-10 pt-24 pb-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="space-y-6">
            {/* Heading */}
            <div className="font-display font-bold leading-tight">
              <motion.p
                initial={{ opacity: 0, x: -60 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -60 }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                className="text-xl md:text-2xl overflow-hidden"
              >
                Hi, I'm
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, x: -80, scale: 0.95 }}
                animate={inView ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -80, scale: 0.95 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 80, damping: 15 }}
                className="text-3xl md:text-5xl"
              >
                Nitheesh Bopparaju
              </motion.h1>

              <motion.div
                initial={{ width: 0 }}
                animate={inView ? { width: "8rem" } : { width: 0 }}
                transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                className="h-1 bg-gradient-to-r from-primary via-accent to-secondary rounded-full mt-2 mb-2"
              />

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="text-lg md:text-xl mt-1"
              >
                and I'm{" "}
                <span className="text-accent">
                  {roleText}
                  <span className="inline-block w-[3px] h-[0.85em] ml-1 align-middle bg-accent animate-blink" />
                </span>
              </motion.p>
            </div>

            <motion.p
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={inView ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(8px)" }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="text-lg text-muted-foreground max-w-lg leading-relaxed"
            >
              Building production-ready AI systems at scale.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={inView ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(8px)" }}
              transition={{ delay: 1.0, duration: 0.8 }}
              className="text-muted-foreground max-w-lg leading-relaxed"
            >
              Specializing in scalable AI systems, model serving, and inference optimization.
              Passionate about building and deploying intelligent systems across vision, language,
              and audio domains, with a focus on LLMs, RAG pipelines, and agentic AI.
            </motion.p>

            {/* Buttons */}
            <motion.div
              variants={buttonContainer}
              initial="hidden"
              animate={inView ? "show" : "hidden"}
              className="flex flex-wrap gap-3"
            >
              <motion.div variants={buttonItem} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2">
                  <a href="https://drive.google.com/file/d/13Ftl-ngWkqfk3wAeWbIL4NeUX8ssMHPh/view?usp=drive_link" target="_blank" rel="noopener noreferrer"><FileText size={18} /> View Resume</a>
                </Button>
              </motion.div>
              <motion.div variants={buttonItem} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button asChild variant="outline" size="lg" className="rounded-xl gap-2 border-border hover:bg-muted">
                  <a href="#contact"><Mail size={18} /> Contact Me</a>
                </Button>
              </motion.div>
              <motion.div variants={buttonItem} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-xl gap-2">
                  <a href="#ai-agent"><Bot size={18} /> Try My AI Agent</a>
                </Button>
              </motion.div>
            </motion.div>

            {/* Highlights */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate={inView ? "show" : "hidden"}
              className="flex flex-wrap gap-3 pt-4"
            >
              {highlights.map((h) => (
                <motion.span
                  key={h}
                  variants={staggerItem}
                  whileHover={{ scale: 1.08, y: -3, boxShadow: "0 0 20px hsla(0, 72%, 51%, 0.25)" }}
                  className="skill-tag text-xs cursor-default"
                >
                  {h}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* Right — profile */}
          <div className="flex justify-center">
            <motion.img
              src={profilePhoto}
              alt="Nitheesh Bopparaju"
              width={400}
              height={400}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={inView
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.7 }
              }
              transition={{ delay: 0.5, duration: 0.8, type: "spring", stiffness: 80 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.3 } }}
              className="w-64 md:w-80 object-contain"
            />
          </div>
        </div>

        {/* Tech ticker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mt-16 overflow-hidden relative"
        >
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
          <div className="flex animate-ticker whitespace-nowrap">
            {[...techStack, ...techStack].map((t, i) => (
              <span key={i} className="mx-4 text-muted-foreground/60 font-display text-sm tracking-wider">
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1.8 }}
          className="flex justify-center mt-12"
        >
          <motion.a
            href="#about"
            whileHover={{ scale: 1.3 }}
            className="text-muted-foreground hover:text-foreground transition-colors animate-float"
          >
            <ArrowDown size={24} />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
