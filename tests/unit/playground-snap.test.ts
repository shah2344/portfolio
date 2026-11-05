import { describe, expect, it } from "bun:test";
import { nearestToCentre } from "../../src/components/home/playground/snap";

/** A card spanning `height` px with its middle at `centre`. */
const card = (name: string, centre: number, height: number) => ({
  tile: name,
  top: centre - height / 2,
  bottom: centre + height / 2,
});

describe("the card the scroll puts in front", () => {
  it("hands over at the point two cards are equally far from centre", () => {
    // Middles 200px apart, so the handover sits 100px along: a centre line
    // before the midpoint still belongs to the card above it.
    const pair = [card("leaving", 300, 280), card("arriving", 500, 480)];
    expect(nearestToCentre(pair, 399)).toBe("leaving");
    expect(nearestToCentre(pair, 401)).toBe("arriving");
  });

  it("takes the only card on screen however far off centre it sits", () => {
    expect(nearestToCentre([card("lone", 120, 280)], 422)).toBe("lone");
  });

  it("holds the first of an exact tie rather than trading between them", () => {
    const tie = [card("above", 322, 280), card("below", 522, 280)];
    expect(nearestToCentre(tie, 422)).toBe("above");
  });

  it("reports nothing when the screen is empty, so the caller can hold", () => {
    expect(nearestToCentre([], 422)).toBeNull();
  });
});
