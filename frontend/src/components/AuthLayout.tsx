import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:py-16 bg-stone-50">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}