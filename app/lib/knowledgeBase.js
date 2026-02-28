import fs from "fs/promises";
import path from "path";

let cachedKnowledgeBase = null;

export async function getKnowledgeBase() {
  if (cachedKnowledgeBase) {
    return cachedKnowledgeBase;
  }

  const filePath = path.join(process.cwd(), "KnowledgeBase.md");
  try {
    cachedKnowledgeBase = await fs.readFile(filePath, "utf8");
  } catch {
    cachedKnowledgeBase = "";
  }

  return cachedKnowledgeBase;
}
