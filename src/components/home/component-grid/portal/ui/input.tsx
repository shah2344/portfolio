"use client";

import * as React from "react";

import { cn } from "./cn";

/* components/ui/input.tsx, verbatim (the ref is a plain prop in React 19). */

export interface InputProps extends Omit<
  React.ComponentProps<"input">,
  "prefix"
> {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: boolean;
  containerClassName?: string;
  prefixStyle?: React.CSSProperties;
}

const baseInputClasses =
  "h-[44px] w-full min-w-0 bg-[var(--control-base)] text-medium-default outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-medium-default disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 rounded-[var(--radius-5)] placeholder:text-[var(--label-faint)] transition-[border-color,box-shadow]";

const errorClasses =
  "border border-[var(--border-critical)] focus:border-[var(--border-critical)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)] focus-visible:ring-0";

const defaultClasses =
  "border border-[var(--border-strong)] hover:border-[var(--border-strong)] focus:border-[1.5px] focus:border-[var(--border-brand)] focus:shadow-[0_0_0_3px_rgba(92,97,255,0.15)] focus-visible:ring-0";

export function Input({
  className,
  type,
  prefix,
  suffix,
  error,
  containerClassName,
  prefixStyle,
  ref,
  ...props
}: InputProps) {
  if (!prefix && !suffix) {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(
          baseInputClasses,
          "px-3",
          error ? errorClasses : defaultClasses,
          className,
        )}
        style={{
          caretColor: "var(--label-primary)",
          paddingTop: "7px",
          paddingBottom: "8px",
          ...props.style,
        }}
        {...props}
      />
    );
  }

  return (
    <div className={cn("relative", containerClassName)}>
      {prefix && (
        <span
          className="text-medium-plus pointer-events-none absolute left-3 z-0 text-[var(--label-primary)]"
          style={{
            top: "50%",
            transform: "translateY(-35%)",
            ...prefixStyle,
          }}
        >
          {prefix}
        </span>
      )}
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(
          baseInputClasses,
          prefix ? "pl-6" : "pl-3",
          suffix ? "pr-10" : "pr-3",
          error ? errorClasses : defaultClasses,
          className,
        )}
        style={{
          caretColor: "var(--label-primary)",
          paddingTop: "7px",
          paddingBottom: "8px",
          ...props.style,
        }}
        {...props}
      />
      {suffix && (
        <div className="absolute top-1/2 right-4 z-10 -translate-y-1/2 transform">
          {suffix}
        </div>
      )}
    </div>
  );
}
