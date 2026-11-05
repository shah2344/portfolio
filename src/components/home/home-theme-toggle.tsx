"use client";

import { type MouseEvent, useEffect, useRef, useState } from "react";

import { currentWipe, updateWithWipe } from "@/components/motion/page-wipe";

export function HomeThemeToggle() {
  const [hovered, setHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!hovered) return;
    const trackPointer = (event: PointerEvent) => {
      const bounds = buttonRef.current?.getBoundingClientRect();
      if (!bounds) return;
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        setHovered(false);
      }
    };
    // Snapshot capture can temporarily clear :hover without pointer movement.
    // Keep the highlight until the pointer actually moves outside the button.
    window.addEventListener("pointermove", trackPointer);
    const clearHover = () => setHovered(false);
    window.addEventListener("blur", clearHover);
    return () => {
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("blur", clearHover);
    };
  }, [hovered]);
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const systemAppearance = window.matchMedia("(prefers-color-scheme: dark)");
    let previousDark: boolean | undefined;
    const syncAppearance = () => {
      const root = document.documentElement;
      const dark = root.dataset.theme
        ? root.dataset.theme === "dark"
        : systemAppearance.matches;
      button.setAttribute("aria-pressed", String(dark));
      if (previousDark !== undefined && previousDark !== dark) {
        button.dataset.iconReady = "true";
      }
      previousDark = dark;
    };

    syncAppearance();
    const observer = new MutationObserver(syncAppearance);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    systemAppearance.addEventListener("change", syncAppearance);
    return () => {
      observer.disconnect();
      systemAppearance.removeEventListener("change", syncAppearance);
    };
  }, []);

  function toggleTheme(event: MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const root = document.documentElement;
    const dark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = dark ? "light" : "dark";
    updateWithWipe(
      () => {
        // Commit colors together while the icon keeps its own state transition.
        root.dataset.themeChanging = "";
        root.dataset.theme = theme;
        void root.offsetHeight;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => delete root.dataset.themeChanging);
        });
        try {
          localStorage.setItem("portfolio-theme", theme);
        } catch {
          // The current page still switches when storage is unavailable.
        }
        document
          .querySelectorAll('meta[name="theme-color"]')
          .forEach((meta) => {
            meta.setAttribute("content", dark ? "#fcfcfc" : "#0f0f0f");
          });
      },
      dark ? "back" : "forward",
      { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
    );
  }

  return (
    <button
      className="home-theme-toggle"
      type="button"
      aria-label="Dark mode"
      aria-pressed={false}
      data-home-tip="Appearance"
      data-home-tip-anchor="top"
      data-home-tip-persist
      ref={buttonRef}
      data-hovered={hovered ? "" : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        // Real pointer movement is tracked above; snapshot exits are temporary.
        if (currentWipe()) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          setHovered(false);
        }
      }}
      onClick={toggleTheme}
    >
      {/* User-supplied sun and moon artwork for the current appearance. */}
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <g className="home-theme-toggle__icon home-theme-toggle__icon--moon">
          <path d="M12.0517 3.59971C12.2712 3.28123 12.2873 2.86472 12.0931 2.53021C11.8989 2.19569 11.5292 2.00315 11.1438 2.03581C6.0214 2.46985 2 6.76372 2 11.9979C2 17.5197 6.47632 21.996 11.9981 21.996C17.2324 21.996 21.5264 17.9745 21.9602 12.8519C21.9929 12.4664 21.8003 12.0968 21.4658 11.9026C21.1313 11.7084 20.7148 11.7246 20.3963 11.9441C19.4302 12.61 18.2602 12.9998 16.9961 12.9998C13.6824 12.9998 10.9961 10.3135 10.9961 6.99976C10.9961 5.73577 11.3858 4.56582 12.0517 3.59971Z" />
        </g>
        <g className="home-theme-toggle__icon home-theme-toggle__icon--sun">
          <path d="M12 20C12.5523 20 13 20.4477 13 21V23C13 23.5523 12.5523 24 12 24C11.4477 24 11 23.5523 11 23V21C11 20.4477 11.4477 20 12 20Z" />
          <path d="M4.92871 17.6572C5.31923 17.2667 5.95225 17.2667 6.34277 17.6572C6.7333 18.0478 6.7333 18.6808 6.34277 19.0713L4.92871 20.4854C4.53818 20.8757 3.90513 20.8758 3.51465 20.4854C3.12418 20.0949 3.12427 19.4618 3.51465 19.0713L4.92871 17.6572Z" />
          <path d="M17.6572 17.6572C18.0478 17.2667 18.6808 17.2667 19.0713 17.6572L20.4854 19.0713C20.8757 19.4618 20.8758 20.0949 20.4854 20.4854C20.0949 20.8758 19.4618 20.8757 19.0713 20.4854L17.6572 19.0713C17.2667 18.6808 17.2667 18.0478 17.6572 17.6572Z" />
          <path d="M7.75781 7.75781C10.101 5.41467 13.899 5.41467 16.2422 7.75781C18.5853 10.101 18.5853 13.899 16.2422 16.2422C13.899 18.5853 10.101 18.5853 7.75781 16.2422C5.41467 13.899 5.41467 10.101 7.75781 7.75781Z" />
          <path d="M3 11C3.55228 11 3.99999 11.4477 4 12C4 12.5523 3.55228 13 3 13H1C0.447715 13 0 12.5523 0 12C0 11.4477 0.447722 11 1 11H3Z" />
          <path d="M23 11C23.5523 11 24 11.4477 24 12C24 12.5523 23.5523 13 23 13H21C20.4477 13 20 12.5523 20 12C20 11.4477 20.4477 11 21 11H23Z" />
          <path d="M3.51465 3.51465C3.90513 3.12418 4.53818 3.12427 4.92871 3.51465L6.34277 4.92871C6.7333 5.31923 6.73329 5.95225 6.34277 6.34277C5.95225 6.7333 5.31923 6.73329 4.92871 6.34277L3.51465 4.92871C3.12427 4.53818 3.12417 3.90512 3.51465 3.51465Z" />
          <path d="M19.0713 3.51465C19.4618 3.12428 20.0949 3.12419 20.4854 3.51465C20.8758 3.90512 20.8757 4.53817 20.4854 4.92871L19.0713 6.34277C18.6808 6.7333 18.0478 6.7333 17.6572 6.34277C17.2667 5.95225 17.2667 5.31923 17.6572 4.92871L19.0713 3.51465Z" />
          <path d="M12 0C12.5523 0 13 0.447715 13 1V3C13 3.55228 12.5523 4 12 4C11.4477 4 11 3.55228 11 3V1C11 0.447715 11.4477 0 12 0Z" />
        </g>
      </svg>
    </button>
  );
}
