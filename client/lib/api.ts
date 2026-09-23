import type { HealthResponse } from "@shared/api";

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health");
  if (!response.ok) throw new Error("Health check failed");
  return response.json() as Promise<HealthResponse>;
}
