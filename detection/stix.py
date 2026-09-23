import uuid
import datetime

def generate_stix_bundle(findings: list) -> dict:
    objects = []
    for finding in findings:
        objects.append({
            "type": "indicator",
            "spec_version": "2.1",
            "id": f"indicator--{uuid.uuid4()}",
            "created": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "name": finding["rule"],
            "description": f"Detected suspicious artifact: {finding['artifact']['evidence_id']}",
            "pattern_type": "jocky-canonical",
            "pattern": str(finding["artifact"]["data"])
        })
        
    return {
        "type": "bundle",
        "id": f"bundle--{uuid.uuid4()}",
        "objects": objects
    }