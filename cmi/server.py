"""
Mahoraga CMI Backend Server
Executes the full Jocky compiler pipeline and returns rich telemetry.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import FileResponse

import zipfile
import re
import re
import subprocess
import uuid
import os
import sys
import json
import hashlib
import time
from pathlib import Path
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


# ---------------------------------------------------------------------------
# Project paths
# ---------------------------------------------------------------------------

# cmi/server.py -> project root -> examples/
PROJECT_ROOT = Path(__file__).resolve().parent.parent
EXAMPLES_DIR = PROJECT_ROOT / "examples"


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    host_os = "windows" if sys.platform == "win32" else "linux"

    return {
        "status": "CONNECTED",
        "engine": "Mahoraga CMI",
        "host_os": host_os,
    }


# ---------------------------------------------------------------------------
# Jocky Examples API
# ---------------------------------------------------------------------------

@app.get("/api/v1/examples")
async def list_examples():
    """
    Return all .jocky example files from the project's examples/ directory.
    """

    if not EXAMPLES_DIR.exists():
        return {
            "files": [],
        }

    files = sorted(
        file.name
        for file in EXAMPLES_DIR.iterdir()
        if file.is_file() and file.suffix.lower() == ".jocky"
    )

    return {
        "files": files,
    }


@app.get("/api/v1/examples/{filename}")
async def get_example(filename: str):
    """
    Return the contents of a specific .jocky example file.
    """

    # Only allow filenames directly inside examples/.
    # This prevents paths such as ../../some-file.
    file_path = (EXAMPLES_DIR / filename).resolve()

    if file_path.parent != EXAMPLES_DIR.resolve():
        raise HTTPException(
            status_code=400,
            detail="Invalid example filename.",
        )

    if not file_path.is_file() or file_path.suffix.lower() != ".jocky":
        raise HTTPException(
            status_code=404,
            detail="Jocky example not found.",
        )

    try:
        source = file_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read example: {exc}",
        )

    return {
        "filename": file_path.name,
        "source": source,
    }

def generate_investigation_id(jocky_source: str) -> str:
    match = re.search(
        r'investigation\s+"([^"]+)"',
        jocky_source or "",
        re.IGNORECASE,
    )

    investigation_name = (
        match.group(1).strip()
        if match
        else "Investigation"
    )

    slug = re.sub(
        r"[^A-Za-z0-9]+",
        "-",
        investigation_name,
    ).strip("-")

    slug = slug[:48] or "Investigation"

    suffix = uuid.uuid4().hex[:6].upper()

    return f"{slug}-{suffix}"

def get_investigation_artifact_paths(investigation_id: str):
    if not re.fullmatch(r"[A-Za-z0-9-]+", investigation_id):
        raise HTTPException(status_code=400, detail="Invalid investigation ID.")

    evidence_path = Path("out/evidence") / f"{investigation_id}_sealed.json"
    stix_path = Path("out/evidence") / f"{investigation_id}_stix.json"

    return evidence_path, stix_path


@app.get("/api/v1/investigations/{investigation_id}/evidence")
async def get_investigation_evidence(investigation_id: str):
    """Open/download the sealed evidence vault for an investigation."""
    evidence_path, _ = get_investigation_artifact_paths(investigation_id)

    if not evidence_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Sealed evidence artifact not found."
        )

    return FileResponse(
        path=evidence_path,
        media_type="application/json",
        filename=f"{investigation_id}_sealed.json",
    )

def get_investigation_artifact_paths(investigation_id: str):
    if not re.fullmatch(r"[A-Za-z0-9-]+", investigation_id):
        raise HTTPException(status_code=400, detail="Invalid investigation ID.")

    evidence_path = Path("out/evidence") / f"{investigation_id}_sealed.json"
    stix_path = Path("out/evidence") / f"{investigation_id}_stix.json"

    return evidence_path, stix_path

@app.get("/api/v1/investigations/{investigation_id}/stix")
async def get_investigation_stix(investigation_id: str):
    """Open/download the STIX 2.1 bundle for an investigation."""
    _, stix_path = get_investigation_artifact_paths(investigation_id)

    if not stix_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="STIX artifact not found."
        )

    return FileResponse(
        path=stix_path,
        media_type="application/json",
        filename=f"{investigation_id}_stix.json",
    )


@app.get("/api/v1/investigations/{investigation_id}/export")
async def export_investigation(investigation_id: str):
    """
    Export the main investigation artifacts as a ZIP archive.
    Includes sealed evidence and STIX 2.1 output.
    """
    evidence_path, stix_path = get_investigation_artifact_paths(investigation_id)

    if not evidence_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Sealed evidence artifact not found."
        )

    if not stix_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="STIX artifact not found."
        )

    export_dir = Path("out/exports")
    export_dir.mkdir(parents=True, exist_ok=True)

    zip_path = export_dir / f"{investigation_id}_export.zip"

    with zipfile.ZipFile(
        zip_path,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
    ) as archive:
        archive.write(
            evidence_path,
            arcname=f"{investigation_id}_sealed.json",
        )
        archive.write(
            stix_path,
            arcname=f"{investigation_id}_stix.json",
        )

    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=f"{investigation_id}_export.zip",
    )
# ---------------------------------------------------------------------------
# Investigation Orchestration
# ---------------------------------------------------------------------------

@app.post("/api/v1/orchestrate")
async def orchestrate_investigation(req: InvestigationRequest):
    os.makedirs("out/instructions", exist_ok=True)
    os.makedirs("out/evidence", exist_ok=True)

    inv_id = generate_investigation_id(req.jocky_source)

    jocky_file = f"out/{inv_id}.jocky"
    contract_file = f"out/instructions/{inv_id}.json"
    enc_file = f"out/instructions/{inv_id}.enc"
    raw_ev_file = "out/evidence/raw_evidence.json"
    sealed_ev_file = f"out/evidence/{inv_id}_sealed.json"
    stix_file = f"out/evidence/{inv_id}_stix.json"

    with open(jocky_file, "w", encoding="utf-8") as f:
        f.write(req.jocky_source)

    py = sys.executable
    pipeline_stages = []

    # -----------------------------------------------------------------------
    # Resolve native C++ runtime binary
    # -----------------------------------------------------------------------

    # On Windows, search for .exe variants in common CMake output
    # directories.
    #
    # On Linux, preserve the original Unix binary path.
    if sys.platform == "win32":
        runtime_candidates = [
            os.path.join("build", "mahoraga-run.exe"),
            os.path.join("build", "Release", "mahoraga-run.exe"),
            os.path.join("build", "Debug", "mahoraga-run.exe"),
        ]

        runtime_binary = next(
            (
                path
                for path in runtime_candidates
                if os.path.exists(path)
            ),
            runtime_candidates[0],
        )

    else:
        runtime_binary = "./build/mahoraga-run"

    # -----------------------------------------------------------------------
    # Child process environment
    # -----------------------------------------------------------------------

    child_env = os.environ.copy()
    child_env["MAHORAGA_TARGET_PLATFORM"] = req.target_platform

    # -----------------------------------------------------------------------
    # Full structured pipeline
    # -----------------------------------------------------------------------

    stages_config = [
        {
            "name": "compiler",
            "cmd": [
                py,
                "-m",
                "compiler",
                "compile",
                jocky_file,
                "--out",
                contract_file,
            ],
        },
        {
            "name": "obfuscator",
            "cmd": [
                py,
                "-m",
                "compiler.obfuscator",
                contract_file,
                enc_file,
            ],
        },
        {
            "name": "runtime",
            "cmd": [
                runtime_binary,
                enc_file,
            ],
        },
        {
            "name": "sealing",
            "cmd": [
                py,
                "-m",
                "evidence.sealing",
                raw_ev_file,
                sealed_ev_file,
            ],
        },
        {
            "name": "stix",
            "cmd": [
                py,
                "-m",
                "detection.engine",
                contract_file,
                sealed_ev_file,
                stix_file,
            ],
        },
    ]

    failed_stage = None

    # -----------------------------------------------------------------------
    # Execute pipeline sequentially
    # -----------------------------------------------------------------------

    for stage in stages_config:
        stage_name = stage["name"]
        cmd = stage["cmd"]

        stage_telemetry = {
            "stage": stage_name,
            "status": "pending",
            "command": " ".join(cmd),
            "duration": 0.0,
            "output": "",
        }

        if failed_stage:
            stage_telemetry["status"] = "skipped"
            pipeline_stages.append(stage_telemetry)
            continue

        t0 = time.time()

        try:
            result = subprocess.run(
                cmd,
                check=True,
                capture_output=True,
                text=True,
                env=child_env,
            )

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
            stage_telemetry["output"] = (
                f"Required executable missing: {e.filename}"
            )

            pipeline_stages.append(stage_telemetry)

    # -----------------------------------------------------------------------
    # Pipeline failure
    # -----------------------------------------------------------------------

    if failed_stage:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "failed",
                "investigation_id": inv_id,
                "failed_stage": failed_stage,
                "pipeline_stages": pipeline_stages,
            },
        )

    # -----------------------------------------------------------------------
    # Post-execution contextual telemetry
    # -----------------------------------------------------------------------

    ir_operations = []
    capabilities_used = []

    try:
        with open(contract_file, "r", encoding="utf-8") as f:
            ir_data = json.load(f)

        for inst in ir_data.get("instructions", []):
            op_type = inst.get("type", "unknown")

            ir_operations.append(
                {
                    "type": op_type,
                    "operation": inst.get("operation", ""),
                    "capability": inst.get("capability", ""),
                }
            )

            if op_type == "collect":
                capabilities_used.append(
                    inst.get("operation", "")
                )

    except Exception:
        pass

    # -----------------------------------------------------------------------
    # Evidence telemetry
    # -----------------------------------------------------------------------

    sealed_artifacts_count = 0
    evidence_objects = []
    seal_hash = None

    try:
        with open(sealed_ev_file, "r", encoding="utf-8") as f:
            sdata = json.load(f)

        sealed_artifacts = sdata.get("sealed_artifacts", [])

        sealed_artifacts_count = len(sealed_artifacts)
        seal_hash = sdata.get("manifest_id", None)

        for art in sealed_artifacts:
            evidence_objects.append(
                {
                    "evidence_id": art.get("evidence_id", ""),
                    "type": art.get("type", "unknown"),
                    "provider": art.get(
                        "provider",
                        "linux",
                    ),
                    "sha256": art.get("sha256", ""),
                }
            )

    except Exception:
        pass

    # -----------------------------------------------------------------------
    # STIX telemetry
    # -----------------------------------------------------------------------

    stix_objects_count = 0
    stix_findings_count = 0

    try:
        with open(stix_file, "r", encoding="utf-8") as f:
            stdata = json.load(f)

        stix_objs = stdata.get("objects", [])

        stix_objects_count = len(stix_objs)

        stix_findings_count = sum(
            1
            for obj in stix_objs
            if obj.get("type") == "indicator"
        )

    except Exception:
        pass

    # -----------------------------------------------------------------------
    # Sealed evidence file hash
    # -----------------------------------------------------------------------

    sealed_file_hash = None

    try:
        with open(sealed_ev_file, "rb") as f:
            sealed_file_hash = hashlib.sha256(
                f.read()
            ).hexdigest()

    except Exception:
        pass

    # -----------------------------------------------------------------------
    # Encrypted payload size
    # -----------------------------------------------------------------------

    enc_size = 0

    try:
        enc_size = os.path.getsize(enc_file)

    except Exception:
        pass

    # -----------------------------------------------------------------------
    # Final response
    # -----------------------------------------------------------------------

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
            },
        },
    }