import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const serverPaths = ["/docs", "/dashboard", "/static"];

export default function RedirectIfServerPage() {
  const location = useLocation();

  useEffect(() => {
    const matched = serverPaths.find((path) =>
      location.pathname.startsWith(path)
    );

    if (matched) {
      window.location.href = `http://46.101.120.80:8000${location.pathname}`;
    }
  }, [location.pathname]);

  return null;
}
