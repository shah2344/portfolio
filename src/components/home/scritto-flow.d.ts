import type { DetailedHTMLProps, HTMLAttributes } from "react";

// `@scritto/react` types only the rolling text, not the flow around it.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "scritto-flow": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
