/**
 * BrandMark — TheTaxpert circular emblem, rendered inline as crisp SVG so it
 * stays sharp at any size and needs no network request. Faithful to
 * `TheTaxpert_Logo_Vector.svg` (navy disc, cream concentric rings, serif "T"
 * monogram, gold accent bar).
 *
 * Pair it with the wordmark in nav/footer/auth/dashboard brand lockups:
 *   <span className="brand-lockup"><BrandMark size={30} /> …wordmark… </span>
 */
interface BrandMarkProps {
  size?: number;
  className?: string;
  /** Soft hairline ring + shadow lift around the tile — for cream surfaces. */
  framed?: boolean;
  title?: string;
}

export default function BrandMark({
  size = 30,
  className = "",
  framed = false,
  title = "TheTaxpert",
}: BrandMarkProps) {
  return (
    <span
      className={`brand-mark${framed ? " brand-mark--framed" : ""}${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 300 300" width={size} height={size} role="img" aria-label={title}>
        <rect width="300" height="300" rx="74" fill="#071224" />
        <circle cx="150" cy="150" r="118" fill="none" stroke="#F2F0EA" strokeWidth="6" />
        <circle
          cx="150"
          cy="150"
          r="92"
          fill="none"
          stroke="#F2F0EA"
          strokeWidth="3"
          strokeDasharray="3 12"
          strokeLinecap="round"
        />
        <text
          x="150"
          y="178"
          textAnchor="middle"
          fontFamily="Times New Roman, Georgia, serif"
          fontSize="120"
          fill="#F2F0EA"
        >
          T
        </text>
        <rect x="118" y="215" width="64" height="8" rx="2" fill="#C9A55A" />
      </svg>
    </span>
  );
}
