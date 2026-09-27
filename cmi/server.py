"""
Mahoraga CMI Backend Server
Executes the full Jocky compiler pipeline and returns rich telemetry.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import uuid
import os
import sys
import json
import hashlib
import time
from typing import List, Dict, Any, Optional

app = FastAPI(title="Mahoraga CMI - Jocky DSL Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class InvestigationRequest(BaseModel):
    jocky_source: str
    target_platform: str


@app.get("/health")
async def health_check():
    return {"status": "CONNECTED", "engine": "Mahoraga CMI"}


@app.post("/api/v1/orchestrate")
async def orchestrate_investigation(req: InvestigationRequest):
    os.makedirs("out/instructions", exist_ok=True)
    os.makedirs("out/evidence", exist_ok=True)

    inv_id = f"NTRO-Sweep-{uuid.uuid4().hex[:6].upper()}"

    jocky_file = f"out/{inv_id}.jocky"
    contract_file = f"out/instructions/{inv_id}.json"
    enc_file = f"out/instructions/{inv_id}.enc"
    raw_ev_file = "out/evidence/raw_evidence.json"
    sealed_ev_file = f"out/evidence/{inv_id}_sealed.json"
    stix_file = f"out/evidence/{inv_id}_stix.json"

    with open(jocky_file, "w") as f:
        f.write(req.jocky_source)

    py = sys.executable
    pipeline_stages = []
    
    # 1. Define the full structured pipeline graph upfront 
    # This guarantees 'truthful structured stages' even if a stage is skipped or aborted.
    stages_config = [
        {"name": "compiler", "cmd": [py, "-m", "compiler", "compile", jocky_file, "--out", contract_file]},
        {"name": "obfuscator", "cmd": [py, "-m", "compiler.obfuscator", contract_file, enc_file]},
        {"name": "runtime", "cmd": ["./build/mahoraga-run" if os.path.exists("./build/mahoraga-run") else "./build/odin-run", enc_file]},
        {"name": "sealing", "cmd": [py, "-m", "evidence.sealing", raw_ev_file, sealed_ev_file]},
        {"name": "stix", "cmd": [py, "-m", "detection.engine", contract_file, sealed_ev_file, stix_file]}
    ]
    
    failed_stage = None

    # 2. Execute pipeline sequentially and populate structural telemetry
    for stage in stages_config:
        stage_name = stage["name"]
        cmd = stage["cmd"]
        
        stage_telemetry = {
            "stage": stage_name,
            "status": "pending",
            "command": " ".join(cmd),
            "duration": 0.0,
            "output": ""
        }
        
        if failed_stage:
            stage_telemetry["status"] = "skipped"
            pipeline_stages.append(stage_telemetry)
            continue
            
        t0 = time.time()
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            elapsed = round(time.time() - t0, 3)
            stage_telemetry["status"] = "success"
            stage_telemetry["duration"] = elapsed
            stage_telemetry["output"] = result.stdout.strip()
            pipeline_stages.append(stage_telemetry)
        except subprocess.CalledProcessError as e:
            elapsed = round(time.time() - t0, 3)
            failed_stage = stage_name
            stage_telemetry["status"] = "failed"
            stage_telemetry["duration"] = elapsed
            stderr_text = e.stderr.strip() if e.stderr else "Unknown error"
            stdout_text = e.stdout.strip() if e.stdout else ""
            stage_telemetry["output"] = stderr_text or stdout_text
            pipeline_stages.append(stage_telemetry)
        except FileNotFoundError as e:
            elapsed = round(time.time() - t0, 3)
            failed_stage = stage_name
            stage_telemetry["status"] = "failed"
            stage_telemetry["duration"] = elapsed
            stage_telemetry["output"] = f"Required executable missing: {e.filename}"
            pipeline_stages.append(stage_telemetry)

    # 3. If the pipeline failed at any point, throw 500 but return the full structured timeline
    if failed_stage:
        raise HTTPException(status_code=500, detail={
            "status": "failed",
            "investigation_id": inv_id,
            "failed_stage": failed_stage,
            "pipeline_stages": pipeline_stages,
        })

    # --- 4. Collect post-execution contextual telemetry ---

    ir_operations = []
    capabilities_used = []
    try:
        with open(contract_file, "r") as f:
            ir_data = json.load(f)
        for inst in ir_data.get("instructions", []):
            op_type = inst.get("type", "unknown")
            ir_operations.append({
                "type": op_type,
                "operation": inst.get("operation", ""),
                "capability": inst.get("capability", ""),
            })
            if op_type == "collect":
                capabilities_used.append(inst.get("operation", ""))
    except Exception:
        pass

    sealed_artifacts_count = 0
    evidence_objects = []
    seal_hash = None
    try:
        with open(sealed_ev_file, "r") as f:
            sdata = json.load(f)
        sealed_artifacts = sdata.get("sealed_artifacts", [])
        sealed_artifacts_count = len(sealed_artifacts)
        seal_hash = sdata.get("manifest_id", None)
        for art in sealed_artifacts:
            evidence_objects.append({
                "evidence_id": art.get("evidence_id", ""),
                "type": art.get("type", "unknown"),
                "provider": art.get("provider", "linux"),
                "sha256": art.get("sha256", ""),
            })
    except Exception:
        pass

    stix_objects_count = 0
    stix_findings_count = 0
    try:
        with open(stix_file, "r") as f:
            stdata = json.load(f)
        stix_objs = stdata.get("objects", [])
        stix_objects_count = len(stix_objs)
        stix_findings_count = sum(1 for o in stix_objs if o.get("type") == "indicator")
    except Exception:
        pass

    sealed_file_hash = None
    try:
        with open(sealed_ev_file, "rb") as f:
            sealed_file_hash = hashlib.sha256(f.read()).hexdigest()
    except Exception:
        pass

    enc_size = 0
    try:
        enc_size = os.path.getsize(enc_file)
    except Exception:
        pass

    # 5. Return nested orchestration blueprint
    return {
        "status": "completed",
        "investigation_id": inv_id,
        "target_platform": req.target_platform,
        "pipeline_stages": pipeline_stages,
        "telemetry": {
            "ir_operations": ir_operations,
            "capabilities_used": capabilities_used,
            "encrypted_payload_bytes": enc_size,
            "evidence": {
                "file_path": sealed_ev_file,
                "manifest_id": seal_hash,
                "file_sha256": sealed_file_hash,
                "artifacts_count": sealed_artifacts_count,
                "objects": evidence_objects,
            },
            "stix_bundle": {
                "file_path": stix_file,
                "objects_count": stix_objects_count,
                "findings_count": stix_findings_count,
            }
        }
    }