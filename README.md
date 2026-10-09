<div align="center">
  <img src="assets/moharaga.png" alt="Mahoraga Logo" width="200" />
</div>

# Mahoraga

**Compiler-driven digital forensics with a cross-platform execution model.**

Mahoraga is a digital forensics framework built around **Jocky**, a domain-specific language (DSL) for expressing forensic investigation workflows.

Jocky source is parsed, validated, and lowered into a custom **Forensic Intermediate Representation (IR)**. The compiled instructions are transformed into a runtime payload and executed by Mahoraga's native C++ runtime. Collected evidence can then be cryptographically sealed and processed by the detection engine to generate investigation results and STIX-oriented JSON output.

Mahoraga brings together a forensic DSL, compiler pipeline, native execution runtime, evidence integrity mechanisms, and an interactive forensic Workbench.

- **Jocky DSL:** Express investigation intent through structured programs.
- **Compiler pipeline:** Parse, validate, and lower investigations into a custom Forensic IR.
- **Native runtime:** Dispatch compiled collection instructions to the runtime.
- **Evidence integrity:** Generate SHA-256 integrity hashes and sealed evidence artifacts.
- **Detection and output:** Evaluate supported detection rules and generate structured results.
- **Forensic Workbench:** Configure, compile, and execute investigations through a browser-based interface.

[Documentation](https://jocky.devloper.xyz/)

## Demo

[Watch the Mahoraga demonstration](https://github.com/user-attachments/assets/56a9aa97-fb87-4603-be3b-88f70d457c89)

## Architecture

```text
Jocky Source
     |
     v
Lexer / Parser / AST
     |
     v
Semantic Validation
     |
     v
Custom Forensic IR
     |
     v
Runtime Payload Generation
     |
     v
Native C++ Runtime
     |
     v
Collection and Dispatch
     |
     v
Raw Evidence
     |
     v
Evidence Sealing
     |
     v
Detection Engine
     |
     v
Structured Results / STIX Output
```

The Forensic IR is Mahoraga's own intermediate representation. Platform-specific collection depends on the capabilities implemented by the relevant native provider.

---

## Why Jocky?

Forensic investigations often rely on operating-system-specific commands and collection tools. This can make investigation procedures harder to maintain, reproduce, and adapt across environments.

Jocky separates **investigation intent from execution details**. Investigators describe the evidence they want to collect, while Mahoraga's compiler and runtime handle validation, instruction generation, and execution.

For example:

```jocky
investigation "Endpoint Triage" {
    collect system_info as sys
    collect process_list as procs
}
```

This describes the requested collection workflow without embedding the implementation details of each collection operation in the investigation itself.

### Design principles

- **Declarative investigation intent:** Describe collection requirements in Jocky.
- **Compiler-driven execution:** Translate validated programs into a custom Forensic IR.
- **Explicit capability validation:** Check requested capabilities against the compiler's supported contract.
- **Evidence integrity:** Generate cryptographic hashes and sealed evidence artifacts.
- **Structured output:** Produce machine-readable investigation results for downstream analysis.
- **Reproducibility:** Keep investigation programs version-controlled and reviewable.

Cross-platform reuse depends on the capabilities implemented for the target operating system. It does not imply that every investigation can execute unchanged on every platform.

# Features

## Features

### Jocky Language and Compiler
- Custom domain-specific language for forensic investigations.
- Lexer, parser, and Abstract Syntax Tree (AST).
- Semantic and capability validation.
- Lowering into a custom Forensic IR.
- Compiled instruction contract for runtime execution.

### Native Runtime
- C++ runtime for executing compiled instructions.
- Runtime dispatch for supported collection operations.
- Platform-specific provider architecture.

### Evidence Integrity
- Structured evidence artifacts.
- SHA-256 integrity hashing.
- Evidence sealing and integrity metadata.
- Machine-readable evidence output.

### Detection and Investigation Results
- Rule-driven analysis of supported evidence types.
- Authentication-log analysis and SSH brute-force detection example.
- Structured investigation summaries.
- STIX-oriented JSON bundle generation.

### Forensic Workbench
- Browser-based Jocky editor.
- Capability insertion controls.
- Pre-flight validation and compilation workflow.
- Investigation execution and pipeline telemetry.
- Evidence and output inspection.

---

# Platform Support

Mahoraga uses separate native providers for Linux and Windows. Jocky provides a shared investigation language, while capability availability depends on the target operating system and the implemented provider.

| Capability / Interface | Linux | Windows |
|---|:---:|:---:|
| `system_info` | Supported* | Supported* |
| `process_list` | Supported* | Supported* |
| `network_connections` | Supported* | Supported* |
| `users` | Supported* | Supported* |
| `auth_logs` | Supported* | Platform-specific |
| Linux `/proc` interfaces | Supported | N/A |
| Linux Netlink interfaces | Supported | N/A |
| Windows native APIs | N/A | Supported |

\* Confirm availability against the current native provider implementation before treating these capabilities as fully supported.

Platform-specific capabilities must only be requested against compatible targets. Capability validation should reject unsupported operations before execution.

The shared investigation model separates forensic intent from operating-system-specific collection mechanisms, allowing investigations to be reused across platforms where their required capabilities are implemented.

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

Mahoraga uses a native C++ runtime to execute compiled forensic investigations through platform-specific providers.

## Linux

From the repository root:

```bash
cmake -S . -B build
cmake --build build -j"$(nproc)"
```

## Windows

From the repository root, using a configured Visual Studio C++ toolchain:

```powershell
cmake -S . -B build
cmake --build build --config Release
```

The generated runtime binary is consumed by the Mahoraga execution pipeline. Its exact path and filename depend on the CMake target configuration.

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
## CLI Usage

Run commands from the repository root on a compatible environment with the Python dependencies installed and the native runtime built.

### Execute an investigation

```bash
./mahoraga library/triage_host_baseline.jocky
```

### Generate the Forensic IR graph

```bash
./mahoraga library/brute_force_hunt.jocky --graph
```

### Generate the investigation-results graph

```bash
./mahoraga library/brute_force_hunt.jocky --results
```

### Generate both visualizations

```bash
./mahoraga library/brute_force_hunt.jocky --graph --results
```

The wrapper runs the compilation, payload transformation, native execution, evidence sealing, and detection stages. The `--graph` and `--results` options request additional visualizations.

### Generated artifacts

The pipeline writes generated files under `out/`:

| Path | Purpose |
|---|---|
| `out/instructions/<name>.json` | Compiled instruction contract |
| `out/instructions/<name>.enc` | Transformed runtime payload |
| `out/evidence/raw_evidence.json` | Raw runtime evidence |
| `out/evidence/<name>_sealed.json` | Sealed evidence output |
| `out/evidence/<name>_stix.json` | Detection and STIX-oriented output |

The precise contents depend on the investigation and runtime execution. Generated files should remain untracked unless there is a specific reason to version an artifact.

---

# Evidence Integrity

Evidence integrity is a core part of the Mahoraga investigation pipeline.

The workflow processes collected evidence, computes integrity hashes, and produces sealed evidence artifacts for subsequent inspection.

```text
Native Provider
      |
      v
Raw Evidence
      |
      v
Canonicalization
      |
      v
SHA-256 Integrity Hash
      |
      v
Sealed Evidence Artifact
      |
      v
STIX 2.1 Output
```

SHA-256 hashes can be used to detect changes to evidence when compared against a trusted, previously recorded hash. Hashing alone does not establish the identity of the collector or prevent tampering with both the evidence and its recorded hash.

The integrity guarantees of the generated artifacts depend on the implemented canonicalization, hashing, sealing, and verification mechanisms.

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
# Jocky Investigation Library

Mahoraga includes ready-to-use Jocky investigation scripts covering endpoint triage, persistence, process and network activity, lateral movement, and suspicious behavior.

| Library File | Investigation Focus |
|---|---|
| `library/brute_force_hunt.jocky` | Brute-force investigation |
| `library/deep_persistence_hunt.jocky` | Persistence investigation |
| `library/edr_blinding_hunt.jocky` | Investigation of potential EDR interference |
| `library/exfiltration_monitor.jocky` | Potential data-exfiltration activity |
| `library/lateral_movement_trace.jocky` | Lateral-movement investigation |
| `library/stealth_host_sweep.jocky` | Host discovery and suspicious activity |
| `library/triage_host_baseline.jocky` | Baseline endpoint triage |

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

Run an example from the repository root:

```bash
./mahoraga library/triage_host_baseline.jocky
```

On Windows, use the corresponding executable path and Windows-compatible command syntax.

The available investigations and their execution results depend on the capabilities implemented by the selected native provider.

### Example

```bash
./mahoraga library/brute_force_hunt.jocky
```

To generate the compiler graph and investigation-results visualization:

```bash
./mahoraga library/brute_force_hunt.jocky --graph --results
```

**Demo note:** When `--results` is used with `brute_force_hunt.jocky`, the current demo workflow uses a simulated SSH brute-force scenario to demonstrate a positive detection. The regular pipeline still collects and seals host evidence; the positive demonstration result is generated from the separate simulated scenario.

A zero-finding result on real evidence is valid when the configured detection rule does not match the collected events.

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
