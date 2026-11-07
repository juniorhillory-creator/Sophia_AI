import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface DashboardHeaderProps {
  onCollapseToggle: () => void;
}

export function DashboardHeader({ onCollapseToggle }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-stone-200 bg-white/95 backdrop-blur-lg supports-[backdrop-filter]:bg-white/80 px-4 sm:px-6 shadow-card">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="md:hidden p-2 text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
          onClick={onCollapseToggle}
          aria-label="Open navigation"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <a href="/" className="flex items-center gap-2" aria-label="Sophia AI - Home">
          <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="brandGradientHeaderDash" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f26934" />
                <stop offset="100%" stopColor="#c44e22" />
              </linearGradient>
              <linearGradient id="accentGradientHeaderDash" x1="0" y1="16" x2="32" y2="16" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f26934" />
                <stop offset="50%" stopColor="#ff8c42" />
                <stop offset="100%" stopColor="#f26934" />
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="15" stroke="url(#brandGradientHeaderDash)" strokeWidth="2" />
            <path d="M8 22C8 15.37 13.37 10 20 10C26.63 10 32 15.37 32 22" stroke="url(#accentGradientHeaderDash)" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="8" cy="22" r="3" fill="url(#brandGradientHeaderDash)" />
            <circle cx="20" cy="10" r="2.5" fill="url(#accentGradientHeaderDash)" />
            <circle cx="32" cy="22" r="2" fill="url(#brandGradientHeaderDash)" />
          </svg>
          <span className="text-xl font-bold tracking-tight text-stone-900">Sophia</span>
          <span className="text-xs font-medium text-brand hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-brand-light">AI</span>
        </a>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-700 rounded-lg hover:bg-stone-100 transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-label="User menu"
            >
              <span className="hidden sm:inline">{user.full_name ?? user.email}</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand text-sm font-medium" aria-hidden="true">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </span>
              <svg className="h-4 w-4 text-stone-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
              </svg>
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white py-2 shadow-elevated ring-1 ring-stone-200 animate-fade-in" role="menu" aria-orientation="vertical">
                  <div className="px-3 py-2 border-b border-stone-100 flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand text-base font-medium" aria-hidden="true">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{user.full_name ?? user.email}</p>
                      <p className="text-sm text-stone-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <a href="/dashboard" className="block px-3 py-2 text-sm text-stone-700 rounded-none hover:bg-stone-50 focus:outline-none focus:bg-stone-50" role="menuitem" onClick={() => setProfileOpen(false)}>
                    Dashboard
                  </a>
                  <a href="/papers" className="block px-3 py-2 text-sm text-stone-700 rounded-none hover:bg-stone-50 focus:outline-none focus:bg-stone-50" role="menuitem" onClick={() => setProfileOpen(false)}>
                    My Research Papers
                  </a>
                  <a href="/settings" className="block px-3 py-2 text-sm text-stone-700 rounded-none hover:bg-stone-50 focus:outline-none focus:bg-stone-50" role="menuitem" onClick={() => setProfileOpen(false)}>
                    Account Settings
                  </a>
                  <hr className="my-1 border-stone-100" />
                  <button type="button" className="w-full text-left px-3 py-2 text-sm text-error hover:bg-error-light focus:outline-none focus:bg-error-light" role="menuitem" onClick={() => void logout()}>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" className="px-4 py-2 text-sm font-medium text-stone-700 rounded-lg hover:bg-stone-100 transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2" onClick={() => navigate("/login")}>
              Sign in
            </button>
            <button type="button" className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2" onClick={() => navigate("/register")}>
              Create account
            </button>
          </div>
        )}
      </div>
    </header>
  );
}