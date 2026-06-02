interface CardPayButtonProps {
  label?:    string;
  onClick?:  () => void;
  disabled?: boolean;
  busy?:     boolean;
}

/**
 * Premium card-terminal pay button. On hover the credit card slides up,
 * a POS terminal rises into frame, and the ₹ symbol fades in.
 * Pure CSS — no styled-components.
 */
export default function CardPayButton({ label = "Pay Now", onClick, disabled, busy }: CardPayButtonProps) {
  const inactive = disabled || busy;
  return (
    <div
      role="button"
      tabIndex={inactive ? -1 : 0}
      className={`cpb${busy ? " cpb--busy" : ""}${disabled ? " cpb--disabled" : ""}`}
      onClick={inactive ? undefined : onClick}
      onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && !inactive) onClick?.(); }}
    >
      <div className="cpb-left">
        {busy ? (
          <div className="cpb-spinner" />
        ) : (
          <>
            <div className="cpb-card">
              <div className="cpb-card-line" />
              <div className="cpb-card-dots" />
            </div>
            <div className="cpb-post">
              <div className="cpb-post-line" />
              <div className="cpb-screen">
                <span className="cpb-rupee">₹</span>
              </div>
              <div className="cpb-keypad" />
              <div className="cpb-keypad cpb-keypad--2" />
            </div>
          </>
        )}
      </div>
      <div className="cpb-right">
        <span className="cpb-label">{busy ? "Processing…" : label}</span>
      </div>
    </div>
  );
}
