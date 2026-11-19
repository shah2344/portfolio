"use client";

import NumberFlow from "@number-flow/react";
import {
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { SmoothSurface } from "@/components/ui/smooth-surface";

import { FitScaleContext } from "../fit-stage";
import { Button } from "./ui/button";

/*
 * components/features/bulk-payout/bulk-payout-toolbar.tsx. In the product it
 * is a full-width bar fixed to the window's foot. Here it is a squircle inset
 * 8px into its card, its corners concentric with the card's (the card's radius
 * less the inset), and its content lines up with the table's text above:
 * the total with the member names, the buttons with the amount fields.
 */

/** The card's edge to the footer, in screen pixels. */
const INSET = 8;
/** The page's side padding plus the table cell's, on each side, in the
 *  page's own pixels: where the names start and the amount fields end. */
const TEXT_LEFT = 24 + 16;
const TEXT_RIGHT = 24 + 24;

interface BulkPayoutToolbarProps {
  totalAmount: number;
  onReviewPayout: () => void;
  onBack: () => void;
  buttonText?: string;
  isContinueDisabled?: boolean;
  hideTotalPayment?: boolean;
}

export function BulkPayoutToolbar({
  totalAmount,
  onReviewPayout,
  onBack,
  buttonText = "Review payment",
  isContinueDisabled = false,
  hideTotalPayment = false,
}: BulkPayoutToolbarProps) {
  const scale = useContext(FitScaleContext);
  const frame = useRef<HTMLDivElement>(null);
  const [cardRadius, setCardRadius] = useState(16);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const radius = parseFloat(
      getComputedStyle(element).getPropertyValue("--home-tile-radius"),
    );
    if (radius) setCardRadius(radius);
  }, []);

  // Screen pixels become the page's own by dividing by the stage's scale.
  const inset = INSET / scale;

  return (
    <div ref={frame} style={{ padding: `0 ${inset}px ${inset}px` }}>
      <SmoothSurface
        as="div"
        className="relative mx-auto flex h-[88px] items-center bg-[rgba(255,255,255,0.88)] backdrop-blur"
        style={
          {
            "--lisse-radius": `${Math.max(0, cardRadius - INSET)}px`,
            "--pg-edge-scale": scale,
            borderRadius: `${Math.max(0, cardRadius - INSET) / scale}px`,
            paddingLeft: `${TEXT_LEFT - inset}px`,
            paddingRight: `${TEXT_RIGHT - inset}px`,
          } as CSSProperties
        }
      >
        <div
          className={`flex w-full flex-row items-center ${hideTotalPayment ? "justify-end" : "justify-between"}`}
        >
          {!hideTotalPayment && (
            <div className="relative flex shrink-0 items-start gap-1.5">
              <div className="flex flex-1 flex-col items-start gap-0">
                <div className="text-medium-heavy text-black">
                  <NumberFlow
                    prefix="$"
                    value={totalAmount}
                    format={{
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }}
                    className="text-medium-heavy text-black tabular-nums"
                  />
                </div>
                <div className="text-small-default text-[#8f8f8f]">
                  Total payment
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="regular" onClick={onBack}>
              Back
            </Button>

            <Button
              variant="primary"
              size="regular"
              onClick={onReviewPayout}
              disabled={isContinueDisabled}
              rightIcon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              }
            >
              {buttonText}
            </Button>
          </div>
        </div>
      </SmoothSurface>
    </div>
  );
}
