import { readFileSync } from "node:fs";

const config = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const databaseId = config.match(/"database_id"\s*:\s*"([^"]*)"/)?.[1];

if (!databaseId || /^0+$/.test(databaseId.replaceAll("-", ""))) {
  console.error(
    "Deploy dibatalkan: database_id D1 masih kosong atau placeholder. Jalankan npm run db:create terlebih dahulu."
  );
  process.exitCode = 1;
} else {
  console.log("Konfigurasi D1 ditemukan.");
  console.log(
    "Pastikan SESSION_SECRET dan REGISTRATION_SECRET sudah disetel sebagai Worker secrets di Cloudflare."
  );
}
