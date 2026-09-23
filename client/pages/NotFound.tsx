import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] text-center">
      <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#6054d8]">loop.</p><h1 className="mt-3 text-5xl font-extrabold text-[#252d45]">404</h1><p className="mt-3 text-[#8791a5]">This conversation could not be found.</p><Link to="/" className="mt-6 inline-block rounded-xl bg-[#6054d8] px-5 py-3 text-sm font-bold text-white">Return to inbox</Link></div>
    </div>
  );
};

export default NotFound;
