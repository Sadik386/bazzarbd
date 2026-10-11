import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-2 text-8xl font-bold text-foreground/10">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Oops! Page not found</p>
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
