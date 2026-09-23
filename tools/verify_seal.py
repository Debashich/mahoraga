import json
import sys
from pathlib import Path

# Append project root to sys.path to resolve root-level packages
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from evidence.hashing import compute_sha256

def verify_manifest(sealed_path: str):
    with open(sealed_path, 'r') as f:
        manifest = json.load(f)

    print(f"Verifying Manifest: {manifest['manifest_id']}")
    print(f"Timestamp: {manifest['timestamp']}")
    print("-" * 40)

    failures = 0
    for artifact in manifest.get("sealed_artifacts", []):
        computed_hash = compute_sha256(artifact["data"])
        stored_hash = artifact["sha256"]
        
        if computed_hash != stored_hash:
            print(f"INTEGRITY FAILURE on Evidence ID: {artifact['evidence_id']}")
            print(f"Expected: {stored_hash}")
            print(f"Computed: {computed_hash}")
            failures += 1

    if failures > 0:
        print("-" * 40)
        print(f"VERIFICATION FAILED: {failures} HASH MISMATCH(ES) DETECTED.")
        sys.exit(1)
    else:
        print("-" * 40)
        print("INTEGRITY VERIFIED: All evidence hashes match their data payloads.")
        sys.exit(0)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python tools/verify_seal.py <sealed_json>")
        sys.exit(1)
    verify_manifest(sys.argv[1])