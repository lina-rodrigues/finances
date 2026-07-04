import geoip from "geoip-lite";
import type { Request } from "express";
import { BRAZIL_TIMEZONES } from "../constants/brazilTimezones.js";

export interface LocaleHints {
  timezone?: string;
  language?: string;
}

function countryFromHints(hints?: LocaleHints): string | null {
  if (!hints) {
    return null;
  }

  const lang = hints.language?.toLowerCase() ?? "";
  if (lang.startsWith("pt-br") || lang === "pt_br") {
    return "BR";
  }

  if (hints.timezone && BRAZIL_TIMEZONES.has(hints.timezone)) {
    return "BR";
  }

  return null;
}

function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(",")[0]?.trim();
  }
  return req.ip;
}

function countryFromIp(req: Request): string | null {
  const ip = getClientIp(req);
  if (!ip) {
    return null;
  }

  const lookup = geoip.lookup(ip);
  return lookup?.country ?? null;
}

export function resolveCountry(req: Request, hints?: LocaleHints): string {
  return countryFromIp(req) ?? countryFromHints(hints) ?? "US";
}

export function resolveSignupPreferences(country: string): {
  language: "en" | "pt";
  currency: string;
} {
  if (country === "BR") {
    return { language: "pt", currency: "BRL" };
  }
  return { language: "en", currency: "USD" };
}
