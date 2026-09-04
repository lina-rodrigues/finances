export type AppPageSize = "regular" | "wide";

/** Route prefixes that use the wide content column. Add paths here as needed. */
const WIDE_PATH_PREFIXES = ["/imports"] as const;

export function resolveAppPageSize(pathname: string): AppPageSize {
  for (const prefix of WIDE_PATH_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return "wide";
    }
  }
  return "regular";
}
