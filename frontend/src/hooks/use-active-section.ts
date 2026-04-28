import { useEffect } from "react";

/**
 * Watches all `<section id="...">` elements on the page and updates the URL
 * hash to whichever section is currently most visible. Uses IntersectionObserver
 * — no scroll-event spam.
 *
 * Pass the ordered list of section IDs you care about. Sections with the
 * largest visible area "win" — ties broken by document order.
 */
export const useActiveSection = (sectionIds: string[]) => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Track each section's most recent intersectionRatio.
    const ratios = new Map<string, number>(sectionIds.map((id) => [id, 0]));

    const updateHash = () => {
      let bestId = "";
      let bestRatio = 0;
      for (const id of sectionIds) {
        const ratio = ratios.get(id) ?? 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      }

      if (bestId && `#${bestId}` !== window.location.hash) {
        // replaceState so back-button history doesn't get spammed.
        history.replaceState(null, "", `#${bestId}`);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ratios.set(e.target.id, e.intersectionRatio);
        }
        updateHash();
      },
      {
        // Sample at multiple thresholds so we can pick the most-visible section.
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: "-10% 0px -10% 0px",
      },
    );

    const elements: HTMLElement[] = [];
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        elements.push(el);
      }
    }

    return () => {
      for (const el of elements) observer.unobserve(el);
      observer.disconnect();
    };
  }, [sectionIds.join(",")]); // re-run if list changes
};
