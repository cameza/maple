import { NextResponse } from "next/server";
import { savePlanRecord } from "../../../lib/planStore";

export async function POST(request) {
  try {
    const body = await request.json();
    const clientId = typeof body?.clientId === "string" ? body.clientId : null;
    const intakeData = body?.intakeData && typeof body.intakeData === "object" ? body.intakeData : {};
    const planData = body?.planData && typeof body.planData === "object" ? body.planData : null;

    if (!planData) {
      return NextResponse.json({ error: "planData is required" }, { status: 400 });
    }

    const record = await savePlanRecord({ clientId, intakeData, planData });
    return NextResponse.json({ id: record.id, createdAt: record.createdAt });
  } catch {
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }
}
