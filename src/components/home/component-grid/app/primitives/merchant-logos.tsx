"use client";

import { useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";

import { FitStage } from "../../fit-stage";
import { useAutoplay } from "../../use-autoplay";
import "../app-product.css";

const BASE = "/media/craft/components/app/merchants";

type Category = "food-drink" | "transportation" | "shopping" | "grocery";

const CATEGORY_NAMES: Record<Category, string> = {
  "food-drink": "Food and drink",
  transportation: "Transportation",
  shopping: "Shopping",
  grocery: "Groceries",
};

/* Ordered so the category row never holds still for two purchases running. */
const MERCHANTS: readonly {
  file: string;
  name: string;
  category: Category;
}[] = [
  { file: "starbucks", name: "Starbucks", category: "food-drink" },
  { file: "uber", name: "Uber", category: "transportation" },
  { file: "doordash", name: "DoorDash", category: "food-drink" },
  { file: "amazon", name: "Amazon", category: "shopping" },
  { file: "lyft", name: "Lyft", category: "transportation" },
  { file: "walmart", name: "Walmart", category: "grocery" },
  { file: "target", name: "Target", category: "shopping" },
  { file: "mcdonalds", name: "McDonald's", category: "food-drink" },
];

const MERCHANTS_VISIBLE = 5;
const CATEGORIES_VISIBLE = 3;
const OVERLAP = 8;
// The category row answers the merchant row a beat later.
const FOLLOW = 0.12;
// No bounce: a newcomer scales up out of a blur at the left, the others
// slide over to make room, and the last one scales down into a blur as it
// drifts off to the right, a little quicker than the entrance.
const ENTER = { type: "spring", duration: 0.45, bounce: 0 } as const;
const LEAVE = { duration: 0.22, ease: "easeOut" } as const;

const merchantAt = (step: number) =>
  MERCHANTS[((step % MERCHANTS.length) + MERCHANTS.length) % MERCHANTS.length]!;

/**
 * The category row at `head`: each purchase files its category in at the
 * left, unless that category is already showing, in which case the row holds
 * still. So it never shows one twice, and only moves when something new is
 * spent on. Replayed from the start, so server and browser agree.
 */
function categoriesAt(head: number) {
  let row: { key: number; category: Category }[] = [];
  for (let step = 0; step <= head; step++) {
    const { category } = merchantAt(step);
    if (row.some((slot) => slot.category === category)) continue;
    row = [{ key: step, category }, ...row].slice(0, CATEGORIES_VISIBLE);
  }
  return row;
}

type Slot = { key: number; src: string; name: string };

/**
 * A short stack of avatars, tight and overlapping and ringed in the card's
 * grey, the newest on the left and on top.
 */
function Stack({
  slots,
  label,
  size,
  delay = 0,
}: {
  slots: Slot[];
  label: string;
  size: number;
  delay?: number;
}) {
  return (
    <ul
      aria-label={label}
      className="relative isolate m-0 flex list-none items-center p-0"
      style={{ height: size }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {slots.map(({ key, src, name }, offset) => (
          <m.li
            key={key}
            layout="position"
            initial={{ opacity: 0, scale: 0.6, x: -12, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
            exit={{
              opacity: 0,
              scale: 0.6,
              x: 12,
              filter: "blur(6px)",
              transition: { ...LEAVE, delay },
            }}
            transition={{ ...ENTER, delay }}
            className="relative shrink-0 rounded-full"
            style={{
              marginLeft: offset === 0 ? 0 : -OVERLAP,
              boxShadow: "0 0 0 3px #f3f3f3",
              zIndex: key,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={name}
              className="block rounded-full"
              height={size}
              src={src}
              style={{
                outline: "1px solid rgba(0, 0, 0, 0.06)",
                outlineOffset: -1,
              }}
              width={size}
            />
          </m.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/**
 * The transaction avatars (components/ui/avatar.tsx, `type="merchant"`): a
 * stack of the product's merchant logos that keeps bringing on new ones, and
 * below it the categories those purchases are filed under. A beat after a
 * merchant arrives, its category arrives below in the same way, unless it's
 * already there.
 */
export function MerchantLogosPrimitive() {
  const [head, setHead] = useState(MERCHANTS_VISIBLE - 1);
  const root = useRef<HTMLDivElement>(null);

  useAutoplay(root, () => setHead((step) => step + 1), { interval: 2000 });

  const merchants: Slot[] = Array.from(
    { length: MERCHANTS_VISIBLE },
    (_, offset) => {
      const step = head - offset;
      const { file, name } = merchantAt(step);
      return { key: step, src: `${BASE}/${file}.svg`, name };
    },
  );

  const categories: Slot[] = categoriesAt(head).map(({ key, category }) => ({
    key,
    src: `${BASE}/categories/${category}.svg`,
    name: CATEGORY_NAMES[category],
  }));

  return (
    <FitStage className="anyday-app" gutter={40} inset={32}>
      <div className="flex flex-col items-center gap-5" ref={root}>
        <Stack label="Merchant logos" size={56} slots={merchants} />
        <Stack delay={FOLLOW} label="Categories" size={48} slots={categories} />
      </div>
    </FitStage>
  );
}
