/**
 * Copy Web Awesome Pro dist-cdn into public/webawesome for static serving.
 * A symlink breaks Vercel's static collect step (ENOENT on mkdir).
 */
import { cpSync, existsSync, lstatSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(
  frontendRoot,
  "node_modules/@web.awesome.me/webawesome-pro/dist-cdn",
);
const target = join(frontendRoot, "public/webawesome");

if (!existsSync(source)) {
  console.error(
    "sync-webawesome: missing package dist-cdn at",
    source,
    "(run pnpm install first)",
  );
  process.exit(1);
}

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
}

cpSync(source, target, { recursive: true });
console.log("sync-webawesome: copied dist-cdn → public/webawesome");
