import argparse
import argparse
import argparse
import sys
from pathlib import Path
from .parser import parse_source
from .validator import SemanticValidator
from .lower import lower_to_ir
from .types import ValidationError
from .lowering.passes import apply_passes
from .lowering.lower import lower_to_json
from .visualizer.graph import generate_ir_graph

def print_ir(module):
    print(f"MODULE {module.name}\n")
    for op in module.operations:
        op_type = type(op).__name__
        if op_type == "CollectOp":
            print(f"  OP collect.{op.operation}")
            print(f"      capability: {op.capability}\n")
        elif op_type == "CorrelateOp":
            print("  OP correlate\n")
        elif op_type == "SealEvidenceOp":
            print("  OP evidence.seal\n")
        elif op_type == "EmitReportOp":
            print(f"  OP emit.{op.target}\n")

def main():
    parser = argparse.ArgumentParser(description="Odin/JOCKY Compiler Frontend")
    parser.add_argument("command", choices=["compile"])
    parser.add_argument("file", help="Path to .jocky source")
    parser.add_argument("--emit-ir", action="store_true", help="Print the generated IR")
    parser.add_argument("--graph",action="store_true",help="Generate a PNG visualization of the optimized Forensic IR",)
    parser.add_argument("--out", help="Output JSON path", default="out/instructions/payload.json")
    args = parser.parse_args()

    if args.command == "compile":
        try:
            with open(args.file, "r") as f:
                source = f.read()

            # Phase 1 & 2: Parse, Validate, Lower to IR
            ast = parse_source(source)
            validator = SemanticValidator()
            validator.validate(ast)
            ir_module = lower_to_ir(ast)
            
            # Phase 3: Optimize and lower to JSON contract
            optimized_ir = apply_passes(ir_module)

            if args.emit_ir:
                print_ir(optimized_ir)
            else:
                out_path = Path(args.out)
                lower_to_json(optimized_ir, out_path)
                print(f"Lowered instruction contract written to {out_path}")

            if args.graph:
                graph_path = Path(".dev/graphs") / f"{Path(args.file).stem}.png"
                generate_ir_graph(optimized_ir, graph_path)
                print(f"Forensic IR graph written to {graph_path}")
                
        except ValidationError as e:
            print(f"Validation Error: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
