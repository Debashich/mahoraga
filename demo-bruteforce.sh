#!/usr/bin/env bash
set -euo pipefail

PYTHON="./.venv/bin/python"
IR="out/instructions/brute_force_hunt.json"
RAW="/tmp/mahoraga-demo-evidence.json"
SEALED="/tmp/mahoraga-demo-sealed.json"
STIX="/tmp/mahoraga-demo-stix.json"
GRAPH=".dev/graphs/brute_force_hunt_demo_results.png"

mkdir -p .dev/graphs

"$PYTHON" - <<'PY'
import json
from pathlib import Path

logs = [
    {
        "raw": f"sshd: Failed password for testuser from 192.0.2.{i} port 2222 ssh2",
        "source": "/tmp/synthetic-auth.log",
    }
    for i in range(1, 6)
]

Path("/tmp/mahoraga-demo-evidence.json").write_text(json.dumps([
    {"canonical_type": "evidence_auth_logs", "data": {"logs": logs}}
], indent=2))
print("Created simulated SSH brute-force scenario: 5 failed logins.")
PY

"$PYTHON" -m evidence.sealing "$RAW" "$SEALED"
"$PYTHON" -m detection.engine "$IR" "$SEALED" "$STIX"
"$PYTHON" -m compiler.visualizer.results "$SEALED" "$STIX" "$GRAPH"

echo "Demo graph: $GRAPH"
