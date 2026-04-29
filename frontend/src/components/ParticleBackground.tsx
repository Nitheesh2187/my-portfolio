import { useEffect, useRef } from "react";

/**
 * Background particle network.
 *
 * Sized to the viewport (NOT the full scroll height) so we don't allocate a
 * massive canvas buffer for content the user can't see. The canvas is
 * positioned `fixed`, so a viewport-sized buffer is exactly what we need —
 * the same particles re-paint as the user scrolls.
 *
 * Performance notes:
 *   - Particle count scales with viewport area, hard-capped low.
 *   - O(n²) link-line checking only between nearby pairs (skipped early).
 *   - Frame loop pauses when the tab is hidden (Page Visibility API).
 *   - Honours `prefers-reduced-motion`: static dots, no animation loop.
 */
const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR cost
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const LINK_DIST = 130;
    const LINK_DIST_SQ = LINK_DIST * LINK_DIST; // avoid sqrt in hot loop

    let width = 0;
    let height = 0;
    type P = { x: number; y: number; vx: number; vy: number; r: number };
    let particles: P[] = [];
    let animId: number | null = null;
    let visible = true;

    const seedParticles = () => {
      // Scale particle count to viewport area, conservatively.
      const target = Math.floor((width * height) / 18000);
      const count = Math.max(40, Math.min(90, target));
      particles = new Array(count);
      for (let i = 0; i < count; i++) {
        particles[i] = {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.4 + 0.5,
        };
      }
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      // Set the backing-store size for crisp rendering on high-DPI displays.
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedParticles();
    };
    resize();

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "hsla(0, 72%, 51%, 0.5)";
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const draw = () => {
      animId = null;
      if (!visible) return; // paused while tab hidden

      ctx.clearRect(0, 0, width, height);

      // Update + draw nodes.
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "hsla(0, 72%, 51%, 0.5)";
        ctx.fill();
      }

      // Link nearby pairs. Use squared distance to skip sqrt unless drawing.
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          if (dx > LINK_DIST || dx < -LINK_DIST) continue;
          const dy = p.y - q.y;
          if (dy > LINK_DIST || dy < -LINK_DIST) continue;
          const distSq = dx * dx + dy * dy;
          if (distSq >= LINK_DIST_SQ) continue;

          const alpha = 0.12 * (1 - Math.sqrt(distSq) / LINK_DIST);
          ctx.strokeStyle = `hsla(0, 90%, 64%, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(draw);
    };

    const start = () => {
      if (animId === null) animId = requestAnimationFrame(draw);
    };

    if (reduceMotion) {
      drawStatic();
    } else {
      start();
    }

    // Pause while tab is hidden.
    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible && !reduceMotion) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Resize listener — debounced via rAF to avoid feedback loops.
    let resizeRaf: number | null = null;
    const onResize = () => {
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        resize();
        if (reduceMotion) drawStatic();
      });
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

export default ParticleBackground;
