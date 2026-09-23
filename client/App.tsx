import "./global.css";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";
import { authClient, sessionExpiredEvent } from "./lib/auth";

function HomeRoute() {
  return authClient.getSession() ? <Navigate to="/inbox" replace /> : <Navigate to="/auth" replace />;
}

/**
 * Global handler for expired/invalid sessions: any authenticated API call that
 * comes back 401 clears the session and lands the user on the login page with
 * a clear message instead of a broken, half-loaded app.
 */
function SessionExpiryEffect() {
  const navigate = useNavigate();
  useEffect(() => {
    const handleSessionExpired = () => {
      authClient.logout();
      if (window.location.pathname !== "/auth") {
        navigate("/auth?expired=1", { replace: true });
      }
    };
    window.addEventListener(sessionExpiredEvent, handleSessionExpired);
    return () => window.removeEventListener(sessionExpiredEvent, handleSessionExpired);
  }, [navigate]);
  return null;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionExpiryEffect />
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/inbox" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
