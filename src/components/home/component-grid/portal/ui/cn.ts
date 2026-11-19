import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** lib/utils.ts `cn`, verbatim. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Where the product's pages reference its `/icons/*` files, a copy lives here. */
export const ICON_BASE = "/media/craft/components/portal/icons";
