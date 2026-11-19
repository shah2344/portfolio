import { ComponentGrid, GridCell } from "../component-grid";
import { PortalControls } from "./controls";
import { PortalAmountField } from "./amount-field";
import { PortalMemberSearch } from "./member-search";
import { PortalPayoutLifecycle } from "./payout-lifecycle";
import { PortalWalletBalance } from "./wallet-card";
import "./portal-product.css";

/**
 * A restaurant paying its staff, in two columns. On the left, the pieces
 * a payment rests on: the wallet that funds it, the portal's controls and
 * statuses, and the member search, which types to itself. On the right, the
 * two parts with the most behaviour, taken apart as specs: a payout's
 * status lifecycle and the amount field's states and formatting rules. The cards are
 * wider, so their components sit on a 560pt screen and keep one scale with
 * the three-column grids.
 */
export function PortalComponentGrid() {
  return (
    <ComponentGrid
      columns={2}
      rows="minmax(0, 279fr) minmax(0, 207fr) minmax(0, 279fr)"
    >
      <GridCell column="1" label="Wallet balance card" row="1">
        <PortalWalletBalance />
      </GridCell>
      <GridCell
        column="1"
        label="Portal tabs, buttons and status badges"
        row="2"
      >
        <PortalControls />
      </GridCell>
      <GridCell
        column="1"
        label="Member search with highlighted matches"
        row="3"
      >
        <PortalMemberSearch />
      </GridCell>

      <GridCell
        column="2"
        label="Payout status lifecycle, with the events that drive it"
        lead
        row="1 / span 2"
      >
        <PortalPayoutLifecycle />
      </GridCell>
      <GridCell
        column="2"
        label="Amount input states and formatting rules"
        row="3"
      >
        <PortalAmountField />
      </GridCell>
    </ComponentGrid>
  );
}
