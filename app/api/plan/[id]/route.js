import { NextResponse } from "next/server";
import { getPlanById } from "../../../lib/planStore";

export async function GET(_request, { params }) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const record = await getPlanById(id);
    if (!record) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Failed to load plan" }, { status: 500 });
  }
}
