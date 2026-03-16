import { NextResponse } from "next/server";
import { getPriceTimeline } from "@/lib/eda";

export async function GET() {
  try {
    const series = getPriceTimeline();
    return NextResponse.json({ series });
  } catch (error) {
    console.error("Price timeline error:", error);
    return NextResponse.json(
      { error: "Failed to load price timeline. Ensure DATASET_PATH is set correctly." },
      { status: 500 }
    );
  }
}
