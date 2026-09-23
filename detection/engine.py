import json
import sys
from .rules import ACTIVE_RULES
from .stix import generate_stix_bundle

def run_detection(sealed_path: str):
    with open(sealed_path, 'r') as f:
        manifest = json.load(f)

    findings = []
    for artifact in manifest.get("sealed_artifacts", []):
        for rule_name, rule_func in ACTIVE_RULES.items():
            if rule_func(artifact):
                findings.append({
                    "rule": rule_name,
                    "artifact": artifact
                })

    print(f"Detection Engine Complete: {len(findings)} findings.")
    if findings:
        stix_bundle = generate_stix_bundle(findings)
        with open("out/evidence/report_stix.json", "w") as f:
            json.dump(stix_bundle, f, indent=2)
        print("STIX 2.1 Report generated at: out/evidence/report_stix.json")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m detection.engine <sealed_json>")
        sys.exit(1)
    run_detection(sys.argv[1])