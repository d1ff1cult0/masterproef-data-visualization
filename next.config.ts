import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["adm-zip"],
  env: {
    RESULTS_DIR: process.env.RESULTS_DIR || path.resolve(process.cwd(), "../results"),
    DATASET_PATH: process.env.DATASET_PATH || path.resolve(process.cwd(), "../data/datasets/BE_ENTSOE.csv"),
  },
};

export default nextConfig;
