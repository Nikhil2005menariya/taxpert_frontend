import { useEffect } from "react";
import type { RefObject } from "react";
import gsap from "gsap";

/**
 * Scoped scroll-reveal. Any element inside `scopeRef` carrying a
 * `data-reveal` attribute fades + rises into view as it enters the viewport.
 *
 * Motion is GSAP; the trigger is an IntersectionObserver (reliable for
 * above-the-fold content and headless rendering alike). Initial hidden state
 * is applied in JS only, so no-JS / failed-load users always see content.
 */
export function useScrollReveal(scopeRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const els = Array.from(scope.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (els.length === 0) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      gsap.set(els, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(els, { opacity: 0, y: 30, willChange: "transform, opacity" });

    const io = new IntersectionObserver(
      (entries, observer) => {
        const showing = entries.filter((e) => e.isIntersecting);
        showing.forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: "power3.out",
            delay: i * 0.08,
            onComplete: () => {
              el.style.willChange = "auto";
            },
          });
          observer.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    els.forEach((el) => io.observe(el));

    // Safety net: if anything is still hidden after a beat (e.g. observer
    // edge cases), reveal it so content is never permanently invisible.
    const safety = window.setTimeout(() => {
      els.forEach((el) => {
        if (getComputedStyle(el).opacity === "0") {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
          io.unobserve(el);
        }
      });
    }, 2600);

    return () => {
      window.clearTimeout(safety);
      io.disconnect();
    };
  }, [scopeRef]);
}
