interface GoogleButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export function GoogleButton({ onClick, disabled = false, label = "Continue with Google" }: GoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66v-2.77c-1.16-.78-1.95-1.94-2.21-3.31H12v3.72c-1.02 0-1.93-.24-2.72-.68v-2.14h-2.98v2.14c-2.78.47-5.15-1.3-6.64-3.87h2.98v1.75h2.66c-.08.52-.16 1.04-.16 1.59 0 1.61 1.32 2.92 2.97 2.92z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.39-.79-.6-1.7-.6-2.66 0-.96.21-1.87.6-2.66H2.13v1.75H5.84c-.75 1.24-1.23 2.66-1.23 4.25 0 1.6.49 3.09 1.24 4.25H2.13v1.75h3.71c1.97-2.28 3.16-5.32 3.16-8.59z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.61 0 3.09.39 4.43 1.16h2.97c-.61-2.28-1.97-4-3.78-4.91C14.41 3.14 13.23 3 12 3c-3.53 0-6.55 2.26-7.31 5.48h2.98c.36-.88 1-1.53 1.83-1.89 1.38-.61 2.97-.96 4.66-.96zM12 19.06c-1.69 0-3.2-.6-4.38-1.64H2.13v1.75h3.65c1.07 1.29 2.35 2.12 3.81 2.35v-2.46h2.66v2.46c1.46-.23 2.74-1.06 3.74-2.35h3.7v-1.75H12z"
        />
      </svg>
      {label}
    </button>
  );
}