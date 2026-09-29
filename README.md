# Mahoraga Setup & Contributor Guide

Mahoraga is an enterprise-grade forensic compiler and orchestration framework built around a custom domain-specific language (**Jocky**). It compiles forensic intent into a language-independent Forensic IR, lowerable into a custom MLIR dialect, executes operations via cross-platform C++ native providers (Linux & Windows), preserves collected evidence through cryptographic sealing, and produces standardized STIX 2.1 threat-intelligence output.

---

## Architecture Overview

The Mahoraga pipeline consists of four primary operational stages:

1. **Compiler & MLIR Dialect (Python):** Lexes and parses the Jocky DSL into an Abstract Syntax Tree (AST), performs substructural type enforcement and capability validation, and lowers the program into a JSON Instruction Contract (Forensic IR).
2. **Polymorphic Encapsulation & Native Runtime (Python + C++):** The generated IR is transformed into a unique AES-256-XOR encrypted binary payload per compilation instance. The native C++ runtime reads the payload, extracts key material in-memory, decrypts the IR, parses the instruction contract, and dispatches execution to native providers (Linux `/proc` & Netlink / Windows Win32 API & ETW).
3. **Cryptographic Evidence Sealing (Python):** Collected evidence is canonicalized, cryptographically hashed, and sealed using SHA-256 and Merkle Mountain Range (MMR) manifests to maintain chain-of-custody integrity.
4. **Threat Intelligence Engine (Python):** Evaluates behavioral sequences using Past-Time Linear Temporal Logic (PLTL) rules and outputs standardized STIX 2.1 JSON intelligence bundles.

### Execution Flow

```text
Jocky Source (.jocky)
     │
     ▼
Jocky Compiler / Semantic Validator
     │
     ▼
Forensic IR / MLIR Dialect (.json)
     │
     ▼
Polymorphic Obfuscator (AES-256-XOR)
     │
     ▼
Encrypted Payload (.enc)
     │
     ▼
Native C++ Runtime (mahoraga-run)
     │
     ├── In-Memory Decryption
     ├── Dynamic Syscall / API Resolution
     └── Dispatch to Native Provider
              │
              ├── Linux Provider  (/proc, Netlink, eBPF)
              └── Windows Provider (Win32, ETW, Toolhelp32)
              │
              ▼
        Raw Evidence
              │
              ▼
  Cryptographic Evidence Sealing (SHA-256 / MMR)
              │
              ▼
   STIX 2.1 Threat Intelligence Bundle

```

---

## Prerequisites

Ensure your development environment has the following installed:

* **Docker & Docker Compose:** Required for running the orchestration stack.
* **Node.js:** v20+ (for local frontend development)
* **Python:** 3.12+
* **C++ Compiler:** GCC/Clang with C++17 support or MSVC (Windows)
* **CMake:** 3.14+

---

## Quick Start (Dockerized Stack)

The fastest way to launch the full Mahoraga Central Management Interface (CMI) and FastAPI backend is via Docker Compose:

```bash
# Clone the repository
git clone <repository-url> mahoraga
cd mahoraga

# Build C++ runtime binaries locally (optional for host execution)
mkdir -p build && cd build
cmake .. && make -j$(nproc)
cd ..

# Spin up the FastAPI backend and TSX Command Center UI
docker-compose up --build

```

Access the **Jocky Forensic Workbench** at:

* **Frontend Command Center:** `http://localhost:5173` (or `http://localhost:80`)
* **FastAPI CMI Backend:** `http://localhost:8000`
* **Interactive API Docs:** `http://localhost:8000/docs`

---

## Local Development & CLI Usage

### 1. Environment Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn cmi.server:app --host 0.0.0.0 --port 8000
```

### 2. Native Runtime Build

```bash
mkdir -p build && cd build
cmake ..
make -j$(nproc)
cd ..

```

This compiles the executable native runtime at `build/mahoraga-run`.

### 3. Running via CLI Pipeline

Execute a end-to-end investigation from the command line:

```bash
./mahoraga library/triage_host_baseline.jocky

```

Artifacts are automatically emitted to:

```text
out/
├── instructions/
│   ├── <inv_id>.json        # Plaintext Forensic IR
│   └── <inv_id>.enc         # Polymorphic Encrypted Payload
└── evidence/
    ├── raw_evidence.json    # Provider output
    ├── <inv_id>_sealed.json # SHA-256 sealed chain-of-custody
    └── <inv_id>_stix.json   # STIX 2.1 bundle

```

---

## Project Structure

```text
mahoraga/
├── docker-compose.yml           # Master orchestration container config
├── mahoraga                     # CLI pipeline wrapper script
├── CMakeLists.txt               # Native C++ build configuration
│
├── backend/                     # FastAPI CMI Backend Service
│   ├── Dockerfile
│   ├── requirements.txt
│   └── server.py                # REST API & Telemetry endpoints
│
├── frontend/                    # Vite + React (TSX) Command Center UI
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx
│       ├── api/cmiClient.js     # Backend client communication
│       ├── components/
│       │   ├── JockyEditorPanel.jsx
│       │   ├── PipelineStatusPanel.jsx
│       │   └── ResultSummaryCard.jsx
│       └── pages/
│           └── WorkbenchPage.jsx
│
├── compiler/                    # Jocky Compiler & MLIR Lowering
│   ├── ast.py                   # Abstract Syntax Tree definitions
│   ├── capabilities.py          # Effect & Capability validation
│   ├── lower.py                 # Forensic IR lowering passes
│   ├── obfuscator.py            # AES-256-XOR polymorphic encryptor
│   ├── parser.py                # Lark-based DSL parser
│   └── validator.py             # Substructural type & capability validator
│
├── detection/                   # PLTL Detection & STIX 2.1 Serialization
│   ├── engine.py
│   ├── pltl.py
│   ├── rules.py
│   └── stix.py
│
├── evidence/                    # Cryptographic Sealing & MMR Hashes
│   ├── hashing.py
│   ├── schema.py
│   └── sealing.py
│
├── library/                     # Standard Library (`std`) Jocky Scripts
│   ├── brute_force_hunt.jocky
│   ├── deep_persistence_hunt.jocky
│   ├── edr_blinding_hunt.jocky
│   ├── exfiltration_monitor.jocky
│   ├── lateral_movement_trace.jocky
│   ├── stealth_host_sweep.jocky
│   └── triage_host_baseline.jocky
│
├── runtime/                     # Native C++ Execution Engine
│   ├── main.cpp
│   ├── core/
│   │   ├── Dispatcher.cpp       # Payload decryption & router
│   │   └── Runtime.cpp
│   └── providers/
│       ├── linux/               # Linux native provider (/proc, Netlink)
│       │   └── LinuxProvider.cpp
│       └── windows/             # Windows native provider (Win32, ETW)
│           └── WindowsProvider.cpp
│
└── out/                         # Pipeline build output artifacts (git-ignored)

```

---

## Jocky Standard Library (`std`)

Mahoraga ships with pre-compiled standard library scripts mapping directly to MITRE ATT&CK techniques:

| Library File | Target Tactic | Key Capabilities & Metrics |
| --- | --- | --- |
| `library/triage_host_baseline.jocky` | Discovery (**TA0007**) | Process & socket correlation, Shannon entropy memory analysis ($H(X) > 7.2$). |
| `library/edr_blinding_hunt.jocky` | Defense Evasion (**TA0005**) | BYOVD detection, kernel callback array audit (`PspCreateProcessNotifyRoutine`). |
| `library/lateral_movement_trace.jocky` | Lateral Movement (**TA0008**) | Subnet session mapping, sliding $10\text{s}$ credential-stuffing detection window. |
| `library/exfiltration_monitor.jocky` | Exfiltration (**TA0010**) | Outbound process byte monitoring ($>500\text{MB}$ threshold), staging archive detection. |
| `library/deep_persistence_hunt.jocky` | Persistence (**TA0003**) | WMI permanent event consumers (`CommandLineEventConsumer`), IFEO registry hooks. |

---

## Design Principles

* **Compiler-Driven Forensics:** Investigators express platform-agnostic intent; the compiler decides safe, stealthy execution lowering.
* **Signature Immunity:** Every build produces a structurally unique, polymorphically encrypted binary payload with a distinct SHA-256 hash.
* **Zero-Shell Footprint:** Eliminates reliance on `cmd.exe`, `powershell.exe`, or subprocess spawns by utilizing direct native APIs.
* **Substructural Evidence Custody:** Enforces linear evidence consumption at compile-time to prevent accidental data dropping without sealing.
* **Standardized Intelligence:** Native serialization into STIX 2.1 bundles annotated with explicit MITRE ATT&CK IDs.