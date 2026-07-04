declare module "geoip-lite" {
  export interface GeoLookup {
    country: string;
    region: string;
    city: string;
    ll: [number, number];
  }

  export function lookup(ip: string): GeoLookup | null;
}
