"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";

import { FitStage } from "../../fit-stage";
import "../app-product.css";
import { PrimaryButton } from "../ui/primary-button";
import { ToggleSwitch } from "./toggle-switch";

const CHECK = "/media/craft/components/app/icons/status/checkmark.circle.svg";

/**
 * The product's primary and secondary buttons with the toggle switch and the
 * toast. Continue runs
 * its loading state, then the success toast (components/ui/toast.tsx) drops
 * in above, as it does when a change saves; the toggles switch.
 */
export function ButtonsPrimitive() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(false);
  const [first, setFirst] = useState(true);
  const [second, setSecond] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const run = () => {
    if (loading) return;
    setLoading(true);
    timers.current.push(
      setTimeout(() => {
        setLoading(false);
        setToast(true);
        timers.current.push(setTimeout(() => setToast(false), 3000));
      }, 1600),
    );
  };

  return (
    <FitStage className="anyday-app" gutter={36} inset={38}>
      <div className="flex flex-col gap-3">
        {/* The toast's slot, held open so the buttons never move. */}
        <div className="relative mb-3 flex h-10 items-center justify-center">
          <AnimatePresence>
            {toast && (
              <m.div
                key="toast"
                initial={{ opacity: 0, y: -24, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -24, filter: "blur(8px)" }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  bounce: 0.3,
                }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                role="status"
              >
                <div className="toast-container text-spec-17 flex items-center gap-2 rounded-[100px] py-2 pr-4 pl-3 font-medium backdrop-blur-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    className="flex-shrink-0"
                    height={20}
                    src={CHECK}
                    width={20}
                  />
                  <span>Changes saved</span>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
        <PrimaryButton className="w-full" isLoading={loading} onClick={run}>
          Continue
        </PrimaryButton>

        <m.button
          type="button"
          className="secondary-button text-spec-17 flex h-[3.125rem] w-full cursor-pointer items-center justify-center font-semibold"
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0 }}
        >
          Reset
        </m.button>
        <div className="mt-3 flex items-center justify-center gap-3">
          <ToggleSwitch
            checked={first}
            label="Example setting"
            onChange={setFirst}
          />
          <ToggleSwitch
            checked={second}
            label="Another example setting"
            onChange={setSecond}
          />
        </div>
      </div>
    </FitStage>
  );
}
