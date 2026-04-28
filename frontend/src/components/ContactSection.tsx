import { useState } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Mail, Linkedin, Github, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const socialVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const socialItem = {
  hidden: { opacity: 0, x: 40, scale: 0.9 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 14 },
  },
};

const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY ?? "";

const ContactSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: "-100px" });
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      // No key set → simulate a successful submission so we can test the UI
      // without signing up. Logs the payload so you can verify what would be
      // sent. Never use this path in production.
      if (!WEB3FORMS_KEY) {
        console.info("[ContactForm] DEV MODE — would submit:", form);
        await new Promise((r) => setTimeout(r, 800));
        toast({
          title: "Message sent! (dev mode)",
          description:
            "VITE_WEB3FORMS_KEY isn't set, so this was a fake submission. Check the console.",
        });
        setForm({ name: "", email: "", message: "" });
        return;
      }

      const resp = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          name: form.name,
          email: form.email,
          message: form.message,
          subject: `Portfolio contact from ${form.name}`,
          from_name: "Portfolio Contact Form",
          botcheck: "",  // honeypot — leave empty for humans
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data.success === false) {
        throw new Error(data.message || "Web3Forms rejected the submission");
      }

      toast({
        title: "Message sent!",
        description: "Thanks for reaching out. I'll get back to you soon.",
      });
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      toast({
        title: "Couldn't send",
        description:
          "Something went wrong. Please try again, or email me directly.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const socials = [
    { icon: <Mail size={20} />, label: "Email", text: "bopparajunitheesh7@email.com" },
    { icon: <Linkedin size={20} />, label: "LinkedIn", href: "https://www.linkedin.com/in/nitheesh22/", text: "linkedin.com/in/nitheesh22" },
    { icon: <Github size={20} />, label: "GitHub", href: "https://github.com/Nitheesh2187", text: "github.com/Nitheesh2187" },
  ];

  return (
    <section id="contact" className="section-padding" ref={ref}>
      <div className="container mx-auto max-w-4xl">
        {/* Heading */}
        <div className="mb-12 overflow-hidden">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={inView ? { x: 0, opacity: 1 } : { x: -100, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Get In <span className="text-gradient">Touch</span>
            </h2>
            <motion.div
              initial={{ width: 0 }}
              animate={inView ? { width: "6rem" } : { width: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="h-1 bg-gradient-to-r from-primary to-accent rounded-full"
            />
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form — slides in from left */}
          <motion.form
            initial={{ opacity: 0, x: -60, rotateY: 10 }}
            animate={inView ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: -60, rotateY: 10 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 80, damping: 15 }}
            onSubmit={handleSubmit}
            className="glass-card p-6 space-y-4"
            style={{ perspective: 800 }}
          >
            {(["name", "email", "message"] as const).map((field, i) => (
              <motion.div
                key={field}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <label className="text-sm text-muted-foreground capitalize mb-1 block">{field}</label>
                {field === "message" ? (
                  <textarea
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    rows={4}
                    required
                    className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none transition-shadow focus:shadow-[0_0_15px_hsla(0,72%,51%,0.15)]"
                  />
                ) : (
                  <input
                    type={field === "email" ? "email" : "text"}
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    required
                    className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow focus:shadow-[0_0_15px_hsla(0,72%,51%,0.15)]"
                  />
                )}
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 disabled:opacity-60"
              >
                <Send size={16} /> {submitting ? "Sending…" : "Send Message"}
              </Button>
            </motion.div>
          </motion.form>

          {/* Social links — staggered from right */}
          <div className="space-y-4">
            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground mb-6"
            >
              I'm always open to discussing new projects, collaborations, or opportunities in AI/ML engineering.
            </motion.p>
            <motion.div
              variants={socialVariants}
              initial="hidden"
              animate={inView ? "show" : "hidden"}
              className="space-y-4"
            >
              {socials.map((s) => (
                <motion.a
                  key={s.label}
                  variants={socialItem}
                  whileHover={{
                    scale: 1.03,
                    x: 8,
                    boxShadow: "0 0 20px hsla(0, 72%, 51%, 0.15)",
                    transition: { duration: 0.2 },
                  }}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card p-4 flex items-center gap-4 group block"
                >
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.2 }}
                    className="text-accent group-hover:text-primary transition-colors"
                  >
                    {s.icon}
                  </motion.div>
                  <div>
                    <p className="font-display font-semibold text-sm">{s.label}</p>
                    <p className="text-muted-foreground text-xs">{s.text}</p>
                  </div>
                </motion.a>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
