Markdown Live Preview
Open
Copy
Export PDF
Reset

491490489488487486485493494495496497498499500501502503504505506507508509510511483484482480481476477478479469470471472473474475465466467468460461462463464457458459454455456451452453450449492
| `out/evidence/<name>_stix.json` | Detection and STIX-oriented output |

The precise contents depend on the investigation and runtime execution. Generated files should remain untracked unless there is a specific reason to version an artifact.

---

# Evidence Integrity

Evidence is treated as a first-class output of the investigation pipeline.

Mahoraga Logo
# Mahoraga
Compiler-driven digital forensics with a cross-platform execution model.

Mahoraga is a digital forensics framework built around Jocky, a domain-specific language (DSL) for expressing forensic investigation workflows.

Jocky source is parsed, validated, and lowered into a custom Forensic Intermediate Representation (IR). The compiled instructions are transformed into a runtime payload and executed by Mahoraga's native C++ runtime. Collected evidence can then be cryptographically sealed and processed by the detection engine to generate investigation results and STIX-oriented JSON output.

Mahoraga brings together a forensic DSL, compiler pipeline, native execution runtime, evidence integrity mechanisms, and an interactive forensic Workbench.

Jocky DSL: Express investigation intent through structured programs.
Compiler pipeline: Parse, validate, and lower investigations into a custom Forensic IR.
Native runtime: Dispatch compiled collection instructions to the runtime.
Evidence integrity: Generate SHA-256 integrity hashes and sealed evidence artifacts.
Detection and output: Evaluate supported detection rules and generate structured results.
Forensic Workbench: Configure, compile, and execute investigations through a browser-based interface.
Documentation

Demo
Watch the Mahoraga demonstration

Architecture
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
Payload Transformation
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
The Forensic IR is Mahoraga's own intermediate representation. Platform-specific collection depends on the capabilities implemented by the relevant native provider.

Why Jocky?
Forensic investigations often rely on operating-system-specific commands and collection tools. This can make investigation procedures harder to maintain, reproduce, and adapt across environments.

Jocky separates investigation intent from execution details. Investigators describe the evidence they want to collect, while Mahoraga's compiler and runtime handle validation, instruction generation, and execution.

For example:

investigation "Endpoint Triage" {
    collect system_info as sys
    collect process_list as procs
}
This describes the requested collection workflow without embedding the implementation details of each collection operation in the investigation itself.

Design principles
Declarative investigation intent: Describe collection requirements in Jocky.
Compiler-driven execution: Translate validated programs into a custom Forensic IR.
Explicit capability validation: Check requested capabilities against the compiler's supported contract.
Evidence integrity: Generate cryptographic hashes and sealed evidence artifacts.
Structured output: Produce machine-readable investigation results for downstream analysis.
Reproducibility: Keep investigation programs version-controlled and reviewable.
Cross-platform reuse depends on the capabilities implemented for the target operating system. It does not imply that every investigation can execute unchanged on every platform.

Features
Features
Jocky Language and Compiler
Custom domain-specific language for forensic investigations.
Lexer, parser, and Abstract Syntax Tree (AST).
Semantic and capability validation.
Lowering into a custom Forensic IR.
Compiled instruction contract for runtime execution.
Native Runtime
C++ runtime for executing compiled instructions.
Runtime dispatch for supported collection operations.
Platform-specific provider architecture.
Evidence Integrity
Structured evidence artifacts.
SHA-256 integrity hashing.
Evidence sealing and integrity metadata.
Machine-readable evidence output.
Detection and Investigation Results
Rule-driven analysis of supported evidence types.
Authentication-log analysis and SSH brute-force detection example.
Structured investigation summaries.
STIX-oriented JSON bundle generation.
Forensic Workbench
Browser-based Jocky editor.
Capability insertion controls.
Pre-flight validation and compilation workflow.
Investigation execution and pipeline telemetry.
Evidence and output inspection.
Platform Support
Mahoraga uses a native C++ runtime and a provider-based architecture for platform-specific collection.

Component	Status
Jocky compiler and custom Forensic IR	Shared compilation model
Native C++ runtime	Requires a platform-compatible build
Linux collection provider	Linux-specific implementation
Windows collection provider	Windows-specific implementation
Individual collection capabilities	Availability depends on the provider and target platform
The availability of a capability should be verified against the corresponding provider implementation. A shared Jocky program does not guarantee identical collection behavior or support across operating systems.

Build and test the native runtime for the intended target before running an investigation. Some operations may also require elevated privileges or access to operating-system resources.

Repository Structure
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
Prerequisites
Linux
Python 3.12+
Node.js 20+
GCC or Clang with C++17 support
CMake 3.14+
Git
Windows
Python 3.12+
Node.js 20+
Visual Studio / MSVC with C++ support
CMake 3.14+
Git
Optional
Docker
Docker Compose
Docker is only required when using the containerized deployment workflow.

Local Development
1. Clone the repository
git clone <repository-url> mahoraga
cd mahoraga
2. Create the Python virtual environment
Linux
python3 -m venv .venv
source .venv/bin/activate
Windows
python -m venv .venv
.venv\Scripts\activate
3. Install Python dependencies
With the virtual environment activated:

pip install -r backend/requirements.txt
4. Start the CMI backend
After activating the virtual environment, start the FastAPI CMI service:

uvicorn cmi.server:app --host 0.0.0.0 --port 8000
The service exposes:

CMI API       http://localhost:8000
Health        http://localhost:8000/health
API Docs      http://localhost:8000/docs
Keep this process running while using the browser-based Workbench.

Frontend Development
Open a second terminal from the repository root.

cd frontend
npm install
npm run dev
The Vite development server normally runs at:

http://localhost:5173
The frontend communicates with the CMI backend through the configured API/proxy settings.

Native Runtime
Mahoraga uses a native C++ runtime for forensic capability execution.

Linux
mkdir -p build
cd build
cmake ..
make -j$(nproc)
cd ..
Windows
mkdir build
cd build
cmake ..
cmake --build . --config Release
cd ..
The generated runtime is used by the Mahoraga execution pipeline.

Jocky Forensic Workbench
The Workbench provides an interactive interface for authoring and executing investigations.

Workflow
Step 1 - Investigation Configuration
Select the target platform and prepare the investigation.

Step 2 - Pre-Flight Analysis
The Jocky source is checked before compilation.

Step 3 - Compilation
The investigation is compiled into the Forensic IR/instruction contract.

Step 4 - Forensic Execution
The CMI backend executes the investigation through the native runtime.

Step 5 - Evidence & Detection
Collected evidence, integrity information, and STIX output can be inspected.

Live Jocky Editing
A new investigation starts with an empty editor.

The editor provides a lightweight placeholder:

//Paste your Jocky code here...
The Insert Capability controls provide a guided starting point.

When the editor is empty, selecting a capability creates a complete investigation:

investigate endpoint {
    collect system_info as sys
}
After the investigation exists, additional capabilities can be inserted at the current cursor position:

investigate endpoint {
    collect system_info as sys
    collect process_list as procs
    collect network_connections as conns
}
This allows investigators to start from a single capability without having to remember the complete Jocky block syntax.

Jocky Examples
Example investigations are provided under library/.

library/
├── brute_force_hunt.jocky
├── deep_persistence_hunt.jocky
├── edr_blinding_hunt.jocky
├── exfiltration_monitor.jocky
├── lateral_movement_trace.jocky
├── stealth_host_sweep.jocky
└── triage_host_baseline.jocky
A minimal investigation:

investigate endpoint {
    collect system_info as sys
}
A multi-capability investigation:

investigate endpoint {
    collect system_info as sys
    collect process_list as procs
    collect users as local_users
    collect network_connections as conns
}
CLI Usage
Run commands from the repository root on a compatible environment with the Python dependencies installed and the native runtime built.

Execute an investigation
./mahoraga library/triage_host_baseline.jocky
Generate the Forensic IR graph
./mahoraga library/brute_force_hunt.jocky --graph
Generate the investigation-results graph
./mahoraga library/brute_force_hunt.jocky --results
Generate both visualizations
./mahoraga library/brute_force_hunt.jocky --graph --results
The wrapper runs the compilation, payload transformation, native execution, evidence sealing, and detection stages. The --graph and --results options request additional visualizations.

Generated artifacts
The pipeline writes generated files under out/:

Path	Purpose
out/instructions/<name>.json	Compiled instruction contract
out/instructions/<name>.enc	Transformed runtime payload
out/evidence/raw_evidence.json	Raw runtime evidence
out/evidence/<name>_sealed.json	Sealed evidence output
out/evidence/<name>_stix.json	Detection and STIX-oriented output
The precise contents depend on the investigation and runtime execution. Generated files should remain untracked unless there is a specific reason to version an artifact.

Evidence Integrity
Evidence is treated as a first-class output of the investigation pipeline.

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
The sealing stage produces integrity information that can be used to detect subsequent modification of the generated evidence artifact.

STIX 2.1
Mahoraga can transform investigation results into standardized STIX 2.1 JSON bundles.

Generated bundles are stored at:

out/evidence/<inv_id>_stix.json
The Workbench exposes the resulting detection and STIX state through the CMI interface.

Docker
A containerized development/deployment workflow is available through Docker Compose.

From the repository root:

docker-compose up --build
The exact service ports are defined in docker-compose.yml.

Typical development endpoints are:

Frontend       http://localhost:5173
CMI Backend    http://localhost:8000
API Docs       http://localhost:8000/docs
For active compiler/runtime development, the local workflow is generally more convenient because the native runtime can be built directly for the host platform.

Development Workflow
For a typical change:

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
Backend
source .venv/bin/activate
uvicorn cmi.server:app --host 0.0.0.0 --port 8000
Frontend
cd frontend
npm run dev
Investigation Library
The library/ directory contains example Jocky investigations:

File	Focus
brute_force_hunt.jocky	Authentication-log analysis and brute-force detection demonstration
deep_persistence_hunt.jocky	Persistence-oriented investigation
edr_blinding_hunt.jocky	Investigation of suspicious activity affecting endpoint visibility
exfiltration_monitor.jocky	Exfiltration-oriented investigation
lateral_movement_trace.jocky	Lateral-movement investigation
stealth_host_sweep.jocky	Host-discovery and suspicious-activity investigation
triage_host_baseline.jocky	Baseline endpoint triage
These names describe the intended focus of each example, not a guarantee that every associated detection or collection capability is fully implemented.

Example
./mahoraga library/brute_force_hunt.jocky
To generate the compiler graph and investigation-results visualization:

./mahoraga library/brute_force_hunt.jocky --graph --results
Demo note: When --results is used with brute_force_hunt.jocky, the current demo workflow uses a simulated SSH brute-force scenario to demonstrate a positive detection. The regular pipeline still collects and seals host evidence; the positive demonstration result is generated from the separate simulated scenario.

A zero-finding result on real evidence is valid when the configured detection rule does not match the collected events.

Design Principles
Compiler-Driven Forensics
Investigators express forensic intent through a dedicated language rather than directly implementing platform-specific collection logic.

Intent / Execution Separation
Jocky describes what to investigate. Native providers implement how that investigation is performed on the target operating system.

Cross-Platform Execution
The compiler and IR provide a common investigation model while native providers handle platform-specific execution.

Evidence Integrity
Evidence sealing is part of the execution pipeline rather than an optional post-processing step.

Standardized Output
STIX 2.1 provides a standardized representation for downstream threat-intelligence workflows.

Explicit Validation
Investigation capabilities are validated before execution so unsupported or invalid operations can be rejected before reaching the native runtime.

