import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const sourceDir = path.join(root, "Stitch_Designs");
const targetDir = path.join(root, "public", "prototype");

async function copyPrototypeFiles() {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const from = path.join(sourceDir, entry.name);
        const to = path.join(targetDir, entry.name);
        await fs.copyFile(from, to);
      })
  );

  console.log(`Synced ${entries.length} prototype assets to public/prototype`);
}

copyPrototypeFiles().catch((error) => {
  console.error("Failed to sync prototype files", error);
  process.exit(1);
});
