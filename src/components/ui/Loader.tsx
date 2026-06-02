interface LoaderProps {
  /** px size of the animation (default 38) */
  size?: number;
  /** optional caption shown beneath the loader */
  label?: string;
  className?: string;
}

/**
 * Three-body wobble loader (CSS-only, no styled-components dependency),
 * tinted to the brand accent via CSS variables.
 */
export default function Loader({ size = 38, label, className }: LoaderProps) {
  return (
    <div className={`lpd-loader${className ? " " + className : ""}`}>
      <div className="lpd-tb" style={{ ["--tb-size" as string]: `${size}px` }}>
        <div className="lpd-tb-dot" />
        <div className="lpd-tb-dot" />
        <div className="lpd-tb-dot" />
      </div>
      {label && <span className="lpd-loader-label">{label}</span>}
    </div>
  );
}
