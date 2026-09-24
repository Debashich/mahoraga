# Mahoraga Setup & Contributor Guide

Mahoraga is a cross-platform, Orchestration-as-a-Service (OaaS) forensic compiler framework designed to systematically analyze malicious activities without triggering endpoint security solutions. It utilizes a custom domain-specific language (Jocky), lowers it into a language-independent intermediate representation (Forensic IR), and executes data collection natively via a C++ engine to bypass behavioral EDR heuristics.

## Architecture Overview

The pipeline consists of four distinct trust boundaries:

1. **Compiler (Python):** Lexes and parses the Jocky DSL into an Abstract Syntax Tree (AST), validates relational semantics, and lowers it into a JSON Instruction Contract (Forensic IR).
2. **Native Provider (C++):** Executes the IR natively. Parses system files (`/proc`, etc.) and memory directly without spawning noisy child processes (like `netstat` or `cat`).
3. **Evidence Sealing (Python):** Cryptographically hashes and seals the collected evidence into an immutable chain of custody.
4. **Threat Intelligence Engine (Python):** Correlates findings and generates a standard STIX 2.1 intelligence bundle.

## Prerequisites

Ensure your development environment has the following installed:

* **Python:** 3.12+ (for the compiler, evidence sealing, and detection engine).
* **C++ Compiler:** GCC or Clang with C++17 support.
* **CMake:** Version 3.14 or higher.
* **Make:** Standard GNU Make.

## 1. Environment Setup

Clone the repository and set up your Python virtual environment.

```bash
# Navigate to your workspace and clone the repository
git clone <repository-url> mahoraga
cd mahoraga

# Create and activate a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

```

## 2. Python Dependencies

Install the required packages for the parser, threat-hunting engine, and the visual Workbench UI.

```bash
# Install core dependencies and UI libraries
pip install lark streamlit streamlit-ace

```

## 3. Building the C++ Runtime

The C++ engine (`mahoraga-run`) requires a clean CMake build. It automatically fetches `nlohmann_json` during configuration.

```bash
# Create the build directory
mkdir build
cd build

# Generate build configurations and compile
cmake ..
make

# Return to the project root
cd ..

```

*Verify the build:* Ensure the executable `mahoraga-run` exists inside the `build/` directory.

## Project Structure

```text
mahoraga/
├── build/               # Compiled C++ binaries (mahoraga-run)
├── compiler/            # Python Jocky parser (Lark grammar & AST transformers)
├── detection/           # Threat hunting engine (STIX 2.1 generator)
├── evidence/            # Cryptographic sealing and hashing logic
├── examples/            # Canonical .jocky scripts and test cases
├── out/                 # Pipeline output (Instructions, Raw Evidence, Sealed, STIX)
├── runtime/             # C++ Source Code
│   ├── core/            # Dispatcher and IR parsers
│   └── providers/       # Native execution endpoints (LinuxProvider.cpp)
├── workbench.py         # Streamlit UI (Central Management Interface)
└── mahoraga             # Bash executable wrapper for the CLI pipeline

```

## Running Mahoraga

### CLI Mode (Headless)

To run a forensic investigation directly from the terminal, use the bash wrapper script. This will push the investigation through all four pipeline stages and write the output to the `out/` directory.

```bash
./mahoraga examples/test.jocky

```

### Workbench UI (Central Management Interface)

To launch the Orchestration-as-a-Service (OaaS) dashboard, run the Streamlit application. This provides a visual pipeline inspector, a live code editor, and the ability to package investigations for deployment.

```bash
streamlit run workbench.py

```

The interface will automatically open in your default browser at `http://localhost:8501`.

## Current Roadmap & Next Steps

We are currently transitioning from foundational system engineering to active threat hunting and C2 evasion.

* **Completed:** Core Compiler, C++ Linux Provider, Relational Semantics, and the Workbench UI.
* **Phase 13 (Active):** Building the `detect` block into the Jocky DSL and Python engine for threshold-based threat hunting.
* **Phase 14:** Implementing Polymorphic IR (AES-256 encryption between the compiler and C++ engine).
* **Phase 15:** Cloud API C2 Routing (transmitting evidence via trusted CDNs/APIs).
* **Phase 16:** Developing the Windows native provider using Win32 APIs.