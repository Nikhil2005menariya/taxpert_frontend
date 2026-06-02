interface DownloadButtonProps {
  label?: string;
  onClick?: () => void;
  href?: string;
  loading?: boolean;
  disabled?: boolean;
}

const Glyph = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
  </svg>
);

/**
 * Download button: text slides out and a download glyph slides in on hover
 * while the surface darkens. Adapted from a Uiverse pattern, themed.
 */
export default function DownloadButton({ label = "Download", onClick, href, loading, disabled }: DownloadButtonProps) {
  const inner = (
    <>
      <span className="dlbtn-text">{loading ? "…" : label}</span>
      <span className="dlbtn-ico"><Glyph /></span>
    </>
  );
  if (href) {
    return <a className="dlbtn" href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  }
  return <button className="dlbtn" onClick={onClick} disabled={disabled || loading}>{inner}</button>;
}
