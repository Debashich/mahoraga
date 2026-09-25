# Mahoraga Setup & Contributor Guide

Mahoraga is a cross-platform forensic compiler and orchestration framework built around a custom domain-specific language (Jocky). It compiles forensic instructions into a language-independent Forensic IR, executes them through native C++ providers, preserves collected evidence through cryptographic sealing, and produces standardized STIX 2.1 threat-intelligence output.

## Architecture Overview

The Mahoraga pipeline consists of four primary stages:

1. **Compiler (Python):** Lexes and parses the Jocky DSL into an Abstract Syntax Tree (AST), validates semantics, and lowers the program into a JSON Instruction Contract (Forensic IR).

2. **Payload Encapsulation & Native Runtime (Python + C++):** The generated IR is transformed into an encrypted binary payload before execution. The native C++ runtime reads the payload, extracts its per-payload key material, decrypts the IR in memory, parses the resulting instruction contract, and dispatches execution to the appropriate native provider.

3. **Evidence Sealing (Python):** Collected evidence is cryptographically hashed and sealed into an integrity-preserving evidence bundle suitable for maintaining chain-of-custody information.

4. **Threat Intelligence Engine (Python):** Processes the resulting evidence and generates a standardized STIX 2.1 intelligence bundle.

### Execution Flow

```text
Jocky Source
     │
     ▼
Python Compiler
     │
     ▼
Forensic IR (.json)
     │
     ▼
Payload Obfuscator
     │
     ▼
Encrypted Payload (.enc)
     │
     ▼
Native C++ Runtime
     │
     ├── Read encrypted payload
     ├── Extract key material
     ├── Decrypt IR in memory
     ├── Parse Instruction Contract
     └── Dispatch to native provider
              │
              ▼
        Raw Evidence
              │
              ▼
       Evidence Sealing
              │
              ▼
       STIX 2.1 Bundle
```

The plaintext IR remains available as a compiler artifact for downstream analysis and detection processing, while the native execution path consumes the encrypted payload.

## Prerequisites

Ensure your development environment has the following installed:

- **Python:** 3.12+
- **C++ Compiler:** GCC or Clang with C++17 support
- **CMake:** 3.14+
- **Make:** GNU Make
- **Git:** Required for repository development

## 1. Environment Setup

Clone the repository and create a Python virtual environment.

```bash
git clone <repository-url> mahoraga
cd mahoraga

python3 -m venv .venv
source .venv/bin/activate
```

## 2. Python Dependencies

Install the dependencies required by the compiler, detection engine, evidence pipeline, and Workbench UI.

```bash
pip install lark streamlit streamlit-ace
```

If additional dependencies are introduced by individual modules, install them according to the corresponding module documentation.

## 3. Building the C++ Runtime

The native runtime is built through CMake.

```bash
mkdir -p build
cd build

cmake ..
make

cd ..
```

The build should produce:

```text
build/mahoraga-run
```

The CMake configuration is responsible for making the required C++ JSON dependency available to the runtime.

## Project Structure

```text
mahoraga/
├── build/                       # Compiled native runtime (generated)
│   └── mahoraga-run
│
├── cmi/                         # Central Management Interface backend
│   └── server.py
│
├── compiler/                    # Jocky compiler and Forensic IR
│   ├── ast.py                   # AST definitions
│   ├── capabilities.py          # Capability definitions
│   ├── parser.py                # Parser / AST generation
│   ├── types.py                 # Compiler types
│   ├── validator.py             # Semantic validation
│   ├── lower.py                 # IR lowering
│   ├── obfuscator.py            # Encrypted payload generation
│   │
│   ├── ir/                      # Forensic IR
│   │   ├── module.py
│   │   ├── operations.py
│   │   └── types.py
│   │
│   ├── lowering/                # IR lowering passes
│   │   ├── lower.py
│   │   └── passes.py
│   │
│   └── mlir/                    # MLIR representation and passes
│       ├── dialect.py
│       └── passes.py
│
├── detection/                   # Threat hunting / STIX engine
│   ├── engine.py
│   ├── pltl.py
│   ├── rules.py
│   └── stix.py
│
├── evidence/                    # Evidence hashing and sealing
│   ├── hashing.py
│   ├── schema.py
│   └── sealing.py
│
├── examples/                    # Jocky programs and test cases
│
├── language/                    # Jocky language definition
│   └── grammar.lark
│
├── runtime/                     # Native C++ runtime
│   ├── core/
│   │   ├── Dispatcher.cpp
│   │   ├── Dispatcher.hpp
│   │   ├── Runtime.cpp
│   │   └── Runtime.hpp
│   │
│   ├── main.cpp
│   │
│   └── providers/
│       ├── common/
│       │   └── Provider.hpp
│       ├── linux/
│       │   ├── LinuxProvider.cpp
│       │   └── LinuxProvider.hpp
│       └── windows/
│           ├── WindowsProvider.cpp
│           └── WindowsProvider.hpp
│
├── tests/                       # Compiler / validator tests
│   ├── test_parser.py
│   └── test_validator.py
│
├── tools/                       # Development / verification tools
│   └── verify_seal.py
│
├── out/                         # Generated pipeline artifacts (ignored)
├── build/                       # Generated native build (ignored)
│
├── CMakeLists.txt               # Native build configuration
├── mahoraga                     # CLI pipeline wrapper
├── workbench.py                 # Streamlit Workbench UI
├── pyproject.toml               # Python project configuration
├── package.json                 # Node/project tooling metadata
├── package-lock.json
├── uv.lock
├── .gitignore
└── README.md
```

## Running Mahoraga

### CLI Mode

The `mahoraga` wrapper executes the complete investigation pipeline.

```bash
./mahoraga examples/test.jocky
```

The execution pipeline is:

```text
[1/4] Compile Jocky → Forensic IR
      ↓
      Encrypt / encapsulate IR
      ↓
      Generate .enc payload

[2/4] Execute encrypted payload
      ↓
      Native C++ runtime
      ↓
      In-memory IR decryption
      ↓
      Native provider execution

[3/4] Cryptographically seal evidence

[4/4] Generate STIX 2.1 bundle
```

Generated artifacts are written under:

```text
out/
├── instructions/
│   ├── <name>.json
│   └── <name>.enc
│
└── evidence/
    ├── raw_evidence.json
    ├── <name>_sealed.json
    └── <name>_stix.json
```

### Workbench UI

Launch the Central Management Interface with:

```bash
streamlit run workbench.py
```

The interface is available locally at:

```text
http://localhost:8501
```

The Workbench provides a visual interface for authoring and inspecting Jocky investigations and interacting with the Mahoraga pipeline.

## Current Roadmap & Next Steps

The core Mahoraga architecture and Phases 1–14 are complete. The remaining development is focused on remote evidence transport, cross-platform native execution, and the final standard library and demonstration.

### Phase 15 — Remote Evidence Transport

**Status: Remaining**

Extend Mahoraga with controlled remote evidence transport and orchestration.

Planned work:

- Define a Jocky-level evidence transport abstraction.
- Add authenticated remote transport.
- Support configurable HTTP/API backends.
- Extend the Workbench for remote investigation orchestration.
- Preserve evidence integrity during transport.

### Phase 16 — Cross-Platform Native Providers

**Status: Remaining**

Extend native execution beyond the current Linux provider.

Planned work:

- Implement the Windows native provider.
- Add Windows-specific system and network collection capabilities.
- Maintain the same provider interface across operating systems.
- Update CMake for platform-specific compilation.
- Add Windows integration tests.

Target architecture:

```text
                 Forensic IR
                     │
                 Dispatcher
                /         \
               ▼           ▼
        LinuxProvider   WindowsProvider
             │               │
             ▼               ▼
       Linux APIs       Windows APIs
```

### Phase 17 — Standard Library & Master Demonstration

**Status: Remaining**

Deliver the canonical Jocky standard-library examples and final end-to-end demonstration.

Planned examples:

```text
examples/
├── stealth_host_sweep.jocky
├── brute_force_hunt.jocky
└── lateral_movement_trace.jocky
```

The final demonstration will showcase:

- Jocky authoring
- Platform-independent Forensic IR
- Encrypted payload generation
- Native runtime execution
- Evidence collection
- Evidence sealing
- Threat detection
- STIX 2.1 generation
- Cross-platform provider architecture

## Contributor Workflow

Before submitting changes:

```bash
# Activate environment
source .venv/bin/activate

# Rebuild native runtime
cd build
make
cd ..

# Run an example investigation
./mahoraga examples/test.jocky
```

When modifying the compiler, verify that:

```text
Jocky source
    ↓
AST
    ↓
Forensic IR
    ↓
Encrypted payload
    ↓
Native runtime
```

continues to function correctly.

When modifying native providers, verify that the same Forensic IR contract can still be dispatched without changing the compiler's platform-independent representation.

## Design Principles

Mahoraga is built around several core architectural principles:

- **Language-independent IR:** The compiler should not encode platform-specific execution logic into the DSL.
- **Native execution:** Providers should use native operating-system interfaces where practical.
- **Provider abstraction:** Platform-specific collection logic belongs behind a common provider interface.
- **Evidence integrity:** Collected artifacts should remain verifiable throughout the investigation pipeline.
- **Separation of concerns:** Compilation, execution, evidence handling, and threat intelligence remain separate pipeline stages.
- **Cross-platform architecture:** The same Jocky program should target different native providers through the shared Forensic IR.
- **Reproducible development:** Compiler and runtime changes should be testable independently before being exercised through the complete pipeline.