"use client";

import { m } from "motion/react";
import * as React from "react";

import { cn } from "./cn";

/*
 * components/ui/button.tsx, verbatim except: framer-motion -> motion/react
 * (`motion.button` -> `m.button`), cva() replaced by the equivalent string
 * composition (class-variance-authority is not installed), and the `asChild`
 * Slot path dropped (no portal call site uses it).
 */

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,opacity,box-shadow,border-color] cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-0 rounded-[var(--radius-4)] text-medium-plus will-change-transform backface-hidden";

const variants = {
  primary:
    "bg-[var(--control-primary)] text-[var(--label-primaryinverse)] hover:bg-[var(--control-primaryhover)] shadow-[0_0_0_1px_#1c1c1c,inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_3px_rgba(34,42,53,0.2),0_1px_1px_rgba(0,0,0,0.24)] focus-visible:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.15),0_0_0_1.5px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_3px_rgba(34,42,53,0.2),0_1px_1px_rgba(0,0,0,0.24)]",
  secondary:
    "bg-[var(--control-base)] text-[var(--label-primary)] hover:bg-[var(--control-basehover)] shadow-[0_0_0_1px_rgba(0,0,0,0.07),0_2px_3px_-1px_rgba(0,0,0,0.08),0_1px_0_rgba(0,0,0,0.02)] focus-visible:shadow-[0_0_0_1.5px_#5c61ff,0_0_0_3px_rgba(92,97,255,0.15),0_2px_3px_-1px_rgba(0,0,0,0.08),0_1px_0_rgba(0,0,0,0.02)]",
  destructive:
    "bg-[var(--control-critical)] text-[var(--label-primaryinverse)] hover:bg-[var(--control-crticalhover)] shadow-sm focus-visible:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.15),0_0_0_1.5px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)]",
  ghost:
    "bg-transparent text-[var(--label-primary)] hover:bg-[var(--control-basehover)] focus-visible:shadow-[0_0_0_1.5px_#5c61ff,0_0_0_3px_rgba(92,97,255,0.15)]",
  link: "bg-transparent text-[var(--label-link)] hover:underline",
} as const;

const sizes = {
  regular: "h-[34px] px-3 py-2",
  medium: "h-10 px-4",
  large: "h-11 px-4 py-3",
  "icon-regular": "size-[34px]",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonVariants({
  variant = "primary",
  size = "regular",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(base, variants[variant], sizes[size], className);
}

const hoverAnimation = { scale: 1.02 } as const;
const iconHoverAnimation = { scale: 1.05 } as const;
const tapAnimation = { scale: 0.96 } as const;
const pressTransition = {
  type: "tween",
  duration: 0.15,
  ease: "easeOut",
} as const;

type ButtonProps = Omit<
  React.ComponentProps<"button">,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDrop"
> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function Button({
  className,
  variant,
  size,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isIconButton = size?.startsWith("icon");

  return (
    <m.button
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, className }),
        leftIcon && "pl-2",
        rightIcon && "pr-2",
      )}
      disabled={disabled}
      style={{
        ...props.style,
        cursor: disabled ? "default" : "pointer",
      }}
      whileHover={
        !disabled
          ? isIconButton
            ? iconHoverAnimation
            : hoverAnimation
          : undefined
      }
      whileTap={!disabled ? tapAnimation : undefined}
      transition={pressTransition}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </m.button>
  );
}
