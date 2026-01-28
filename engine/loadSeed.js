import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BASE_SEED_SQL = fs.readFileSync(
  path.join(__dirname, "seed.sql"),
  "utf8"
);
