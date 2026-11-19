"use client";

import { FitStage } from "../../fit-stage";
import { MemberStatusBadge, PayoutStatusBadge } from "../ui/status-badges";

/* Every state of the portal's badges, tags and status badges. */

function Badges() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <MemberStatusBadge status="active" />
        <MemberStatusBadge status="invited" />
        <MemberStatusBadge status="inactive" />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <PayoutStatusBadge status="paid" />
        <PayoutStatusBadge status="processing" />
        <PayoutStatusBadge status="failed" />
      </div>
    </div>
  );
}

export function PortalBadges() {
  return (
    <FitStage inset={58} gutter={32} className="anyday-portal">
      <Badges />
    </FitStage>
  );
}
