"use client";

import { m } from "motion/react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

/** The product's ToggleSwitch (src/components/ui/toggle-switch.tsx). */
export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: ToggleSwitchProps) {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={handleToggle}
      className={`relative inline-flex h-[1.9375rem] w-[3.1875rem] items-center rounded-full transition-colors ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
      style={{
        backgroundColor: checked
          ? "color(display-p3 0.204 0.78 0.345)"
          : "var(--fills-tertiary)",
      }}
    >
      <m.span
        className="inline-block h-[1.6875rem] w-[1.6875rem] rounded-full bg-white shadow-sm"
        animate={{
          x: checked ? "1.375rem" : "0.125rem",
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      />
    </button>
  );
}
