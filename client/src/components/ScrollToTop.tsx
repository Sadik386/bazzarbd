import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Standard scroll to top
    window.scrollTo(0, 0);
    
    // Also scroll HTML/body elements to be safe
    document.documentElement.scrollTo({ top: 0 });
    document.body.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
