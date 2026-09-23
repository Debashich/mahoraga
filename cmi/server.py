from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import uuid
import os

app = FastAPI(title="Mahoraga CMI - Jocky DSL Engine")

class InvestigationRequest(BaseModel):
    jocky_source: str
    target_platform: str

@app.post("/api/v1/orchestrate")
async def orchestrate_investigation(req: InvestigationRequest):
    # Ensure all required output directories exist before writing
    os.makedirs("out/instructions", exist_ok=True)
    os.makedirs("out/evidence", exist_ok=True)

    # Generate a unique ID for this investigation run
    inv_id = f"NTRO-Sweep-{uuid.uuid4().hex[:6].upper()}"
    
    # Define dynamic file paths
    jocky_file = f"out/{inv_id}.jocky"
    contract_file = f"out/instructions/{inv_id}.json"
    raw_ev_file = "out/evidence/raw_evidence.json" 
    sealed_ev_file = f"out/evidence/{inv_id}_sealed.json"
    stix_file = f"out/evidence/{inv_id}_stix.json"

    # 1. Write the DSL payload
    with open(jocky_file, "w") as f:
        f.write(req.jocky_source)
    
    try:
        # 2. Compile DSL to MLIR to Target Contract
        subprocess.run(["python", "-m", "compiler", "compile", jocky_file, "--out", contract_file], check=True, capture_output=True)
        
        # 3. Execute Native Runtime
        subprocess.run(["./build/odin-run", contract_file], check=True, capture_output=True)
        
        # 4. Cryptographic Sealing
        subprocess.run(["python", "-m", "evidence.sealing", raw_ev_file, sealed_ev_file], check=True, capture_output=True)
        
        # 5. Temporal Detection & STIX Generation
        subprocess.run(["python", "-m", "detection.engine", sealed_ev_file], check=True, capture_output=True)
        
        # The detection engine defaults to report_stix.json; rename it to match the investigation ID
        if os.path.exists("out/evidence/report_stix.json"):
            os.rename("out/evidence/report_stix.json", stix_file)

        return {
            "status": "completed",
            "investigation_id": inv_id,
            "target_platform": req.target_platform,
            "operations": [
                {
                    "operation": "process_list",
                    "status": "completed"
                }
            ],
            "sealed_evidence": sealed_ev_file,
            "stix_bundle": stix_file
        }

    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail={
            "status": "failed",
            "investigation_id": inv_id,
            "stage": e.cmd,
            "error_output": e.stderr.decode('utf-8') if e.stderr else "Unknown runtime error"
        })
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail={
            "status": "failed",
            "investigation_id": inv_id,
            "stage": "executable_lookup",
            "error_output": f"Required executable missing: {e.filename}"
        })