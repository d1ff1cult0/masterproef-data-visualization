import { NextRequest, NextResponse } from "next/server";
import { getBestModels } from "@/lib/results";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const n = Math.min(10, Math.max(1, parseInt(searchParams.get("n") || "5", 10) || 5));

  try {
    const models = getBestModels(n);
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get best models: ${error}` },
      { status: 500 }
    );
  }
}
