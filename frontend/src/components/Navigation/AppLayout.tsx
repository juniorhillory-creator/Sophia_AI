import { useState } from "react";
import { NavRail } from "./NavRail";

interface AppLayoutProps {
  children: React.ReactNode;
  activeItem?: string;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-stone-50 font-sans text-stone-900">
      <NavRail collapsed={collapsed} onToggleCollapse={() => setCollapsed((prev) => !prev)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
