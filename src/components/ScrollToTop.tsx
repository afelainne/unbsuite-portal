import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls window (and the main scroll container, if any) to the top
 * whenever the route pathname changes.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    // Also reset any scrollable main element (some tools nest their own scroll containers)
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, [pathname]);

  return null;
};

export default ScrollToTop;
