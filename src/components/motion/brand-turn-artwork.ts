const SVG_NS = "http://www.w3.org/2000/svg";
const paint = [
  "color",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "fill-rule",
  "clip-rule",
  "fill-opacity",
  "stroke-opacity",
  "display",
  "opacity",
  // The filled face only overflows its 44px box under its treatment root.
  "overflow",
];

/** Keep the rendered material when a snapshot leaves its theme/treatment ancestors. */
export function copyBrandArtwork(
  content: HTMLElement,
  suffix: string,
  readStyle = (element: Element) => window.getComputedStyle(element),
) {
  const copy = content.cloneNode(true) as HTMLElement;
  copy.inert = true;
  copy.setAttribute("aria-hidden", "true");
  const originals = [content, ...content.querySelectorAll("*")];
  const nodes = [copy, ...copy.querySelectorAll("*")];
  const ids = nodes.filter((node) => node.id).map((node) => node.id);
  nodes.forEach((node, index) => {
    const original = originals[index]!;
    if (original.namespaceURI === SVG_NS || index === 0) {
      const computed = readStyle(original);
      const styled = node as HTMLElement | SVGElement;
      for (const property of original.namespaceURI === SVG_NS
        ? paint
        : ["color"]) {
        styled.style.setProperty(property, computed.getPropertyValue(property));
      }
    }
    for (const attribute of Array.from(node.attributes)) {
      let value = attribute.value;
      if (attribute.name === "id") value += suffix;
      else
        for (const id of ids) {
          // Computed paints copied into inline styles serialise as url("#id").
          for (const quote of ["", '"', "'"])
            value = value.replaceAll(
              `url(${quote}#${id}${quote})`,
              `url(${quote}#${id}${suffix}${quote})`,
            );
          if (value === `#${id}`) value = `#${id}${suffix}`;
        }
      if (value !== attribute.value) node.setAttribute(attribute.name, value);
    }
  });
  return copy;
}
