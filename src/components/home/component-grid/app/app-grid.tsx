import { ComponentGrid, GridCell } from "../component-grid";

import "./app-product.css";
import { AmountPrimitive } from "./primitives/amount";
import { AvatarPickerPrimitive } from "./primitives/avatar-picker";
import { BottomNavPrimitive } from "./primitives/bottom-nav";
import { MerchantLogosPrimitive } from "./primitives/merchant-logos";
import { RowConfigsPrimitive } from "./primitives/row-configs";
import { SlideToSendPrimitive } from "./primitives/slide-to-send";

/**
 * A wallet for people paid in tips: the balance and the person on the
 * left, sending money and the tab bar in the middle, the list row's variants
 * and where the money went on the right. Every piece is laid out on the same
 * 375pt phone screen, so all of them share one scale, and the quiet ones play
 * on their own.
 */
export function AppComponentGrid() {
  return (
    <ComponentGrid bleed>
      <GridCell column="1" label="AnyDay wallet balance" row="1">
        <AmountPrimitive />
      </GridCell>
      <GridCell column="1" label="AnyDay avatar picker" row="2">
        <AvatarPickerPrimitive />
      </GridCell>

      <GridCell column="2" label="AnyDay slide to send" lead row="1">
        <SlideToSendPrimitive />
      </GridCell>
      <GridCell column="3" label="AnyDay list row variants" row="1">
        <RowConfigsPrimitive />
      </GridCell>
      <GridCell column="2" label="AnyDay tab bar" row="2">
        <BottomNavPrimitive />
      </GridCell>

      <GridCell column="3" label="AnyDay merchant logos" row="2">
        <MerchantLogosPrimitive />
      </GridCell>
    </ComponentGrid>
  );
}
