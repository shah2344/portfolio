"use client";

import { FitStage } from "../../fit-stage";
import { Button } from "../ui/button";

/*
 * components/ui/button.tsx: the product's primary, secondary and destructive
 * buttons at its large size, with the copy they carry in the portal.
 */

function ButtonStack() {
  return (
    <div className="flex flex-col items-stretch gap-3">
      <Button variant="primary" size="large">
        Continue
      </Button>
      <Button variant="secondary" size="large">
        Back
      </Button>
      <Button variant="destructive" size="large">
        Remove member
      </Button>
    </div>
  );
}

export function PortalButtons() {
  return (
    <FitStage inset={68} gutter={40} className="anyday-portal">
      <ButtonStack />
    </FitStage>
  );
}
