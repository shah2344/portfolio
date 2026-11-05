"use client";

import { type ReactNode, useRef, useState } from "react";
import {
  m,
  type MotionStyle,
  type SpringOptions,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

const SPRING_CONFIG: SpringOptions = {
  stiffness: 180,
  damping: 28,
  mass: 0.8,
};

export type TiltProps = {
  children: ReactNode;
  className?: string;
  reverse?: boolean;
  rotationFactor?: number;
  springOptions?: SpringOptions;
  style?: MotionStyle;
};

export function Tilt({
  children,
  className,
  reverse = false,
  rotationFactor = 4,
  springOptions = SPRING_CONFIG,
  style,
}: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  /*
   * A tilt that is only ever driven by a pointer has no business holding a 3D
   * rendering context before one arrives. `preserve-3d` plus a perspective
   * transform promotes the frame — and the full-width image inside it — to its
   * own composited layer for the life of the page; a case study with seven of
   * them was paying that on open and on scroll. The context is created on
   * first hover and kept from then on, so the spring still has somewhere to
   * settle back to.
   */
  const [engaged, setEngaged] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const xSpring = useSpring(x, springOptions);
  const ySpring = useSpring(y, springOptions);

  const rotateX = useTransform(
    ySpring,
    [-0.5, 0.5],
    reverse
      ? [rotationFactor, -rotationFactor]
      : [-rotationFactor, rotationFactor],
  );
  const rotateY = useTransform(
    xSpring,
    [-0.5, 0.5],
    reverse
      ? [-rotationFactor, rotationFactor]
      : [rotationFactor, -rotationFactor],
  );

  const transform = useMotionTemplate`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element || reduceMotion) return;

    if (!engaged) setEngaged(true);

    const rect = element.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function resetTilt() {
    x.set(0);
    y.set(0);
  }

  return (
    <m.div
      ref={ref}
      className={className}
      onMouseLeave={resetTilt}
      onMouseMove={handleMouseMove}
      style={{
        transformStyle: engaged ? "preserve-3d" : undefined,
        ...style,
        transform: reduceMotion || !engaged ? undefined : transform,
      }}
    >
      {children}
    </m.div>
  );
}
