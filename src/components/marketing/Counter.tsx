"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface CounterProps {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

/** Counts up from 0 to `to` the first time it scrolls into view. */
export default function Counter({
  to, prefix = "", suffix = "", decimals = 0, duration = 1.8, className,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) =>
      prefix + v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = fmt(to);
      return;
    }
    el.textContent = fmt(0);

    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const obj = { v: 0 };
          gsap.to(obj, {
            v: to, duration, ease: "power2.out",
            onUpdate: () => { el.textContent = fmt(obj.v); },
            onComplete: () => { el.textContent = fmt(to); },
          });
          observer.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, prefix, suffix, decimals, duration]);

  return <span ref={ref} className={className} />;
}
