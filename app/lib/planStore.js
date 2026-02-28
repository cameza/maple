import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(STORE_DIR, "plan-store.json");

async function ensureStore() {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(STORE_FILE, JSON.stringify({ plans: [] }, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(STORE_FILE, "utf8");
  const parsed = JSON.parse(raw || "{}");
  return Array.isArray(parsed.plans) ? parsed : { plans: [] };
}

async function writeStore(store) {
  await ensureStore();
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function savePlanRecord({ clientId, intakeData, planData }) {
  const store = await readStore();
  const id = crypto.randomUUID();
  const record = {
    id,
    clientId: clientId || null,
    createdAt: new Date().toISOString(),
    intakeData: intakeData || {},
    planData: planData || {},
  };

  store.plans.unshift(record);
  store.plans = store.plans.slice(0, 200);
  await writeStore(store);

  return record;
}

export async function getPlanById(id) {
  const store = await readStore();
  return store.plans.find((plan) => plan.id === id) || null;
}

export async function getLatestPlanByClientId(clientId) {
  if (!clientId) return null;
  const store = await readStore();
  return store.plans.find((plan) => plan.clientId === clientId) || null;
}
