import { useRef, useState } from "react";

interface UploadButtonProps {
  /** Button label when idle — e.g. "Upload" / "Re-upload" / "Update". */
  label: string;
  /** Performs the actual upload; should throw on failure. */
  upload: (file: File) => Promise<void>;
}

/**
 * Animated upload button (CSS/SVG): an idle marching border, an accent loading
 * stroke while uploading, then a green cloud + check that draws on success.
 * Adapted from a Uiverse pattern, recolored to the brand and driven by real
 * upload state instead of :focus.
 */
export default function UploadButton({ label, upload }: UploadButtonProps) {
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setState("uploading");
    try {
      await upload(file);
      setState("done");
      setTimeout(() => setState("idle"), 1800);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Upload failed");
      setState("idle");
    }
  }

  return (
    <span className="upbtn-wrap">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <button
        className={`upbtn is-${state}`}
        onClick={() => inputRef.current?.click()}
        disabled={state !== "idle"}
        aria-label={label}
      >
        <svg className="upbtn-svg" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <rect className="upbtn-rect upbtn-border" pathLength={100} />
          <rect className="upbtn-rect upbtn-load" pathLength={100} />
        </svg>
        <svg className="upbtn-done-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path className="upbtn-done-path upbtn-cloud" pathLength={100} d="M 6.5,20 Q 4.22,20 2.61,18.43 1,16.85 1,14.58 1,12.63 2.17,11.1 3.35,9.57 5.25,9.15 5.88,6.85 7.75,5.43 9.63,4 12,4 14.93,4 16.96,6.04 19,8.07 19,11 q 1.73,0.2 2.86,1.5 1.14,1.28 1.14,3 0,1.88 -1.31,3.19 Q 20.38,20 18.5,20 Z" />
          <path className="upbtn-done-path upbtn-check" pathLength={100} d="M 7.515,12.74 10.34143,15.563569 15.275,10.625" />
        </svg>
        <span className="upbtn-txt">{state === "uploading" ? "Uploading…" : label}</span>
      </button>
      {error && <span className="vlt-err">{error}</span>}
    </span>
  );
}
