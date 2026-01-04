"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { User, LoginResponse } from "./types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (response: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "ds_auth_token";
const USER_KEY = "ds_user";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Verify session with backend
  const verifySession = useCallback(async (storedToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setToken(storedToken);
        // Update stored user data with fresh data from server
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        return true;
      } else {
        // Session invalid - user might be deleted or deactivated
        logout();
        return false;
      }
    } catch (error) {
      console.error("Failed to verify session:", error);
      // On network error, keep the session but don't verify
      // This allows offline usage but will fail on next API call
      return false;
    }
  }, [logout]);

  useEffect(() => {
    // Load auth state from localStorage on mount
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Temporarily set user for faster UI
          setToken(storedToken);
          setUser(parsedUser);
          
          // Verify session with backend
          await verifySession(storedToken);
        } catch {
          // Invalid stored data, clear it
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [verifySession]);

  const login = (response: LoginResponse) => {
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === "admin",
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Higher-order component to protect routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requireAdmin = false
) {
  return function ProtectedRoute(props: P) {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return null;
    }

    if (requireAdmin && !isAdmin) {
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      return null;
    }

    return <Component {...props} />;
  };
}
