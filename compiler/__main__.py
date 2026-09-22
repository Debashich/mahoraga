import argparse
import sys
from .parser import parse_source
from .validator import SemanticValidator
from .lower import lower_to_ir
from .types import ValidationError

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
    args = parser.parse_args()

    if args.command == "compile":
        try:
            with open(args.file, "r") as f:
                source = f.read()

            ast = parse_source(source)
            
            validator = SemanticValidator()
            validator.validate(ast)
            
            ir_module = lower_to_ir(ast)

            if args.emit_ir:
                print_ir(ir_module)
            else:
                print("Compilation successful (AST -> VALID -> IR)")

        except ValidationError as e:
            print(f"Validation Error: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()