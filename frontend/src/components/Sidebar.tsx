import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Sidebar as UiSidebar,
  SidebarHeader,
  SidebarNav,
  SidebarSection,
  SidebarItem,
  SidebarFooter,
  SidebarToggle,
} from "./ui/sidebar";
import {
  IconLayoutDashboard,
  IconFiles,
  IconUpload,
  IconPencil,
  IconSettings,
  IconLogout,
} from "@tabler/icons-react";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  activePath: string;
}

export function Sidebar({ collapsed, setCollapsed, activePath }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleNav = (href: string) => {
    navigate(href);
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs md:hidden"
          onClick={() => setCollapsed(true)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed md:sticky top-0 z-50 h-screen transition-transform duration-300 md:translate-x-0 ${
          collapsed ? "-translate-x-full md:translate-x-0" : "translate-x-0"
        }`}
      >
        <UiSidebar
          variant="collapsible"
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          width={256}
          collapsedWidth={64}
          aria-label="Sophia AI navigation"
          className="bg-white border-r border-stone-200 shadow-sm"
        >
          <SidebarHeader className="border-b border-stone-100">
            <div
              className="flex min-w-0 items-center gap-2.5 cursor-pointer"
              onClick={() => handleNav("/dashboard")}
              title="Sophia AI Home"
            >
              <img
                src="/logo-icon.png"
                alt="Sophia AI"
                className="size-7 shrink-0 object-contain"
              />
              {!collapsed && (
                <div className="flex items-center gap-1.5 min-w-0 animate-fade-in">
                  <span className="truncate text-[15px] font-bold tracking-tight text-stone-900">
                    Sophia
                  </span>
                  <span className="rounded-full bg-brand-light px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                    AI
                  </span>
                </div>
              )}
            </div>
            <SidebarToggle className="ml-auto text-stone-500 hover:text-stone-900" />
          </SidebarHeader>

          <SidebarNav>
            <SidebarSection label="Research">
              <SidebarItem
                icon={<IconLayoutDashboard className="size-[18px]" stroke={1.75} />}
                active={activePath === "/dashboard"}
                onClick={() => handleNav("/dashboard")}
              >
                Dashboard
              </SidebarItem>
              <SidebarItem
                icon={<IconFiles className="size-[18px]" stroke={1.75} />}
                active={activePath === "/papers"}
                onClick={() => handleNav("/papers")}
              >
                My Research Papers
              </SidebarItem>
              <SidebarItem
                icon={<IconUpload className="size-[18px]" stroke={1.75} />}
                active={activePath === "/upload"}
                onClick={() => handleNav("/upload")}
              >
                Upload Paper
              </SidebarItem>
            </SidebarSection>

            <SidebarSection label="Tools & Account">
              <SidebarItem
                icon={<IconPencil className="size-[18px]" stroke={1.75} />}
                active={activePath === "/writer"}
                badge={
                  <span className="rounded-md bg-brand-light px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                    AI
                  </span>
                }
                onClick={() => handleNav("/writer")}
              >
                AI Writer
              </SidebarItem>
              <SidebarItem
                icon={<IconSettings className="size-[18px]" stroke={1.75} />}
                active={activePath === "/settings"}
                onClick={() => handleNav("/settings")}
              >
                Account Settings
              </SidebarItem>
            </SidebarSection>
          </SidebarNav>

          <SidebarFooter className="border-t border-stone-100 flex-col gap-2">
            {user && (
              <div
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                  collapsed ? "justify-center" : ""
                }`}
                title={user.email}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-semibold">
                  {user.full_name
                    ? user.full_name.charAt(0).toUpperCase()
                    : user.email.charAt(0).toUpperCase()}
                </span>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium leading-tight text-stone-900">
                      {user.full_name ?? user.email.split("@")[0]}
                    </p>
                    <p className="truncate text-[11px] leading-tight text-stone-500">
                      {user.email}
                    </p>
                  </div>
                )}
              </div>
            )}
            <SidebarItem
              icon={<IconLogout className="size-[18px]" stroke={1.75} />}
              onClick={() => void logout()}
              className="text-error hover:bg-error-light hover:text-error"
            >
              Sign out
            </SidebarItem>
          </SidebarFooter>
        </UiSidebar>
      </div>
    </>
  );
}
