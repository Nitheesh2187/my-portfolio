import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Code, Brain, Layers, Server, Eye, Wrench } from "lucide-react";

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

const SkillsSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: "-100px" });

  return (
    <section id="skills" className="section-padding" ref={ref}>
      <div className="container mx-auto max-w-5xl">
        {/* Heading */}
        <div className="mb-12 overflow-hidden">
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
              className="h-1 bg-gradient-to-r from-primary to-accent rounded-full"
            />
          </motion.div>
        </div>

        {/* Staggered grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {categories.map((cat) => (
            <motion.div
              key={cat.title}
              variants={cardVariant}
              whileHover={{
                scale: 1.04,
                boxShadow: "0 0 25px hsla(0, 72%, 51%, 0.15)",
                transition: { duration: 0.2 },
              }}
              className="glass-card p-6 group cursor-default"
            >
              <div className="flex items-center gap-3 mb-4">
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
                className="flex flex-wrap gap-2"
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
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SkillsSection;
