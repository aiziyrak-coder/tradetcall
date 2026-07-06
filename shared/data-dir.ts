import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Barcha server ma'lumotlari — bitta papka */
export function getDataDir(): string {
  return (
    process.env.TRADE_DATA_DIR?.trim() ||
    process.env.DATA_DIR?.trim() ||
    path.join(root, "data")
  );
}
