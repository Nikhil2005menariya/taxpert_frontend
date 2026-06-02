"use client";

import { useEffect, useState } from "react";

interface RotatingTextProps {
  words: string[];
  interval?: number;
  className?: string;
}

/** Cycles through words with a slide-up entrance on each change. */
export default function RotatingText({ words, interval = 2200, className }: RotatingTextProps) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((p) => (p + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);

  return (
    <span className={`lp-rot ${className ?? ""}`}>
      {/* reserve width with the longest word so the line doesn't jump */}
      <span className="lp-rot-ghost" aria-hidden="true">
        {words.reduce((a, b) => (b.length > a.length ? b : a), "")}
      </span>
      <span key={i} className="lp-rot-word">{words[i]}</span>
    </span>
  );
}
