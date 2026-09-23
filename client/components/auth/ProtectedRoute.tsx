import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  return authClient.getSession() ? <>{children}</> : <Navigate to="/auth" replace />;
}
