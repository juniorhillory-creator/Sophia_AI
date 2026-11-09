import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  icon: (active: boolean) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (active) => (
      <svg className={`h-5 w-5 ${active ? "text-brand" : "text-stone-500"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" ry="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" ry="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" ry="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" ry="1" />
      </svg>
    ),
  },
  {
    href: "/papers",
    label: "My Papers",
    icon: (active) => (
      <svg className={`h-5 w-5 ${active ? "text-brand" : "text-stone-500"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="9" y1="7" x2="15" y2="7" />
        <line x1="9" y1="11" x2="13" y2="11" />
      </svg>
    ),
  },
  {
    href: "/workspace",
    label: "Research Workspace",
    icon: (active) => (
      <svg className={`h-5 w-5 ${active ? "text-brand" : "text-stone-500"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <path d="M7 8h2" />
        <path d="M15 8h2" />
      </svg>
    ),
  },
  {
    href: "/writer",
    label: "AI Writer",
    badge: "SciSpace",
    icon: (active) => (
      <svg className={`h-5 w-5 ${active ? "text-brand" : "text-stone-500"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
];

interface NavRailProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function NavRail({ collapsed, onToggleCollapse }: NavRailProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <aside
      className={`relative z-30 flex flex-col border-r border-stone-200 bg-white transition-all duration-200 ease-in-out ${
        collapsed ? "w-16" : "w-60"
      }`}
      aria-label="Application Rail"
    >
      {/* Brand header */}
      <div className="flex h-14 items-center justify-between border-b border-stone-200 px-3">
        <div
          className="flex items-center gap-2.5 cursor-pointer overflow-hidden"
          onClick={() => navigate("/dashboard")}
          title="Sophia AI - Home"
        >
          <img src="/logo-icon.png" alt="Sophia AI" className="h-8 w-8 shrink-0 object-contain" />
          {!collapsed && (
            <div className="flex items-center gap-1.5 animate-fade-in whitespace-nowrap">
              <span className="text-base font-bold tracking-tight text-stone-900">Sophia</span>
              <span className="rounded-full bg-brand-light px-1.5 py-0.5 text-[10px] font-semibold text-brand">AI</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 space-y-1.5 px-2 py-3 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => navigate(item.href)}
              title={collapsed ? item.label : undefined}
              className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-brand/10 text-brand font-semibold shadow-xs"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              } ${collapsed ? "justify-center px-0" : ""}`}
            >
              <div className="shrink-0">{item.icon(isActive)}</div>
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between overflow-hidden text-left animate-fade-in">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="rounded bg-brand/15 px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider text-brand">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className="border-t border-stone-200 p-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className={`flex w-full items-center gap-2.5 rounded-lg p-2 text-stone-700 hover:bg-stone-100 transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
            title={user?.email}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() ?? "U")}
            </span>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left animate-fade-in">
                <p className="truncate text-xs font-semibold text-stone-900">
                  {user?.full_name || user?.username || "Researcher"}
                </p>
                <p className="truncate text-[11px] text-stone-500">
                  {user?.email}
                </p>
              </div>
            )}
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute bottom-12 left-2 z-50 w-52 rounded-xl border border-stone-200 bg-white py-1.5 shadow-xl animate-slide-up text-xs">
                <div className="border-b border-stone-100 px-3 py-2">
                  <p className="font-semibold text-stone-900 truncate">{user?.full_name || user?.username}</p>
                  <p className="text-stone-500 truncate">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/papers");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-stone-700 hover:bg-stone-50"
                >
                  <svg className="h-4 w-4 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  </svg>
                  My Papers
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    void logout();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
                >
                  <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="10" y1="13" x2="21" y2="13" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

