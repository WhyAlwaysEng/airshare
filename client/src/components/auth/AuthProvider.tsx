import { type ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — Currently provides guest-only mode.
 * Firebase auth can be added later by importing Firebase SDK,
 * implementing login/register forms, and setting user in the store.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  return <>{children}</>;
}
