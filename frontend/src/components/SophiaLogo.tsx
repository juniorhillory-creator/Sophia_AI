interface SophiaLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const SIZE_MAP = {
  xs: { icon: "h-6 w-6", text: "text-base", badge: "text-[9px]" },
  sm: { icon: "h-8 w-8", text: "text-lg", badge: "text-[10px]" },
  md: { icon: "h-9 w-9", text: "text-xl", badge: "text-xs" },
  lg: { icon: "h-12 w-12", text: "text-2xl", badge: "text-xs" },
  xl: { icon: "h-16 w-16", text: "text-3xl", badge: "text-sm" },
};

export function SophiaLogo({
  className = "",
  iconOnly = false,
  size = "sm",
}: SophiaLogoProps) {
  const sizeStyles = SIZE_MAP[size];

  if (iconOnly) {
    return (
      <img
        src="/logo-icon.png"
        alt="Sophia AI"
        className={`${sizeStyles.icon} shrink-0 object-contain ${className}`}
      />
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo-icon.png"
        alt="Sophia AI"
        className={`${sizeStyles.icon} shrink-0 object-contain`}
      />
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className={`${sizeStyles.text} font-bold tracking-tight text-stone-900`}>
          Sophia
        </span>
        <span className={`rounded-full bg-brand-light px-1.5 py-0.5 ${sizeStyles.badge} font-semibold text-brand`}>
          AI
        </span>
      </div>
    </div>
  );
}
