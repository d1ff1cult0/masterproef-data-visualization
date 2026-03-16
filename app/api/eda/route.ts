import { NextResponse } from "next/server";
import { computeEDA } from "@/lib/eda";

export async function GET() {
  try {
    const result = computeEDA();
    return NextResponse.json(result);
  } catch (error) {
    console.error("EDA computation error:", error);
    return NextResponse.json(
      { error: "Failed to compute EDA. Ensure DATASET_PATH is set correctly." },
      { status: 500 }
    );
  }
}
