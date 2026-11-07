import { useState } from "react";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export function PasswordInput({
  value,
  onChange,
  label = "Password",
  placeholder,
  disabled = false,
  required = false,
  error,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-stone-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="w-full border border-stone-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded-lg disabled:bg-stone-50 pr-12"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-500 hover:text-brand transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide password" : "Show password"}
          disabled={disabled}
        >
          {visible ? "🙈" : "👁️"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  );
}