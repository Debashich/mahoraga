from fastapi import FastAPI, BackgroundTasks
import subprocess
from pydantic import BaseModel

app = FastAPI(title="JOCKY Central Management Interface")

class InvestigationRequest(BaseModel):
    jocky_source: str
    target_platform: str

@app.post("/api/v1/orchestrate")
async def orchestrate_investigation(req: InvestigationRequest, background_tasks: BackgroundTasks):
    with open("temp.jocky", "w") as f:
        f.write(req.jocky_source)
    
    # Golden Path Execution Pipeline
    def run_pipeline():
        subprocess.run(["python", "-m", "compiler", "compile", "temp.jocky", "--out", "out/contract.json"])
        subprocess.run(["./build/odin-run", "out/contract.json"])
        subprocess.run(["python", "-m", "evidence.sealing", "out/evidence/raw_evidence.json", "out/evidence/sealed.json"])
        subprocess.run(["python", "-m", "detection.engine", "out/evidence/sealed.json"])
        
    background_tasks.add_task(run_pipeline)
    return {"status": "Investigation queued", "pipeline": "Compiler -> Execution -> Sealing -> STIX"}