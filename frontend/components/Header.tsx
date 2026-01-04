"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, History, Home, Users, LogOut, ChevronDown, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useState, useRef, useEffect } from "react";

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    setShowMobileMenu(false);
    router.push("/login");
  };

  return (
    <header className="bg-white/70 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 sm:py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-xl group-hover:shadow-primary-500/30 transition-all duration-300">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="hidden xs:block">
              <h1 className="font-heading font-bold text-base sm:text-xl text-gray-900 tracking-tight">
                D.S. ENTERPRISES
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium hidden sm:block">
                Engineers, Approved Valuers & Project Consultants
              </p>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all duration-200"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <Link
              href="/history"
              className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all duration-200"
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </Link>
            
            {isAdmin && (
              <Link
                href="/admin/users"
                className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 font-medium transition-all duration-200"
              >
                <Users className="w-4 h-4" />
                <span>Users</span>
              </Link>
            )}

            {/* User Menu - Desktop */}
            {isAuthenticated && user && (
              <div className="relative ml-2" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200"
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden lg:block text-left max-w-[120px]">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-sm text-gray-500 truncate" title={user.email}>{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700 capitalize">
                        {user.role}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && user && (
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-all duration-200"
              >
                {showMobileMenu ? (
                  <X className="w-6 h-6 text-gray-700" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-700" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && isAuthenticated && user && (
          <div className="md:hidden border-t border-gray-100 py-4 space-y-2 animate-fade-in">
            {/* User Info */}
            <div className="flex items-center gap-3 px-2 py-3 bg-gray-50 rounded-xl mb-4">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border-2 border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700 capitalize flex-shrink-0">
                {user.role}
              </span>
            </div>

            {/* Navigation Links */}
            <Link
              href="/"
              onClick={() => setShowMobileMenu(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all duration-200"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link
              href="/history"
              onClick={() => setShowMobileMenu(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all duration-200"
            >
              <History className="w-5 h-5" />
              <span>History</span>
            </Link>
            
            {isAdmin && (
              <Link
                href="/admin/users"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 font-medium transition-all duration-200"
              >
                <Users className="w-5 h-5" />
                <span>Manage Users</span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
