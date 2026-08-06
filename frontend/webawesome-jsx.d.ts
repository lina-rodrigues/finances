import type { DetailedHTMLProps, HTMLAttributes } from "react";

type WaProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> &
  Record<string, unknown>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "wa-page": WaProps;
      "wa-button": WaProps;
      "wa-icon": WaProps;
      "wa-input": WaProps;
      "wa-textarea": WaProps;
      "wa-select": WaProps;
      "wa-option": WaProps;
      "wa-card": WaProps;
      "wa-badge": WaProps;
      "wa-divider": WaProps;
      "wa-spinner": WaProps;
      "wa-toast": WaProps;
      "wa-callout": WaProps;
      "wa-dialog": WaProps;
      "wa-details": WaProps;
      "wa-progress-bar": WaProps;
      "wa-dropdown": WaProps;
      "wa-dropdown-item": WaProps;
      "wa-combobox": WaProps;
      "wa-checkbox": WaProps;
      "wa-switch": WaProps;
      "wa-tooltip": WaProps;
      "wa-tag": WaProps;
      "wa-scroller": WaProps;
    }
  }
}

export {};
