"use client";

import type { ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  // Authentication is required - users must sign in to access the platform
  return <>{children}</>;
}
