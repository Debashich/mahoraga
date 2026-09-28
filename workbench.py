from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import streamlit as st

try:
    from streamlit_ace import st_ace
    ACE_AVAILABLE = True
except Exception:
    ACE_AVAILABLE = False

# ---------------------------------------------------------------------------
# Mahoraga Workbench
#
# A compiler/runtime front-end for the Jocky forensic analysis language.
# This is a toolchain interface (source -> AST -> IR -> native provider ->
# evidence -> report), not a SaaS dashboard. Jocky itself is a controlled
# language for expressing authorized collection, correlation, validation
# and evidence-handling workflows for digital forensics, incident response
# and defensive security research in a laboratory setting.
#
# Run from the repository root:
#     streamlit run ui/workbench.py
# ---------------------------------------------------------------------------

_file_path = Path(__file__).resolve()
ROOT = _file_path.parent if (_file_path.parent / "CMakeLists.txt").exists() else _file_path.parents[1]

EXAMPLES_DIR = ROOT / "examples"
OUT_DIR = ROOT / "out"
INSTRUCTIONS_DIR = OUT_DIR / "instructions"
EVIDENCE_DIR = OUT_DIR / "evidence"

COMPILER = (ROOT / "mahoraga.bat") if (os.name == "nt" and (ROOT / "mahoraga.bat").exists()) else (ROOT / "mahoraga")

# Native runtime layout is fixed by the project:
#   ~/mahoraga/build/mahoraga-run
# Do not assume the binary lives directly under ROOT.
NATIVE_RUNTIME = ROOT / "build" / "mahoraga-run"

CAPABILITIES = {
    "process_list": "Running processes and execution metadata.",
    "system_info": "Host identity and operating-system information.",
    "network_connections": "Active network connections and socket metadata.",
    "users": "Local user and account information.",
    "auth_logs": "Authentication and login event records.",
    "file_metadata": "File metadata and filesystem evidence.",
    "memory_snapshot": "Memory acquisition capability, when supported.",
    "driver_scan": "Loaded driver/module information.",
    "kernel_callbacks": "Kernel callback inspection.",
    "registry_hives": "Registry hive collection on supported platforms.",
    "event_logs": "Platform event-log collection.",
}

# Capabilities the active provider (native Linux runtime) can actually
# service today. Anything requested outside this set is a real provider
# diagnostic, not a UI toggle.
LINUX_PROVIDER_SUPPORTED = {
    "process_list", "system_info", "users", "network_connections", "auth_logs",
}

WINDOWS_PROVIDER_SUPPORTED = {
    "process_list", "system_info", "users", "network_connections",
    "auth_logs", "file_metadata", "driver_scan", "registry_hives",
}

PRESETS = {
    "fast": {"evidence": "Canonical", "integrity": True, "intent": "Focused host triage"},
    "balanced": {"evidence": "Canonical + STIX", "integrity": True, "intent": "Standard forensic investigation"},
    "maximum": {"evidence": "Canonical + STIX", "integrity": True, "intent": "Broadest available investigation scope"},
    "custom": {"evidence": None, "integrity": None, "intent": "Operator-defined configuration"},
}

PIPELINE_STAGES = [
    "LEX / PARSE",
    "AST",
    "SEMANTIC VALIDATION",
    "FORENSIC IR",
    "LOWERING",
    "NATIVE PROVIDER",
    "EVIDENCE",
    "INTEGRITY / STIX",
    "REPORT",
]

# ---------------------------------------------------------------------------
# Styling — terminal/compiler workbench. Flat, dense, monospace. No hero,
# no gradients, no decorative cards.
# ---------------------------------------------------------------------------

st.set_page_config(
    page_title="Mahoraga Workbench",
    page_icon="🛡",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
<style>
html, body, [class*="css"] {
    font-family: "IBM Plex Mono", "JetBrains Mono", ui-monospace, Consolas, monospace;
}

.stApp { background: #0a0b0e; color: #d6d9de; }

.block-container {
    max-width: 1100px;
    padding-top: 0.5rem;
    padding-bottom: 3rem;
}

header[data-testid="stHeader"] { background: #0a0b0e; }

.status-block {
    border: 1px solid #23262f;
    border-radius: 3px;
    background: #0d0f14;
    padding: 10px 14px;
    margin-bottom: 10px;
    font-size: 12px;
    line-height: 1.7;
    color: #9aa0ad;
}

.status-block b { color: #d6d9de; }

.stage {
    border-bottom: 1px solid #1a1c23;
    margin: 18px 0 10px;
    padding-bottom: 4px;
}

.stage-prompt {
    color: #5f6674;
    font-size: 12px;
}

.stage-prompt .cmd { color: #8ea0c9; }

.stage-note {
    color: #6f7683;
    font-size: 11.5px;
    margin: 2px 0 12px;
}

.panel {
    border: 1px solid #23262f;
    border-radius: 3px;
    background: #0d0f14;
    padding: 12px 14px;
    margin-bottom: 10px;
}

.diag-line {
    font-size: 12px;
    line-height: 1.8;
    white-space: pre;
}

.tag-pass { color: #6fbf87; font-weight: 700; }
.tag-warn { color: #d2a44f; font-weight: 700; }
.tag-block { color: #d16b6b; font-weight: 700; }
.tag-pending { color: #5f6674; font-weight: 700; }

.scope-row {
    display: grid;
    grid-template-columns: 22px 170px 90px 1fr;
    gap: 10px;
    padding: 4px 0;
    font-size: 12px;
    border-bottom: 1px solid #171921;
}

.scope-row .cap-name { color: #d6d9de; }
.scope-row .cap-desc { color: #6f7683; }

div[data-testid="stButton"] > button {
    border-radius: 2px;
    min-height: 32px;
    background: #10121a;
    border: 1px solid #262a35;
    color: #d6d9de;
    font-size: 12.5px;
    font-family: "IBM Plex Mono", monospace;
}

div[data-testid="stButton"] > button:hover {
    border-color: #4c586e;
    color: #fff;
}

div[data-testid="stButton"] > button[kind="primary"] {
    background: #16202c;
    border-color: #3a5578;
}

div[data-testid="stDownloadButton"] > button { border-radius: 2px; }

code, pre { font-family: "IBM Plex Mono", monospace !important; font-size: 12px !important; }

.footer { padding: 14px 0 4px; color: #454a56; font-size: 10.5px; }
</style>
""",
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

DEFAULTS = {
    "source": "",
    "import_panel": None,          # None | "file" | "github" | "demo"
    "preset": "balanced",
    "target_platform": "Windows" if os.name == "nt" else "Linux",
    "provider": "Native Windows Provider" if os.name == "nt" else "Native Linux Provider",
    "runtime_mode": "Native / Local",
    "evidence_format": "Canonical + STIX",
    "integrity": True,
    "air_gapped": False,
    "dry_run_report": None,
    "execution": None,
    "package_bytes": None,
    "operator_id": os.getenv("USER") or os.getenv("USERNAME") or "local-operator",
}
for _k, _v in DEFAULTS.items():
    if _k not in st.session_state:
        st.session_state[_k] = _v

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def find_runtime() -> Path | None:
    target_platform = st.session_state.get("target_platform", "Windows" if os.name == "nt" else "Linux")
    candidates = []
    if target_platform == "Windows" or os.name == "nt":
        candidates.extend([
            ROOT / "build" / "mahoraga-run.exe",
            ROOT / "build" / "Release" / "mahoraga-run.exe",
            ROOT / "build" / "Debug" / "mahoraga-run.exe",
        ])
    candidates.extend([
        ROOT / "build" / "mahoraga-run",
        NATIVE_RUNTIME,
    ])
    for target in candidates:
        if target.exists():
            return target
    return None


def discover_examples() -> list[Path]:
    if not EXAMPLES_DIR.exists():
        return []
    return sorted(EXAMPLES_DIR.glob("*.jocky"))


def parse_source(source: str) -> dict[str, Any]:
    """
    Live AST projection. Uses the repository parser when importable;
    otherwise falls back to a regex-based structural read so the editor
    stays useful even when compiler.parser is not importable from the
    Streamlit process's path.
    """
    result: dict[str, Any] = {
        "valid_syntax": True,
        "collections": [],
        "aliases": {},
        "correlations": [],
        "errors": [],
        "parser": "fallback",
    }

    if not source.strip():
        result["valid_syntax"] = False
        result["errors"].append("No source loaded.")
        return result

    try:
        import sys
        if str(ROOT) not in sys.path:
            sys.path.insert(0, str(ROOT))

        from compiler.parser import parse  # type: ignore

        ast = parse(source)
        result["parser"] = "compiler"

        for stmt in getattr(ast, "statements", []):
            name = type(stmt).__name__
            if name == "Collect":
                operation = str(getattr(stmt, "operation", ""))
                alias = getattr(stmt, "alias", None)
                result["collections"].append(operation)
                if alias:
                    result["aliases"][str(alias)] = operation
            elif name == "Correlate":
                result["correlations"].append(
                    (str(getattr(stmt, "source", "")), str(getattr(stmt, "target", "")))
                )
        return result
    except Exception as exc:
        result["parser"] = "fallback"

        investigation_count = len(re.findall(r'^\s*investigation\s+"[^"]+"\s*\{', source, re.M))
        if investigation_count == 0:
            result["valid_syntax"] = False
            result["errors"].append("No valid investigation block detected.")

        for match in re.finditer(
            r'^\s*collect\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?',
            source, re.M,
        ):
            operation, alias = match.groups()
            result["collections"].append(operation)
            if alias:
                result["aliases"][alias] = operation

        for match in re.finditer(
            r'^\s*correlate\s+([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)',
            source, re.M,
        ):
            result["correlations"].append(match.groups())

        known = set(CAPABILITIES)
        unknown = [op for op in result["collections"] if op not in known]
        if unknown:
            result["errors"].append("Unknown capability: " + ", ".join(sorted(set(unknown))))

        aliases = set(result["aliases"])
        for source_alias, target_alias in result["correlations"]:
            if source_alias not in aliases:
                result["errors"].append(f"Undefined reference: '{source_alias}'")
            if target_alias not in aliases:
                result["errors"].append(f"Undefined reference: '{target_alias}'")

        if result["errors"]:
            result["valid_syntax"] = False

        if not result["errors"] and "investigation" not in source:
            result["valid_syntax"] = False
            result["errors"].append(str(exc))

        return result


def semantic_lint(source: str, parsed: dict[str, Any]) -> list[str]:
    errors = list(parsed["errors"])
    for op in parsed["collections"]:
        if op not in CAPABILITIES:
            errors.append(f"Unsupported capability in language contract: '{op}'")
    for a, b in parsed["correlations"]:
        if a not in parsed["aliases"]:
            errors.append(f"Undefined reference: '{a}'")
        if b not in parsed["aliases"]:
            errors.append(f"Undefined reference: '{b}'")
    if source.count("{") != source.count("}"):
        errors.append("Unbalanced investigation braces.")
    return list(dict.fromkeys(errors))


def provider_unsupported(capabilities: list[str], provider: str) -> list[str]:
    """Real provider-capability diagnostic — never silently ignored."""
    if provider == "Native Linux Provider":
        return [c for c in capabilities if c not in LINUX_PROVIDER_SUPPORTED]
    elif provider == "Native Windows Provider":
        return [c for c in capabilities if c not in WINDOWS_PROVIDER_SUPPORTED]
    return []


def capability_insert(capability: str) -> str:
    aliases = {
        "process_list": "procs", "system_info": "sys", "network_connections": "conns",
        "users": "users", "auth_logs": "auth", "file_metadata": "files",
        "memory_snapshot": "memory", "driver_scan": "drivers",
        "kernel_callbacks": "callbacks", "registry_hives": "registry", "event_logs": "events",
    }
    alias = aliases.get(capability, capability)
    return f"collect {capability} as {alias}"


def add_collect_to_source(source: str, capability: str) -> str:
    statement = capability_insert(capability)
    if re.search(rf'^\s*collect\s+{re.escape(capability)}(?:\s+as\s+\w+)?\s*$', source, re.M):
        return source
    match = re.search(r'(?ms)(\binvestigation\s+"[^"]+"\s*\{\n)', source)
    if match:
        pos = match.end()
        return source[:pos] + f"    {statement}\n" + source[pos:]
    return 'investigation "New Investigation" {\n' f"    {statement}\n\n" "    emit evidence\n}\n"


def remove_collect_from_source(source: str, capability: str) -> str:
    return re.sub(
        rf'^\s*collect\s+{re.escape(capability)}(?:\s+as\s+\w+)?\s*\n', "", source, flags=re.M,
    )


def preflight(source: str) -> dict[str, Any]:
    """
    Distinguishes hard errors (BLOCK) from environmental warnings (WARN).
    Non-root execution is an environmental fact, not a universal blocker —
    many collections run fine unprivileged.
    """
    parsed = parse_source(source)
    lint_errors = semantic_lint(source, parsed)
    runtime = find_runtime()
    unsupported = provider_unsupported(parsed["collections"], st.session_state.provider)
    if hasattr(os, "geteuid"):
        is_root = os.geteuid() == 0
    else:
        try:
            import ctypes
            is_root = ctypes.windll.shell32.IsUserAnAdmin() != 0
        except Exception:
            is_root = False

    checks = [
        {
            "name": "Jocky parser",
            "status": "PASS" if parsed["valid_syntax"] else "BLOCK",
            "detail": "Lexed and parsed." if parsed["valid_syntax"] else "; ".join(parsed["errors"]) or "Syntax error.",
        },
        {
            "name": "AST generation",
            "status": "PASS" if parsed["valid_syntax"] and not lint_errors else "BLOCK",
            "detail": (
                f"{len(parsed['collections'])} collection(s), {len(parsed['correlations'])} relationship(s)."
                if parsed["valid_syntax"] and not lint_errors
                else "; ".join(lint_errors) or "AST could not be validated."
            ),
        },
        {
            "name": "Provider capability contract",
            "status": "PASS" if not unsupported else "BLOCK",
            "detail": (
                "All requested capabilities are serviced by the active provider."
                if not unsupported
                else f"Unsupported by {st.session_state.provider}: " + ", ".join(unsupported)
            ),
        },
        {
            "name": "Privilege context",
            "status": "PASS" if is_root else "WARN",
            "detail": (
                "Running with administrative/root privileges."
                if is_root
                else "Non-elevated context. Some capabilities (memory_snapshot, driver_scan, "
                     "kernel_callbacks) may return partial results or fail at execution time."
            ),
        },
        {
            "name": "Target platform",
            "status": "PASS" if st.session_state.target_platform in ["Linux", "Windows"] else "BLOCK",
            "detail": st.session_state.target_platform,
        },
        {
            "name": "Native runtime",
            "status": "PASS" if runtime is not None else "BLOCK",
            "detail": str(runtime) if runtime else f"{'mahoraga-run.exe' if st.session_state.target_platform == 'Windows' else 'mahoraga-run'} not found at {ROOT / 'build' / ('mahoraga-run.exe' if st.session_state.target_platform == 'Windows' else 'mahoraga-run')}",
        },
    ]

    ready = all(c["status"] != "BLOCK" for c in checks)

    return {"timestamp": utc_now(), "parsed": parsed, "checks": checks, "ready": ready}


def execute_investigation(source: str) -> dict[str, Any]:
    timestamp = utc_now()

    EXAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    INSTRUCTIONS_DIR.mkdir(parents=True, exist_ok=True)
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

    source_path = EXAMPLES_DIR / "workbench_investigation.jocky"
    source_path.write_text(source, encoding="utf-8")

    if not COMPILER.exists():
        return {
            "ok": False, "timestamp": timestamp, "stdout": "", "stderr": f"Compiler not found: {COMPILER}",
            "source_path": str(source_path),
        }

    command = [str(COMPILER), str(source_path)]
    try:
        proc = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=300)
    except subprocess.TimeoutExpired:
        return {
            "ok": False, "timestamp": timestamp, "stdout": "",
            "stderr": "Investigation timed out after 300 seconds.", "source_path": str(source_path),
        }
    except Exception as exc:
        return {
            "ok": False, "timestamp": timestamp, "stdout": "", "stderr": str(exc),
            "source_path": str(source_path),
        }

    candidates = {
        "raw": OUT_DIR / "evidence" / "raw_evidence.json",
        "sealed": OUT_DIR / "evidence" / "workbench_investigation_sealed.json",
        "stix": OUT_DIR / "evidence" / "workbench_investigation_stix.json",
        "instructions": OUT_DIR / "instructions" / "workbench_investigation.json",
    }

    return {
        "ok": proc.returncode == 0,
        "timestamp": timestamp,
        "returncode": proc.returncode,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
        "source_path": str(source_path),
        "artifacts": {name: str(path) for name, path in candidates.items() if path.exists()},
    }


def read_json(path: str | Path) -> Any:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception:
        return None


def evidence_summary(execution: dict[str, Any]) -> dict[str, Any]:
    artifacts = execution.get("artifacts", {})
    raw = read_json(artifacts.get("raw", "")) if artifacts.get("raw") else None
    sealed = read_json(artifacts.get("sealed", "")) if artifacts.get("sealed") else None
    stix = read_json(artifacts.get("stix", "")) if artifacts.get("stix") else None
    instructions = read_json(artifacts.get("instructions", "")) if artifacts.get("instructions") else None

    artifact_count = 0
    if isinstance(raw, list):
        artifact_count = len(raw)
    elif isinstance(raw, dict):
        for key in ("artifacts", "evidence", "collections", "data"):
            value = raw.get(key)
            if isinstance(value, list):
                artifact_count = len(value)
                break

    hashes = []
    if isinstance(sealed, dict):
        for key in ("artifacts", "evidence", "sealed_artifacts"):
            value = sealed.get(key)
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        for hk in ("sha256", "hash", "digest"):
                            if item.get(hk):
                                hashes.append(str(item[hk]))
                                break

    coc_present = False
    if isinstance(sealed, dict):
        for key in ("chain_of_custody", "coc", "custody"):
            if sealed.get(key):
                coc_present = True
                break

    stix_objects = (
        len(stix.get("objects", []))
        if isinstance(stix, dict) and isinstance(stix.get("objects"), list)
        else 0
    )

    return {
        "artifact_count": artifact_count, "hash_count": len(hashes), "stix_objects": stix_objects,
        "coc_present": coc_present, "ir_present": instructions is not None,
        "raw": raw, "sealed": sealed, "stix": stix, "instructions": instructions,
    }


def pipeline_state(
    parsed: dict[str, Any], lint_errors: list[str], execution: dict[str, Any] | None,
    summary: dict[str, Any] | None,
) -> list[tuple[str, str]]:
    """
    Maps real, currently-known state onto the compiler pipeline. Nothing
    here is fabricated: a stage is only OK when its backing artifact or
    condition actually exists.
    """
    states: dict[str, str] = {stage: "pending" for stage in PIPELINE_STAGES}

    if parsed["valid_syntax"]:
        states["LEX / PARSE"] = "ok"
        states["AST"] = "ok"
    else:
        states["LEX / PARSE"] = "blocked"
        return list(states.items())

    states["SEMANTIC VALIDATION"] = "ok" if not lint_errors else "blocked"
    if lint_errors:
        return list(states.items())

    if not execution:
        return list(states.items())

    if summary and summary.get("ir_present"):
        states["FORENSIC IR"] = "ok"

    if execution.get("returncode") is not None:
        states["LOWERING"] = "ok" if execution.get("ok") else "blocked"
        states["NATIVE PROVIDER"] = "ok" if execution.get("ok") else "blocked"

    if summary and summary.get("artifact_count", 0) > 0:
        states["EVIDENCE"] = "ok"

    if summary:
        integrity_ok = summary.get("hash_count", 0) > 0
        stix_wanted = "STIX" in st.session_state.evidence_format
        stix_ok = summary.get("stix_objects", 0) > 0 if stix_wanted else True
        if (st.session_state.integrity and integrity_ok) or (not st.session_state.integrity):
            if stix_ok:
                states["INTEGRITY / STIX"] = "ok"

    if execution.get("ok") and summary and summary.get("artifact_count", 0) > 0:
        states["REPORT"] = "ok"

    return list(states.items())


def collect_relationships(parsed: dict[str, Any]) -> list[tuple[str, str]]:
    return parsed.get("correlations", [])


def make_package(source: str, air_gapped: bool, include_runtime: bool = True) -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / "mahoraga-investigation"
        (root / "evidence").mkdir(parents=True)
        (root / "stix").mkdir(parents=True)
        (root / "hashes").mkdir(parents=True)
        (root / "binaries").mkdir(parents=True)

        (root / "investigation.jocky").write_text(source, encoding="utf-8")

        parsed = parse_source(source)
        manifest = {
            "format": "mahoraga-investigation-package/v1",
            "created_utc": utc_now(),
            "operator_id": st.session_state.operator_id,
            "target_platform": st.session_state.target_platform,
            "provider": st.session_state.provider,
            "runtime_mode": st.session_state.runtime_mode,
            "evidence_format": st.session_state.evidence_format,
            "integrity": st.session_state.integrity,
            "air_gapped": air_gapped,
            "capabilities": parsed["collections"],
            "relationships": [{"source": a, "target": b} for a, b in parsed["correlations"]],
        }
        (root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

        instruction_path = INSTRUCTIONS_DIR / "workbench_investigation.json"
        if instruction_path.exists():
            shutil.copy2(instruction_path, root / "forensic_ir.json")

        raw_path = EVIDENCE_DIR / "raw_evidence.json"
        sealed_path = EVIDENCE_DIR / "workbench_investigation_sealed.json"
        stix_path = EVIDENCE_DIR / "workbench_investigation_stix.json"
        if raw_path.exists():
            shutil.copy2(raw_path, root / "evidence" / "raw.json")
        if sealed_path.exists():
            shutil.copy2(sealed_path, root / "evidence" / "sealed.json")
        if stix_path.exists():
            shutil.copy2(stix_path, root / "stix" / "bundle.json")

        runtime = find_runtime()
        if include_runtime and runtime:
            target = root / "binaries" / "linux-x64"
            target.mkdir(parents=True, exist_ok=True)
            shutil.copy2(runtime, target / runtime.name)

        if air_gapped:
            deps = root / "binaries" / "air-gapped-manifest.json"
            deps.write_text(
                json.dumps({
                    "mode": "air-gapped",
                    "note": (
                        "Package includes the available native runtime binary. External OS "
                        "packages and system libraries are not fabricated; supply them from "
                        "the lab environment."
                    ),
                    "runtime": str(runtime) if runtime else None,
                }, indent=2),
                encoding="utf-8",
            )

        manifest_hash = hashlib.sha256((root / "manifest.json").read_bytes()).hexdigest()
        (root / "hashes" / "manifest.sha256").write_text(f"{manifest_hash}  manifest.json\n", encoding="utf-8")

        zip_path = Path(tmp) / "mahoraga-investigation.zip"
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for path in root.rglob("*"):
                if path.is_file():
                    archive.write(path, path.relative_to(Path(tmp)))
        return zip_path.read_bytes()


def build_report_markdown(execution: dict[str, Any], parsed: dict[str, Any], summary: dict[str, Any]) -> str:
    relationships = collect_relationships(parsed)
    lines = [
        "# Mahoraga Investigation Report", "",
        f"- Execution UTC: {execution.get('timestamp', '—')}",
        f"- Operator: {st.session_state.operator_id}",
        f"- Target Platform: {st.session_state.target_platform}",
        f"- Execution Provider: {st.session_state.provider}",
        f"- Preset: {st.session_state.preset}",
        f"- Evidence Format: {st.session_state.evidence_format}",
        "", "## Collections", "",
    ]
    lines += [f"- `{c}`" for c in parsed["collections"]] or ["- (none)"]
    lines += ["", "## Relationships", ""]
    lines += [f"- `{a}` <-> `{b}`" for a, b in relationships] or ["- (none declared)"]
    lines += [
        "", "## Evidence", "",
        f"- Evidence artifacts: {summary['artifact_count']}",
        f"- Sealed/hashed artifacts: {summary['hash_count']}",
        f"- STIX objects: {summary['stix_objects']}",
    ]
    return "\n".join(lines)


def source_editor(source: str) -> str:
    if ACE_AVAILABLE:
        return st_ace(
            value=source, language="text", theme="terminal", height=360, key="jocky_editor",
            tab_size=4, wrap=True, auto_update=True, font_size=13, show_gutter=True,
            show_print_margin=False,
        ) or ""
    return st.text_area(
        "Jocky source", value=source, height=360, key="jocky_editor_fallback", label_visibility="collapsed",
    )


def section(number: str, title: str) -> None:
    st.markdown(
        f'<div class="stage"><div class="stage-prompt">'
        f'<span class="cmd">mahoraga</span>@workbench:~$ <b>{number}</b> — {title}</div></div>',
        unsafe_allow_html=True,
    )


def diag_tag(status: str) -> str:
    cls = {"PASS": "tag-pass", "WARN": "tag-warn", "BLOCK": "tag-block"}.get(status, "tag-pending")
    return f'<span class="{cls}">{status:<5}</span>'


def stage_tag(state: str) -> str:
    return {"ok": '<span class="tag-pass">[OK]</span>', "blocked": '<span class="tag-block">[FAIL]</span>'}.get(
        state, '<span class="tag-pending">[--]</span>'
    )


# ---------------------------------------------------------------------------
# Status line
# ---------------------------------------------------------------------------

runtime_path = find_runtime()
st.markdown(
    f"""
<div class="status-block">
<b>JOCKY compiler</b> · Mahoraga runtime · forensic evidence provider<br>
runtime&nbsp;&nbsp;&nbsp;: {runtime_path if runtime_path else f'<span class="tag-block">NOT FOUND</span> (expected {NATIVE_RUNTIME})'}<br>
provider&nbsp;&nbsp;: {st.session_state.provider}<br>
mode&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: operator — authorized defensive research / forensic laboratory use
</div>
""",
    unsafe_allow_html=True,
)

parsed_top = parse_source(st.session_state.source)  # live read, used throughout

# ---------------------------------------------------------------------------
# 01 · SOURCE — editor is always present; import panel never hides it.
# ---------------------------------------------------------------------------

section("01", "source")
st.markdown(
    '<div class="stage-note">Jocky editor is the canonical source. Import panels place text into it '
    'on explicit Load — they never replace the editor view.</div>',
    unsafe_allow_html=True,
)

nav_cols = st.columns([1, 1, 1, 3])
if nav_cols[0].button("file", key="open_file", use_container_width=True):
    st.session_state.import_panel = "file"
if nav_cols[1].button("github", key="open_github", use_container_width=True):
    st.session_state.import_panel = "github"
if nav_cols[2].button("demo", key="open_demo", use_container_width=True):
    st.session_state.import_panel = "demo"

if st.session_state.import_panel is not None:
    with st.container():
        st.markdown('<div class="panel">', unsafe_allow_html=True)
        top = st.columns([5, 1])
        top[0].markdown(f"**import · {st.session_state.import_panel}**")
        if top[1].button("back to editor", key="close_import_panel"):
            st.session_state.import_panel = None
            st.rerun()

        if st.session_state.import_panel == "file":
            uploaded = st.file_uploader("select a .jocky file", type=["jocky", "txt"], key="jocky_upload")
            folder = st.file_uploader(
                "or select multiple .jocky files", type=["jocky"], accept_multiple_files=True, key="jocky_folder",
            )
            candidate_file = None
            if uploaded:
                candidate_file = uploaded
            elif folder:
                names = [f.name for f in folder]
                choice = st.selectbox("choose investigation", names, key="folder_choice")
                candidate_file = next((f for f in folder if f.name == choice), None)
            if candidate_file is not None and st.button("load into editor", key="load_file", type="primary"):
                st.session_state.source = candidate_file.read().decode("utf-8", errors="replace")
                st.session_state.import_panel = None
                st.session_state.execution = None
                st.session_state.dry_run_report = None
                st.session_state.package_bytes = None
                st.rerun()

        elif st.session_state.import_panel == "github":
            repo_url = st.text_input("repository URL", placeholder="https://github.com/owner/repository", key="github_repo_url")
            github_file = st.text_input(
                "jocky path in local checkout", placeholder="examples/suspicious_host.jocky", key="github_file_path",
            )
            st.caption("GitHub import resolves against the local checkout; remote fetch is not wired in this build.")
            if st.button("load into editor", key="github_load", type="primary"):
                candidate = ROOT / github_file
                if not repo_url.strip():
                    st.warning("enter the repository URL first.")
                elif candidate.exists() and candidate.suffix == ".jocky":
                    st.session_state.source = candidate.read_text(encoding="utf-8")
                    st.session_state.import_panel = None
                    st.session_state.execution = None
                    st.session_state.dry_run_report = None
                    st.session_state.package_bytes = None
                    st.rerun()
                else:
                    st.error("that .jocky path does not exist in the current local checkout.")

        elif st.session_state.import_panel == "demo":
            examples = discover_examples()
            if examples:
                choice = st.selectbox("demo investigation", examples, format_func=lambda p: p.name, key="demo_example")
                if st.button("load into editor", key="load_demo", type="primary"):
                    st.session_state.source = choice.read_text(encoding="utf-8")
                    st.session_state.import_panel = None
                    st.session_state.execution = None
                    st.session_state.dry_run_report = None
                    st.session_state.package_bytes = None
                    st.rerun()
            else:
                st.info(f"no examples/*.jocky files found in {EXAMPLES_DIR}")

        st.markdown('</div>', unsafe_allow_html=True)

edited = source_editor(st.session_state.source)
if edited != st.session_state.source:
    st.session_state.source = edited
    # A stale execution/report belongs to a different source than what is
    # now in the editor — invalidate it instead of leaving mismatched output.
    st.session_state.execution = None
    st.session_state.dry_run_report = None
    st.session_state.package_bytes = None

parsed = parse_source(st.session_state.source)
lint_errors = semantic_lint(st.session_state.source, parsed)

if parsed["valid_syntax"] and not lint_errors and st.session_state.source.strip():
    st.markdown(
        f'<div class="diag-line">{diag_tag("PASS")}  AST: {len(parsed["collections"])} collection(s), '
        f'{len(parsed["correlations"])} relationship(s)</div>',
        unsafe_allow_html=True,
    )
elif st.session_state.source.strip():
    for e in (lint_errors or parsed["errors"])[:6]:
        st.markdown(f'<div class="diag-line">{diag_tag("BLOCK")}  {e}</div>', unsafe_allow_html=True)
else:
    st.markdown(f'<div class="diag-line">{diag_tag("WARN")}  no source loaded</div>', unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# 02 · SCOPE — AST-derived, provider-checked. No cards, no toggles that
# rewrite the program.
# ---------------------------------------------------------------------------

section("02", "scope")
st.markdown(
    '<div class="stage-note">Capabilities are read from the AST, not selected here. A checkbox in this '
    'section can never add or remove a `collect` statement.</div>',
    unsafe_allow_html=True,
)

unsupported = provider_unsupported(parsed["collections"], st.session_state.provider)

st.markdown(
    '<div class="scope-row"><b></b><b>capability</b><b>status</b><b>provider</b></div>',
    unsafe_allow_html=True,
)
for cap, desc in CAPABILITIES.items():
    requested = cap in parsed["collections"]
    mark = "✓" if requested else "·"
    status = "requested" if requested else "—"
    if requested:
        provider_status = diag_tag("BLOCK") + " unsupported" if cap in unsupported else diag_tag("PASS")
    else:
        provider_status = '<span class="tag-pending">--</span>'
    st.markdown(
        f'<div class="scope-row"><span>{mark}</span><span class="cap-name">{cap}</span>'
        f'<span class="cap-desc">{status}</span><span>{provider_status}</span></div>',
        unsafe_allow_html=True,
    )
    if requested and cap not in unsupported:
        pass  # description intentionally omitted from the row to stay dense

st.caption(" · ".join(f"{c}: {d}" for c, d in list(CAPABILITIES.items())[:0]) or "hover source line for capability semantics; see language reference for full definitions.")

add_col, rem_col = st.columns(2)
with add_col:
    addable = [c for c in CAPABILITIES if c not in parsed["collections"]]
    if addable:
        chosen_add = st.selectbox("add collect statement", addable, key="add_capability_select")
        if st.button("add to source", key="add_capability_button"):
            st.session_state.source = add_collect_to_source(st.session_state.source, chosen_add)
            st.session_state.execution = None
            st.rerun()
with rem_col:
    removable = [c for c in parsed["collections"] if c in CAPABILITIES]
    if removable:
        chosen_rm = st.selectbox("remove collect statement", removable, key="rm_capability_select")
        if st.button("remove from source", key="rm_capability_button"):
            st.session_state.source = remove_collect_from_source(st.session_state.source, chosen_rm)
            st.session_state.execution = None
            st.rerun()

# ---------------------------------------------------------------------------
# 03 · CONFIGURE
# ---------------------------------------------------------------------------

section("03", "configure")

preset_choice = st.radio(
    "preset (flags evidence-format / integrity — never rewrites source)",
    list(PRESETS.keys()), index=list(PRESETS.keys()).index(st.session_state.preset),
    horizontal=True, key="preset_radio",
)
if preset_choice != st.session_state.preset:
    st.session_state.preset = preset_choice
    data = PRESETS[preset_choice]
    if preset_choice != "custom":
        st.session_state.evidence_format = data["evidence"]
        st.session_state.integrity = bool(data["integrity"])
    st.rerun()
st.caption(PRESETS[st.session_state.preset]["intent"])

c1, c2 = st.columns(2)
with c1:
    platforms = ["Linux", "Windows"]
    current_platform = st.session_state.get("target_platform", "Windows" if os.name == "nt" else "Linux")
    if current_platform not in platforms:
        current_platform = "Linux"
    platform_idx = platforms.index(current_platform)
    st.selectbox("target platform", platforms, index=platform_idx, key="target_platform")
    if st.session_state.target_platform == "Windows":
        st.session_state.provider = "Native Windows Provider"
    else:
        st.session_state.provider = "Native Linux Provider"
    st.selectbox("execution provider", [st.session_state.provider], key="provider_view", disabled=True)
    st.selectbox("execution mode", ["Native / Local", "Analysis Only"], key="runtime_mode")
with c2:
    st.selectbox("evidence output", ["Canonical + STIX", "Canonical"], key="evidence_format")
    st.checkbox("cryptographic integrity / sealing", key="integrity")
    st.checkbox("air-gapped package metadata", key="air_gapped")

# ---------------------------------------------------------------------------
# 04 · VERIFY / EXECUTE
# ---------------------------------------------------------------------------

section("04", "verify / execute")
st.markdown(
    '<div class="stage-note">verify runs pre-flight only. execute compiles, lowers, invokes the native '
    'provider, collects and seals evidence, and shows the real output — nothing here is simulated.</div>',
    unsafe_allow_html=True,
)

if not st.session_state.source.strip():
    st.markdown(f'<div class="diag-line">{diag_tag("WARN")}  no source to verify or execute</div>', unsafe_allow_html=True)

v_col, x_col = st.columns([1, 2])
with v_col:
    if st.button("verify", key="verify_button", use_container_width=True):
        st.session_state.dry_run_report = preflight(st.session_state.source)
with x_col:
    run_disabled = not st.session_state.source.strip() or bool(lint_errors)
    if st.button("execute investigation", key="execute_button", type="primary", use_container_width=True, disabled=run_disabled):
        report = preflight(st.session_state.source)
        st.session_state.dry_run_report = report
        if not report["ready"]:
            st.markdown(f'<div class="diag-line">{diag_tag("BLOCK")}  pre-flight failed; fix blocking checks below before executing</div>', unsafe_allow_html=True)
        else:
            st.session_state.execution = execute_investigation(st.session_state.source)
            st.rerun()

if st.session_state.dry_run_report:
    st.markdown('<div class="panel">', unsafe_allow_html=True)
    for check in st.session_state.dry_run_report["checks"]:
        st.markdown(
            f'<div class="diag-line">{diag_tag(check["status"])}  {check["name"]:<28} {check["detail"]}</div>',
            unsafe_allow_html=True,
        )
    st.markdown('</div>', unsafe_allow_html=True)

execution = st.session_state.execution
summary = evidence_summary(execution) if execution and execution.get("ok") else None

st.markdown("**pipeline**")
st.markdown('<div class="panel">', unsafe_allow_html=True)
for stage, state in pipeline_state(parsed, lint_errors, execution, summary):
    st.markdown(f'<div class="diag-line">{stage_tag(state)}  {stage}</div>', unsafe_allow_html=True)
st.markdown('</div>', unsafe_allow_html=True)

if execution:
    st.markdown("**execution log**")
    log = (execution.get("stdout") or "") + "\n" + (execution.get("stderr") or "")
    st.code(log.strip() or "(no output captured)", language="text")
    if not execution.get("ok"):
        st.markdown(f'<div class="diag-line">{diag_tag("BLOCK")}  execution failed — return code {execution.get("returncode")}</div>', unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# 05 / 06 / 07 — only rendered once an execution actually produced data.
# ---------------------------------------------------------------------------

if execution and execution.get("ok") and summary:

    section("05", "report")
    st.markdown(
        '<div class="stage-note">populated strictly from execution output — nothing below is estimated.</div>',
        unsafe_allow_html=True,
    )

    st.code(
        "\n".join([
            f"collections          : {len(parsed['collections'])}",
            f"relationships        : {len(parsed['correlations'])}",
            f"evidence_artifacts   : {summary['artifact_count']}",
            f"sealed_hashed        : {summary['hash_count']}",
            f"stix_objects         : {summary['stix_objects']}",
            f"chain_of_custody     : {'present' if summary['coc_present'] else 'not exposed'}",
            f"forensic_ir          : {'present' if summary['ir_present'] else 'not found'}",
            f"execution_utc        : {execution.get('timestamp', '—')}",
            f"return_code          : {execution.get('returncode', '—')}",
            f"runtime              : {find_runtime() or 'not found'}",
        ]),
        language="text",
    )

    requested = set(parsed["collections"])
    observed: set[str] = set()
    raw = summary.get("raw")
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict):
                value = item.get("canonical_type") or item.get("collection") or item.get("type")
                if value:
                    value = str(value).replace("evidence_", "")
                    if value in requested:
                        observed.add(value)
    elif isinstance(raw, dict):
        blob = json.dumps(raw)
        for cap in requested:
            if cap in blob:
                observed.add(cap)

    st.code(
        "\n".join([
            f"requested            : {len(requested)}",
            f"observed_in_output   : {len(observed)}",
            f"not_directly_observed: {max(0, len(requested - observed))}",
        ]) + (
            "\n(raw artifact format exposed no per-item labels for a direct match; no coverage score inferred)"
            if requested and not observed else ""
        ),
        language="text",
    )

    relationships = collect_relationships(parsed)
    if relationships:
        st.markdown("**relationship graph**")
        graph_lines = ["digraph G {", "rankdir=LR;", 'bgcolor="transparent";']
        for a, b in relationships:
            graph_lines.append(f'"{a}" -> "{b}" [dir=both, label="relationship"];')
        graph_lines.append("}")
        st.graphviz_chart("\n".join(graph_lines), use_container_width=True)

    report_md = build_report_markdown(execution, parsed, summary)
    d1, d2, d3 = st.columns(3)
    with d1:
        st.download_button("report.md", data=report_md, file_name="mahoraga-investigation.md", mime="text/markdown", use_container_width=True)
    with d2:
        payload = summary["sealed"] if summary["sealed"] is not None else summary["raw"]
        st.download_button(
            "evidence.json", data=json.dumps(payload, indent=2, default=str),
            file_name="mahoraga-evidence.json", mime="application/json", use_container_width=True,
        )
    with d3:
        if summary["instructions"] is not None:
            st.download_button(
                "forensic_ir.json", data=json.dumps(summary["instructions"], indent=2),
                file_name="forensic_ir.json", mime="application/json", use_container_width=True,
            )
        else:
            st.caption("forensic_ir.json unavailable")

    with st.expander("raw / sealed / stix artifacts"):
        tabs = st.tabs(["raw", "sealed", "stix"])
        for tab, value in zip(tabs, [summary["raw"], summary["sealed"], summary["stix"]]):
            with tab:
                st.json(value) if value is not None else st.caption("not available")

    section("06", "package")
    st.markdown(
        '<div class="stage-note">bundles source, forensic IR, evidence, STIX output, hashes and the '
        'available native runtime binary into a transport ZIP.</div>',
        unsafe_allow_html=True,
    )
    if st.button("build investigation package", key="build_package", type="primary"):
        st.session_state.package_bytes = make_package(st.session_state.source, st.session_state.air_gapped, include_runtime=True)
    if st.session_state.package_bytes:
        st.download_button(
            "download mahoraga-investigation.zip", data=st.session_state.package_bytes,
            file_name="mahoraga-investigation.zip", mime="application/zip", key="download_package",
        )

    section("07", "verification")
    test_rows = [
        ("jocky_parser", not lint_errors, "no live-lint errors"),
        ("ast_capability_sync", all(c in CAPABILITIES for c in parsed["collections"]), "every collection maps to a known capability"),
        ("relationship_refs", all(a in parsed["aliases"] and b in parsed["aliases"] for a, b in parsed["correlations"]), "every correlate endpoint resolves"),
        ("runtime_execution", bool(execution.get("ok")), "native runtime completed"),
        ("evidence_output", bool(execution.get("artifacts")), "evidence artifacts discovered"),
        ("cryptographic_sealing", (summary["hash_count"] > 0) if st.session_state.integrity else True, "hashes present when integrity enabled"),
    ]
    lines = [f"{'PASS' if ok else 'CHECK':<6} {name:<24} {detail}" for name, ok, detail in test_rows]
    st.code("\n".join(lines), language="text")
    passed = sum(1 for _, ok, _ in test_rows if ok)
    st.markdown(f'<div class="diag-line">{passed} / {len(test_rows)} checks passed</div>', unsafe_allow_html=True)

st.markdown('<div class="footer">mahoraga · jocky forensic analysis language · authorized laboratory use only</div>', unsafe_allow_html=True)