"use client";

import * as React from "react";
import { AnimatePresence, m, type HTMLMotionProps } from "motion/react";

import { cn } from "@/lib/utils";

import { Spinner } from "./spinner";

export interface PrimaryButtonProps extends Omit<
  HTMLMotionProps<"button">,
  "animate"
> {
  children: React.ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  animate?: {
    backgroundColor?: string;
    color?: string;
  };
}

export const PrimaryButton = React.forwardRef<
  HTMLButtonElement,
  PrimaryButtonProps
>(
  (
    {
      children,
      disabled = false,
      isLoading = false,
      className,
      animate,
      onClick,
      ...props
    },
    ref,
  ) => {
    const isEnabled = !disabled;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    const defaultBgColor = isEnabled
      ? "#0A0A0A"
      : "var(--background-secondary)";
    const defaultTextColor = isEnabled
      ? "var(--labels-inverse)"
      : "var(--labels-tertiary)";

    return (
      <m.button
        ref={ref}
        className={cn(
          "primary-button text-spec-17 flex h-[3.5rem] w-auto items-center justify-center gap-3 rounded-full pr-6 pl-5 font-semibold",
          !isEnabled && "primary-button-disabled",
          className,
        )}
        disabled={disabled}
        {...(animate
          ? {
              animate: {
                backgroundColor: animate.backgroundColor,
                color: animate.color,
              },
            }
          : {})}
        transition={{
          type: "spring",
          duration: 0.5,
          bounce: 0,
        }}
        style={{
          cursor: isEnabled ? "pointer" : "not-allowed",
          fontFamily: "var(--font-inter)",
          willChange: "background-color, color, box-shadow",
          position: "relative",
          backgroundColor: animate?.backgroundColor || defaultBgColor,
          color: animate?.color || defaultTextColor,
          ...props.style,
        }}
        whileTap={{ scale: isEnabled && !isLoading ? 0.96 : 1 }}
        onClick={handleClick}
        {...props}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={isLoading ? "loading" : "content"}
            initial={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="flex items-center justify-center gap-3"
            style={{ position: "relative", zIndex: 3 }}
          >
            {isLoading ? <Spinner className="h-6 w-6" /> : children}
          </m.span>
        </AnimatePresence>
      </m.button>
    );
  },
);

PrimaryButton.displayName = "PrimaryButton";
