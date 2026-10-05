<div align="center">
  <img src="assets/moharaga.png" alt="Mahoraga Logo" width="200" />
</div>

# Mahoraga

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey)

**Compiler-driven digital forensics with a cross-platform execution model.**

Mahoraga is a forensic investigation and orchestration framework built around **Jocky**, a custom domain-specific language (DSL) for expressing forensic intent.

[Documentation is available at jocky.devloper.xyz](https://jocky.devloper.xyz/)

Jocky investigations are parsed, semantically validated, lowered into a platform-independent **Forensic IR**, and executed through native providers for **Linux and Windows**. Collected evidence is cryptographically sealed and can be transformed into standardized **STIX 2.1** threat-intelligence output.

The project combines a custom investigation language, compiler pipeline, native execution runtime, evidence integrity layer, and browser-based forensic Workbench into a single workflow.

---

## Demo Video

https://github.com/user-attachments/assets/56a9aa97-fb87-4603-be3b-88f70d457c89

---

## Core Workflow

```text
                    JOCKY DSL
                       │
                       ▼
              Lexer / Parser / AST
                       │
                       ▼
          Semantic & Capability Validation
                       │
                       ▼
                  Forensic IR
                       │
                       ▼
             Payload Encapsulation
                       │
                       ▼
              Native C++ Runtime
                       │
              ┌────────┴────────┐
              ▼                 ▼
        Linux Provider    Windows Provider
              │                 │
              └────────┬────────┘
                       ▼
                  Raw Evidence
                       │
                       ▼
             Cryptographic Sealing
                       │
                       ▼
                   STIX 2.1
```

### Investigation lifecycle

```text
Write Jocky
    ↓
Pre-Flight
    ↓
Compile
    ↓
Execute
    ↓
Evidence
    ↓
Detection / STIX
```

---

## Why Jocky?

Traditional forensic collection often couples investigation logic directly to the implementation details of a particular operating system or collection tool.

Jocky separates **investigation intent** from **platform-specific execution**.

For example:

```jocky
investigate endpoint {
    collect system_info as sys
    collect process_list as procs
    collect network_connections as conns
}
```

The investigation describes **what evidence is required**.

The native provider determines **how that evidence is collected on the target platform**.

This allows the same investigation model to be reused where the requested capabilities are supported on both operating systems.

---

# Expected Solution and Problem Addressed

Modern digital forensic investigations often depend on platform-specific collection tools, manually assembled commands, and tightly coupled execution logic. This makes investigations difficult to reproduce across operating systems and increases the complexity of maintaining consistent evidence-collection workflows.

Mahoraga addresses this by introducing a **compiler-driven forensic execution model**.

Jocky allows investigators to describe **what evidence should be collected** without directly encoding the operating-system-specific implementation required to obtain it.

The compiler and runtime architecture separates investigation intent from platform-specific execution. The same Jocky investigation can therefore be compiled into a common Forensic IR and executed through the appropriate native provider for the target operating system.

This provides several advantages:

- **Platform independence** — the same investigation intent can be represented across Linux and Windows.
- **Explicit validation** — unsupported capabilities can be identified before execution.
- **Separation of concerns** — investigation logic remains separate from platform-specific collection mechanisms.
- **Reproducible investigations** — forensic procedures can be represented as version-controlled Jocky programs.
- **Native execution** — platform providers can use operating-system-specific mechanisms without exposing those implementation details to investigators.
- **Evidence integrity** — collected artifacts are hashed and sealed as part of the execution pipeline.
- **Standardized output** — investigation results can be transformed into STIX 2.1 for downstream analysis and threat-intelligence workflows.

The result is a unified workflow connecting **forensic intent, compilation, native execution, evidence integrity, and standardized threat-intelligence output**.

---

# Features

### Jocky DSL

- Custom forensic investigation language
- Structured investigation blocks
- Collection capabilities
- Semantic and capability validation
- Platform-independent investigation intent

### Compiler Pipeline

- Lexer and parser
- Abstract Syntax Tree (AST)
- Semantic validation
- Capability resolution
- Forensic IR generation
- Native execution contract

### Native Execution

- C++ execution runtime
- Linux native provider
- Windows native provider
- Platform-specific collection implementations
- Native dispatch from the compiled instruction contract

### Evidence Integrity

- Structured evidence collection
- Canonicalized evidence artifacts
- SHA-256 integrity hashing
- Cryptographic evidence sealing
- Evidence manifests

### Threat Intelligence

- Investigation result processing
- Behavioral detection rules
- STIX 2.1 JSON output
- MITRE ATT&CK-oriented detection workflows where applicable

### Forensic Workbench

- Live Jocky editor
- Capability insertion controls
- Pre-flight validation
- Compilation workflow
- Native execution
- Pipeline telemetry
- Evidence inspection
- STIX output inspection

---

# Platform Support

Mahoraga supports both **Linux and Windows** through separate native providers.

The Jocky language is shared across platforms, but **not every capability is necessarily available on every platform**.

| Capability | Linux | Windows |
|---|:---:|:---:|
| `system_info` | ✓ | ✓ |
| `process_list` | ✓ | ✓ |
| `network_connections` | ✓ | ✓ |
| `users` | ✓ | ✓ |
| `auth_logs` | ✓ | Platform-specific |
| Linux `/proc` interfaces | ✓ | N/A |
| Linux Netlink interfaces | ✓ | N/A |
| Windows native APIs | N/A | ✓ |

Platform-specific capabilities should only be requested against a compatible target.

The compiler/runtime architecture intentionally keeps platform-specific collection behind native providers rather than exposing operating-system implementation details directly in Jocky.

---

# Repository Structure

```text
mahoraga/
│
├── mahoraga                     # CLI entry point
├── CMakeLists.txt               # Native runtime build
├── docker-compose.yml           # Containerized deployment
│
├── cmi/
│   └── server.py                # FastAPI CMI service
│
├── compiler/
│   ├── ast.py                   # AST definitions
│   ├── capabilities.py          # Capability validation
│   ├── lower.py                 # Forensic IR lowering
│   ├── obfuscator.py            # Payload transformation
│   ├── parser.py                # Jocky parser
│   └── validator.py             # Semantic validation
│
├── language/
│   └── grammar.lark             # Jocky grammar
│
├── runtime/
│   ├── main.cpp                 # Native runtime entry point
│   ├── core/
│   │   ├── Dispatcher.cpp       # Runtime dispatch
│   │   └── Runtime.cpp
│   └── providers/
│       ├── linux/
│       │   └── LinuxProvider.cpp
│       └── windows/
│           └── WindowsProvider.cpp
│
├── evidence/
│   ├── hashing.py
│   ├── schema.py
│   └── sealing.py
│
├── detection/
│   ├── engine.py
│   ├── pltl.py
│   ├── rules.py
│   └── stix.py
│
├── library/
│   └── *.jocky                  # Investigation examples
│
├── frontend/
│   ├── package.json
│   └── src/
│       ├── api/
│       │   └── cmiClient.js
│       ├── components/
│       │   └── workbench/
│       │       └── JockyEditorPanel.jsx
│       └── pages/
│           └── WorkbenchPage.jsx
│
├── backend/
│   ├── Dockerfile
│   └── requirements.txt
│
└── out/                         # Generated artifacts
```

---

# Prerequisites

### Linux

- Python 3.12+
- Node.js 20+
- GCC or Clang with C++17 support
- CMake 3.14+
- Git

### Windows

- Python 3.12+
- Node.js 20+
- Visual Studio / MSVC with C++ support
- CMake 3.14+
- Git

### Optional

- Docker
- Docker Compose

Docker is only required when using the containerized deployment workflow.

---

# Local Development

## 1. Clone the repository

```bash
git clone <repository-url> mahoraga
cd mahoraga
```

---

## 2. Create the Python virtual environment

### Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Windows

```powershell
python -m venv .venv
.venv\Scripts\activate
```

---

## 3. Install Python dependencies

With the virtual environment activated:

```bash
pip install -r backend/requirements.txt
```

---

## 4. Start the CMI backend

**After activating the virtual environment**, start the FastAPI CMI service:

```bash
uvicorn cmi.server:app --host 0.0.0.0 --port 8000
```

The service exposes:

```text
CMI API       http://localhost:8000
Health        http://localhost:8000/health
API Docs      http://localhost:8000/docs
```

Keep this process running while using the browser-based Workbench.

---

# Frontend Development

Open a second terminal from the repository root.

```bash
cd frontend
npm install
npm run dev
```

The Vite development server normally runs at:

```text
http://localhost:5173
```

The frontend communicates with the CMI backend through the configured API/proxy settings.

---

# Native Runtime

Mahoraga uses a native C++ runtime for forensic capability execution.

## Linux

```bash
mkdir -p build
cd build
cmake ..
make -j$(nproc)
cd ..
```

## Windows

```powershell
mkdir build
cd build
cmake ..
cmake --build . --config Release
cd ..
```

The generated runtime is used by the Mahoraga execution pipeline.

---

# Jocky Forensic Workbench

The Workbench provides an interactive interface for authoring and executing investigations.

## Workflow

### Step 1 - Investigation Configuration

Select the target platform and prepare the investigation.

### Step 2 - Pre-Flight Analysis

The Jocky source is checked before compilation.

### Step 3 - Compilation

The investigation is compiled into the Forensic IR/instruction contract.

### Step 4 - Forensic Execution

The CMI backend executes the investigation through the native runtime.

### Step 5 - Evidence & Detection

Collected evidence, integrity information, and STIX output can be inspected.

---

## Live Jocky Editing

A new investigation starts with an empty editor.

The editor provides a lightweight placeholder:

```text
//Paste your Jocky code here...
```

The **Insert Capability** controls provide a guided starting point.

When the editor is empty, selecting a capability creates a complete investigation:

```jocky
investigate endpoint {
    collect system_info as sys
}
```

After the investigation exists, additional capabilities can be inserted at the current cursor position:

```jocky
investigate endpoint {
    collect system_info as sys
    collect process_list as procs
    collect network_connections as conns
}
```

This allows investigators to start from a single capability without having to remember the complete Jocky block syntax.

---

# Jocky Examples

Example investigations are provided under `library/`.

```text
library/
├── brute_force_hunt.jocky
├── deep_persistence_hunt.jocky
├── edr_blinding_hunt.jocky
├── exfiltration_monitor.jocky
├── lateral_movement_trace.jocky
├── stealth_host_sweep.jocky
└── triage_host_baseline.jocky
```

A minimal investigation:

```jocky
investigate endpoint {
    collect system_info as sys
}
```

A multi-capability investigation:

```jocky
investigate endpoint {
    collect system_info as sys
    collect process_list as procs
    collect users as local_users
    collect network_connections as conns
}
```

---

# CLI Usage

Mahoraga can execute an investigation directly through the command-line pipeline.

## Linux

```bash
source .venv/bin/activate
./mahoraga library/triage_host_baseline.jocky
```

## Windows

```powershell
.venv\Scripts\activate
.\mahoraga library\triage_host_baseline.jocky
```

The exact set of capabilities available to an investigation depends on the target platform and the capabilities implemented by its native provider.

---

# Execution Pipeline

A successful investigation follows this general pipeline:

```text
Jocky Source
     │
     ▼
Compiler
     │
     ▼
Forensic IR
     │
     ▼
Payload Generation
     │
     ▼
Native Runtime
     │
     ▼
Native Provider
     │
     ▼
Raw Evidence
     │
     ▼
Evidence Sealing
     │
     ▼
STIX 2.1
```

The CMI exposes execution telemetry for the major runtime stages.

---

# Generated Artifacts

Investigation artifacts are written under `out/`.

```text
out/
├── instructions/
│   ├── <inv_id>.json
│   └── <inv_id>.enc
│
└── evidence/
    ├── raw_evidence.json
    ├── <inv_id>_sealed.json
    └── <inv_id>_stix.json
```

### Artifacts

| Artifact | Purpose |
|---|---|
| `<inv_id>.json` | Compiled Forensic IR / instruction contract |
| `<inv_id>.enc` | Runtime payload |
| `raw_evidence.json` | Native provider output |
| `<inv_id>_sealed.json` | Sealed evidence artifact |
| `<inv_id>_stix.json` | STIX 2.1 output |

Generated files under `out/` are not intended to be committed to the repository.

---

# Evidence Integrity

Evidence is treated as a first-class output of the investigation pipeline.

```text
Native Provider
      │
      ▼
Raw Evidence
      │
      ▼
Canonicalization
      │
      ▼
SHA-256 Integrity Hash
      │
      ▼
Sealed Evidence
      │
      ▼
STIX 2.1
```

The sealing stage produces integrity information that can be used to detect subsequent modification of the generated evidence artifact.

---

# STIX 2.1

Mahoraga can transform investigation results into standardized STIX 2.1 JSON bundles.

Generated bundles are stored at:

```text
out/evidence/<inv_id>_stix.json
```

The Workbench exposes the resulting detection and STIX state through the CMI interface.

---

# Docker

A containerized development/deployment workflow is available through Docker Compose.

From the repository root:

```bash
docker-compose up --build
```

The exact service ports are defined in `docker-compose.yml`.

Typical development endpoints are:

```text
Frontend       http://localhost:5173
CMI Backend    http://localhost:8000
API Docs       http://localhost:8000/docs
```

For active compiler/runtime development, the local workflow is generally more convenient because the native runtime can be built directly for the host platform.

---

# Development Workflow

For a typical change:

```text
1. Modify Jocky / compiler / runtime
              │
              ▼
2. Run validation
              │
              ▼
3. Build native runtime if required
              │
              ▼
4. Start CMI backend
              │
              ▼
5. Test through Workbench or CLI
              │
              ▼
6. Inspect evidence and STIX output
```

### Backend

```bash
source .venv/bin/activate
uvicorn cmi.server:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm run dev
```

---
## Jocky Standard Library

Mahoraga ships with a set of ready-to-run Jocky investigation scripts covering common endpoint, process, network, and suspicious-activity investigation workflows.

| **Library File** | **Investigation Focus** |
|---|---|
| `library/endpoint_triage.jocky` | Endpoint-level triage and host discovery |
| `library/host_and_network_investigation.jocky` | Host and network investigation |
| `library/process_network_correlation.jocky` | Process and network activity correlation |
| `library/suspicious_host_activity.jocky` | Investigation of suspicious endpoint activity |

These scripts can be executed directly through the Mahoraga CLI or loaded into the Jocky Forensic Workbench for inspection and modification.

### Example

```bash
./mahoraga library/endpoint_triage.jocky
```

Or load the script into the Workbench to inspect the Jocky investigation, run pre-flight validation, compile it, and execute it against the selected target platform.

The library is intended to provide practical starting points for investigations while demonstrating how multiple forensic capabilities can be composed through Jocky.

---
# Design Principles

### Compiler-Driven Forensics

Investigators express forensic intent through a dedicated language rather than directly implementing platform-specific collection logic.

### Intent / Execution Separation

Jocky describes **what to investigate**. Native providers implement **how that investigation is performed** on the target operating system.

### Cross-Platform Execution

The compiler and IR provide a common investigation model while native providers handle platform-specific execution.

### Evidence Integrity

Evidence sealing is part of the execution pipeline rather than an optional post-processing step.

### Standardized Output

STIX 2.1 provides a standardized representation for downstream threat-intelligence workflows.

### Explicit Validation

Investigation capabilities are validated before execution so unsupported or invalid operations can be rejected before reaching the native runtime.