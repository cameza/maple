import { NextResponse } from "next/server";
import { getLatestPlanByClientId } from "../../../lib/planStore";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const record = await getLatestPlanByClientId(clientId);
    if (!record) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Failed to load latest plan" }, { status: 500 });
  }
}
