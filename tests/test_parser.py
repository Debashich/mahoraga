import json
import sys
from pathlib import Path

from detection.rules import ACTIVE_RULES
from detection.stix import generate_stix_bundle


def run_detection(ir_path: str, sealed_path: str):
    # Load generated IR
    with open(ir_path, "r") as f:
        ir = json.load(f)

    instructions = ir.get("instructions", [])

    # Load sealed evidence
    with open(sealed_path, "r") as f:
        manifest = json.load(f)

    artifacts = manifest.get("sealed_artifacts", [])

    findings = []

    # Execute only detection rules explicitly selected by the IR
    for instruction in instructions:
        if instruction.get("type") != "detect":
            continue

        rule_name = instruction.get("rule", "unknown")
        params = instruction.get("params", {})

        rule = ACTIVE_RULES.get(rule_name)

        if rule is None:
            print(f"[Detection] Unknown rule: {rule_name}")
            continue

        print(
            f"[Detection] Running rule: "
            f"{rule_name} | params={params}"
        )

        for artifact in artifacts:
            try:
                triggered = rule(artifact, params)
            except Exception as exc:
                print(
                    f"[Detection] Rule '{rule_name}' failed: {exc}"
                )
                continue

            if triggered:
                findings.append({
                    "rule": rule_name,
                    "params": params,
                    "artifact": artifact,
                })

    print(
        f"Detection Engine Complete: "
        f"{len(findings)} findings."
    )

    # Generate STIX only when there are findings
    if findings:
        stix_bundle = generate_stix_bundle(findings)

        output_path = Path("out/evidence/report_stix.json")
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w") as f:
            json.dump(stix_bundle, f, indent=2)

        print(
            f"STIX 2.1 Report generated at: "
            f"{output_path}"
        )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Usage: python -m detection.engine "
            "<ir.json> <sealed_evidence.json>"
        )
        sys.exit(1)

    run_detection(sys.argv[1], sys.argv[2])