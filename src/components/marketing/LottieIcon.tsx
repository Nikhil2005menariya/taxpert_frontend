"use client";

import { useLottie } from "lottie-react";
import type { CSSProperties } from "react";

interface LottieIconProps {
  data: unknown;
  loop?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Thin wrapper around lottie-react's hook (default export interop is flaky). */
export default function LottieIcon({ data, loop = true, className, style }: LottieIconProps) {
  const { View } = useLottie(
    { animationData: data, loop, autoplay: true },
    { width: "100%", height: "100%", ...style }
  );
  return (
    <div className={className} aria-hidden="true">
      {View}
    </div>
  );
}
