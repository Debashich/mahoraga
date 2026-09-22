import argparse
import sys
from pprint import pprint
from .parser import parse_source

def main():
    parser = argparse.ArgumentParser(description="Odin/JOCKY Compiler Frontend")
    parser.add_argument("command", choices=["compile"], help="Action to perform")
    parser.add_argument("file", help="Path to the .jocky source file")
    args = parser.parse_args()

    if args.command == "compile":
        try:
            with open(args.file, "r") as f:
                source = f.read()
            
            ast = parse_source(source)
            print("Parsing successful\n")
            print("AST generated:")
            print(f"Investigation: {ast.name}")
            print("Operations:")
            for stmt in ast.statements:
                if type(stmt).__name__ == "Collect":
                    print(f"  - collect {stmt.operation}" + (f" as {stmt.alias}" if stmt.alias else ""))
                elif type(stmt).__name__ == "Correlate":
                    print(f"  - correlate {', '.join(stmt.aliases)}")
                elif type(stmt).__name__ == "Emit":
                    print(f"  - emit {stmt.target}")
                else:
                    print(f"  - {type(stmt).__name__.lower()}")
                    
        except Exception as e:
            print(f"Compilation failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()