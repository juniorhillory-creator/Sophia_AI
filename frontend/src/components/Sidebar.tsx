import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  activePath?: string;
}

export function Sidebar({
  collapsed = false,
  setCollapsed,
  activePath = "/papers",
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Normalize active item: highlight "My Papers" on both /dashboard and /papers
  const currentActive =
    activePath === "/dashboard" || activePath === "/papers"
      ? "/papers"
      : activePath;

  const navItems = [
    {
      id: "/dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: (active: boolean) => (
        <svg
          className={`h-5 w-5 shrink-0 ${active ? "text-orange-600" : "text-gray-500"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: "/papers",
      label: "My Papers",
      href: "/dashboard",
      icon: (active: boolean) => (
        <svg
          className={`h-5 w-5 shrink-0 ${active ? "text-orange-600" : "text-gray-500"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      ),
    },
    {
      id: "/workspace",
      label: "Research Workspace",
      href: "/workspace",
      icon: (active: boolean) => (
        <svg
          className={`h-5 w-5 shrink-0 ${active ? "text-orange-600" : "text-gray-500"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      ),
    },
    {
      id: "/writer",
      label: "AI Writer",
      href: "/writer",
      badge: "SCISPACE",
      icon: (active: boolean) => (
        <svg
          className={`h-5 w-5 shrink-0 ${active ? "text-orange-600" : "text-gray-500"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <line x1="16" y1="8" x2="2" y2="22" />
          <line x1="17.5" y1="15" x2="9" y2="15" />
        </svg>
      ),
    },
  ];

  const initial = (
    user?.full_name ? user.full_name.charAt(0) : user?.email ? user.email.charAt(0) : "K"
  ).toUpperCase();

  const displayName =
    user?.full_name || (user?.email ? user.email.split("@")[0] : "kush");
  const displayEmail = user?.email || "kushmitha259@gmail.com";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col justify-between border-r border-gray-200 bg-white transition-all duration-200 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      }`}
      aria-label="Sidebar navigation"
    >
      {/* Top logo header */}
      <div>
        <div className="flex h-16 items-center justify-between border-b border-gray-150 px-4.5">
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => navigate("/dashboard")}
            title="Sophia AI Home"
          >
            <img
              src="/logo-icon.png"
              alt="Sophia Logo"
              className="h-6 w-6 object-contain"
            />
            {!collapsed && (
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-gray-900 tracking-tight">
                  Sophia
                </span>
                <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 border border-orange-100">
                  AI
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed?.(!collapsed)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle navigation"
          >
            <svg
              className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = currentActive === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.href)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#fff4ed] text-orange-600 font-semibold"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                } ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon(isActive)}
                {!collapsed && (
                  <>
                    <span className="truncate text-left">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto rounded bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-600 border border-orange-200/50">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile section */}
      <div className="relative border-t border-gray-200 p-3">
        {profileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setProfileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute bottom-16 left-3 right-3 z-20 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  void logout();
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="10" y1="13" x2="21" y2="13" />
                </svg>
                Sign out
              </button>
            </div>
          </>
        )}

        <div
          className={`flex items-center gap-3 rounded-xl p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
            collapsed ? "justify-center p-0" : ""
          }`}
          onClick={() => setProfileMenuOpen((prev) => !prev)}
          title="Account profile & sign out"
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold select-none">
            {initial}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 leading-tight truncate">
                {displayEmail}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
