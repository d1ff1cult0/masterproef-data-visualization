import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

function firstExistingPath(candidates: string[]): string {
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

const home = process.env.HOME || "";
const resultsDir =
  process.env.RESULTS_DIR ||
  firstExistingPath([
    path.resolve(process.cwd(), "../results"),
    path.resolve(process.cwd(), "../../masterproef_new/results"),
    home ? path.join(home, "masterproef_new/results") : "",
  ].filter(Boolean));

const datasetPath =
  process.env.DATASET_PATH ||
  firstExistingPath([
    path.resolve(process.cwd(), "../data/datasets/BE_ENTSOE.csv"),
    path.resolve(process.cwd(), "../../masterproef_new/data/datasets/BE_ENTSOE.csv"),
    home ? path.join(home, "masterproef_new/data/datasets/BE_ENTSOE.csv") : "",
  ].filter(Boolean));

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["adm-zip"],
  env: {
    RESULTS_DIR: resultsDir,
    DATASET_PATH: datasetPath,
  },
};

export default nextConfig;
