import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Client-side scroll handling for the SPA:
 *  - When the URL carries a `#hash`, smooth-scroll that element into view
 *    (retries briefly so it still works for sections that mount after a query
 *    resolves, and when arriving from another route).
 *  - With no hash, jump to the top on every path change — otherwise react-router
 *    preserves the previous page's scroll position.
 *
 * Mount once inside <BrowserRouter>, above <Routes>.
 */
export default function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      let tries = 0;
      const tick = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (tries++ < 12) {
          // element not mounted yet (async section) — retry next frame
          requestAnimationFrame(tick);
        } else {
          // target never appeared — don't leave the page at the previous
          // route's scroll position; reset to the top instead
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
      };
      requestAnimationFrame(tick);
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}
