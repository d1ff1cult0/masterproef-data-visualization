import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/** Reads comparison_summary.csv from notebook 10 results (CRPS, Ensemble). */
export async function GET() {
  try {
    // data-visualization runs from data-visualization/; results are in project root
    const projectRoot = path.resolve(process.cwd(), "..");
    const csvPath = path.join(
      projectRoot,
      "results",
      "directions_210",
      "comparison_summary.csv"
    );

    const content = await readFile(csvPath, "utf-8");
    const lines = content.trim().split("\n");
    if (lines.length < 2) {
      return NextResponse.json({ rows: [], headers: [] });
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const rows: (string | number)[][] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: (string | number)[] = [];
      for (let j = 0; j < headers.length; j++) {
        const val = values[j];
        const num = Number(val);
        row.push(Number.isNaN(num) ? val : num);
      }
      rows.push(row);
    }

    return NextResponse.json({
      headers: ["Approach", "MAE", "PICP", "Source"],
      rows,
      caption: "Loss functions and ensemble comparison (Notebook 10).",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read summary";
    return NextResponse.json(
      { error: message, rows: [], headers: [] },
      { status: 404 }
    );
  }
}
