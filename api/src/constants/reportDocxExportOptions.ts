import type { Options } from "@mohtasham/md-to-docx";

const BLACK = "000000";
const WHITE = "FFFFFF";

const plainCalloutStyle = {
  borderColor: BLACK,
  backgroundColor: WHITE,
  titleColor: BLACK,
} as const;

/** Black-on-white DOCX export tuned for A4 portrait with fixed table layout. */
export const REPORT_DOCX_EXPORT_OPTIONS: Options = {
  style: {
    fontFamily: "Calibri",
    paragraphSize: 22,
    titleSize: 32,
    lineSpacing: 1.15,
    paragraphSpacing: 200,
    headingSpacing: 240,
    inlineCodeColor: BLACK,
    inlineCodeBackground: WHITE,
    tableLayout: "fixed",
    calloutStyles: {
      note: plainCalloutStyle,
      tip: plainCalloutStyle,
      important: plainCalloutStyle,
      warning: plainCalloutStyle,
      caution: plainCalloutStyle,
    },
  },
  template: {
    page: {
      size: {
        width: 11906,
        height: 16838,
        orientation: "PORTRAIT",
      },
      margin: {
        top: 1440,
        right: 1440,
        bottom: 1440,
        left: 1440,
      },
    },
  },
  codeHighlighting: {
    enabled: true,
    showLanguageLabel: false,
    theme: {
      default: BLACK,
      background: WHITE,
      border: BLACK,
      languageLabel: BLACK,
    },
  },
};
