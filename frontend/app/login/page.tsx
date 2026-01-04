"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Shield, Users, ClipboardCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  useEffect(() => {
    // Redirect if already logged in
    if (!authLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    // Load Google OAuth script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleLogin = () => {
    if (!window.google || !GOOGLE_CLIENT_ID) {
      setError("Google OAuth is not configured. Please contact administrator.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "email profile",
      callback: async (response) => {
        if (response.error) {
          setError("Google login failed. Please try again.");
          setIsLoading(false);
          return;
        }

        if (response.access_token) {
          try {
            const loginResponse = await authApi.loginWithGoogle(response.access_token);
            login(loginResponse);
            router.push("/");
          } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string; error?: string } } };
            setError(
              error.response?.data?.message ||
              error.response?.data?.error ||
              "Login failed. You may not have access to this system."
            );
          } finally {
            setIsLoading(false);
          }
        }
      },
    });

    client.requestAccessToken();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-lg sm:text-xl text-gray-900 tracking-tight">
                  D.S. ENTERPRISES
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                  Engineers, Approved Valuers & Project Consultants
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8 sm:py-16">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Property Inspection System
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Welcome Back
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Sign in to access the property inspection system
          </p>
        </div>

        {/* Login Card */}
        <div className="card p-6 sm:p-8 animate-fade-in animation-delay-100">
          {/* Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Secure Access</p>
                <p className="text-xs text-gray-500">Google authentication</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Role-based Access</p>
                <p className="text-xs text-gray-500">Admin & user permissions</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <ClipboardCheck className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Inspection Management</p>
                <p className="text-xs text-gray-500">Create & manage reports</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading || !googleLoaded}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-800 font-semibold py-3 sm:py-4 px-6 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Info */}
          <p className="mt-6 text-center text-gray-500 text-xs sm:text-sm">
            Only authorized users can access this system.
            <br />
            Contact your administrator for access.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          © {new Date().getFullYear()} D.S. Enterprises. All rights reserved.
        </p>
      </main>
    </div>
  );
}
