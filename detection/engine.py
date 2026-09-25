import json
import sys
import uuid
from datetime import datetime, timezone

def generate_stix_indicator(name, description):
    return {
        "type": "indicator",
        "id": f"indicator--{uuid.uuid4()}",
        "created": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "name": name,
        "description": description,
        "pattern_type": "mahoraga-rule",
        "valid_from": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    }

def run_detection(ir_path, evidence_path, output_stix_path):
    # Load IR and Evidence
    with open(ir_path, 'r') as f:
        ir_data = json.load(f)
    with open(evidence_path, 'r') as f:
        evidence = json.load(f)

    if isinstance(ir_data, dict):
        instructions = ir_data.get("instructions", [])
    elif isinstance(ir_data, list):
        instructions = ir_data
    else:
        instructions = []

    findings = []
    artifacts = evidence if isinstance(evidence, list) else evidence.get("artifacts", evidence.get("sealed_artifacts", []))

    # Evaluate detect blocks from the IR
    for inst in instructions:
        if not isinstance(inst, dict):
            continue
        op_type = inst.get("type") or inst.get("op")
        if op_type == "detect" and inst.get("rule") == "brute_force":
            threshold = int(inst.get("params", {}).get("threshold", 5))
            
            failed_attempts = 0
            markers = (
                "authentication failure",
                "failed password",
                "authentication failed",
                "failed login",
                "invalid user",
            )
            
            # Scan evidence properly through the logs array
            for artifact in artifacts:
                if artifact.get("type") == "auth_logs":
                    logs = artifact.get("data", {}).get("logs", [])
                    for entry in logs:
                        raw = entry.get("raw", "").lower()
                        if any(m in raw for m in markers):
                            failed_attempts += 1
            
            # Trigger finding if threshold met or exceeded
            if failed_attempts >= threshold:
                findings.append(
                    generate_stix_indicator(
                        "SSH Brute Force Detected", 
                        f"Detected {failed_attempts} failed login attempts (Threshold: {threshold})"
                    )
                )

    # Generate STIX Bundle
    stix_bundle = {
        "type": "bundle",
        "id": f"bundle--{uuid.uuid4()}",
        "objects": findings + artifacts
    }

    with open(output_stix_path, 'w') as f:
        json.dump(stix_bundle, f, indent=4)
        
    print(f"Detection Engine Complete: {len(findings)} findings.")

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        run_detection(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print("Usage: python -m detection.engine <ir.json> <sealed_evidence.json> <out_stix.json>")