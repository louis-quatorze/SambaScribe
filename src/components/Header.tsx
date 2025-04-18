"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, LogIn, LogOut, User, Home, ChevronDown, Music, LineChart } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

// Authorized user for analytics
const AUTHORIZED_EMAIL = "larivierlouise@gmail.com";

export function Header() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Check if user is authorized to access analytics
  const isAuthorizedForAnalytics = session?.user?.email === AUTHORIZED_EMAIL;

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  // Close the user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toggle user menu on click
  const toggleUserMenu = () => {
    setUserMenuOpen(prev => !prev);
  };

  // Track navigation events
  const trackNavigation = (destination: string) => {
    trackEvent('click', 'navigation', { destination });
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center p-4 md:px-6">
        <Link href="/" className="flex items-center space-x-2">
          <Music className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            SambaScribe
          </h1>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          {status === "authenticated" && session?.user ? (
            <div className="flex items-center gap-4">
              <div 
                className="relative" 
                ref={userMenuRef}
              >
                <button 
                  onClick={toggleUserMenu}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                    {session.user.name ? session.user.name.charAt(0).toUpperCase() : session.user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{session.user.name || session.user.email}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                      {isAuthorizedForAnalytics && (
                        <Link
                          href="/admin/analytics"
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => {
                            setUserMenuOpen(false);
                            trackNavigation('analytics');
                          }}
                        >
                          <LineChart className="h-4 w-4" />
                          Analytics
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          handleSignOut();
                          trackEvent('auth', 'signout', {});
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link 
                href="/api/auth/signin" 
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-50 md:hidden">
            <div className="flex flex-col p-4 space-y-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={() => {
                  setMobileMenuOpen(false);
                  trackNavigation('home');
                }}
              >
                <Home className="h-5 w-5" />
                Home
              </Link>
              
              {status === "authenticated" && isAuthorizedForAnalytics && (
                <Link
                  href="/admin/analytics"
                  className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    trackNavigation('analytics');
                  }}
                >
                  <LineChart className="h-5 w-5" />
                  Analytics
                </Link>
              )}
              
              {status === "authenticated" ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                    trackEvent('auth', 'signout', {});
                  }}
                  className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/api/auth/signin"
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LogIn className="h-5 w-5" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 