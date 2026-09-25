import json
import uuid
import datetime
from pathlib import Path

from .hashing import compute_sha256


def seal_evidence(raw_path: str, sealed_path: str):
    with open(raw_path, "r") as f:
        raw_bundles = json.load(f)

    manifest = {
        "manifest_id": str(uuid.uuid4()),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "sealed_artifacts": [],
    }

    for bundle in raw_bundles:
        evidence_type = bundle.get("canonical_type", "unknown")
        data = bundle.get("data", [])

        # A provider may return either:
        #   - a list of individual evidence items
        #   - a dictionary containing structured evidence
        #
        # Normalize both forms into a list so dictionaries are not
        # accidentally iterated over their keys.
        if isinstance(data, list):
            items = data
        else:
            items = [data]

        for item in items:
            artifact_hash = compute_sha256(item)

            sealed_artifact = {
                "evidence_id": str(uuid.uuid4()),
                "type": evidence_type.replace("evidence_", ""),
                "provider": "linux",
                "data": item,
                "sha256": artifact_hash,
            }

            manifest["sealed_artifacts"].append(sealed_artifact)

    out_file = Path(sealed_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)

    with open(out_file, "w") as f:
        json.dump(manifest, f, indent=2)

    print(
        f"Evidence sealed successfully: "
        f"{len(manifest['sealed_artifacts'])} artifacts cryptographically anchored."
    )


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        print("Usage: python -m evidence.sealing <raw_json> <sealed_json>")
        sys.exit(1)

    seal_evidence(sys.argv[1], sys.argv[2])