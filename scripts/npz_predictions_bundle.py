#!/usr/bin/env python3
"""Mean-merge one or more predictions.npz files for the Next.js predictions API.

Float / integer arrays only (skips object arrays). All files must share the same
shape per key. Test window labelling on the TS side uses PREDICTION_CHART_TEST_START
in data-visualization/lib/results.ts — keep that date aligned if you change it.

Usage:
  python3 npz_predictions_bundle.py /path/to/run_0/predictions.npz ...
Stdout: one JSON object {"ok": true, "arrays": {...}} or {"ok": false, "error": "..."}
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np


def load_numeric_arrays(npz_path: Path) -> dict[str, np.ndarray]:
    out: dict[str, np.ndarray] = {}
    with np.load(npz_path, allow_pickle=True) as z:
        for k in z.files:
            arr = np.asarray(z[k])
            if arr.dtype == object:
                continue
            if not (
                np.issubdtype(arr.dtype, np.floating)
                or np.issubdtype(arr.dtype, np.integer)
            ):
                continue
            out[k] = np.asarray(arr, dtype=np.float64)
    return out


def main() -> None:
    paths = [Path(p) for p in sys.argv[1:] if p]
    existing = [p for p in paths if p.is_file()]
    if not existing:
        print(json.dumps({"ok": False, "error": "no_npz_files"}))
        return

    dicts = [load_numeric_arrays(p) for p in existing]
    if not dicts:
        print(json.dumps({"ok": False, "error": "empty_load"}))
        return

    keys = sorted(set.intersection(*(set(d) for d in dicts)))
    if "y_test" not in keys:
        print(json.dumps({"ok": False, "error": "missing_y_test"}))
        return

    ref_shape = dicts[0]["y_test"].shape
    compatible: list[dict[str, np.ndarray]] = []
    for d in dicts:
        if d["y_test"].shape != ref_shape:
            continue
        if not all(k in d and getattr(d[k], "shape", None) == ref_shape for k in keys):
            continue
        compatible.append(d)

    if not compatible:
        print(json.dumps({"ok": False, "error": "shape_mismatch"}))
        return

    merged: dict[str, list] = {}
    for k in keys:
        stacked = np.stack([d[k] for d in compatible], axis=0)
        merged[k] = np.mean(stacked, axis=0).tolist()

    print(json.dumps({"ok": True, "arrays": merged, "n_files": len(compatible)}))


if __name__ == "__main__":
    main()
