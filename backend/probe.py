"""Print strong v783 links for a reproducible engineering probe design."""
import json
import sys

import numpy as np
import pandas as pd
from pathlib import Path

COLS = ["Presynaptic_Index", "Postsynaptic_Index", "Excitatory x Connectivity"]


def suggest(folder: Path):
    roots = pd.read_csv(folder/"Completeness_783.csv", index_col=0).index.to_numpy()
    data = pd.read_parquet(folder/"Connectivity_783.parquet", columns=COLS)
    edges = data[data[COLS[2]].between(160, 230)]
    edges = edges.sort_values(COLS[2], ascending=False, kind="stable")
    panels, used = [], set()
    for source, links in edges.groupby(COLS[0], sort=False):
        targets = [int(i) for i in links[COLS[1]] if i != source and i not in used]
        if len(targets) < 6 or source in used:
            continue
        targets = targets[:6]
        used.update([source, *targets])
        panels.append({"input": str(roots[source]), "readout": [str(roots[i]) for i in targets],
                       "direct_weights": [int(links.loc[links[COLS[1]] == i, COLS[2]].iloc[0]) for i in targets]})
        if len(panels) == 3:
            return panels
    raise RuntimeError("Unable to find three disjoint panels")


if __name__ == "__main__":
    print(json.dumps(suggest(Path(sys.argv[1] if len(sys.argv) > 1 else "upstream")), indent=2))
