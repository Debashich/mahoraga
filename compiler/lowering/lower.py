import json
from pathlib import Path

from ..mlir.dialect import MLIRModule


def lower_to_json(ir_module: MLIRModule, output_path: Path):
    instructions = []

    for op in ir_module.operations:
        op_type = type(op).__name__

        if op_type == "CollectOp":
            instructions.append(
                {
                    "type": "collect",
                    "operation": op.operation,
                    "capabilities": [op.capability],
                }
            )

        elif op_type == "CorrelateOp":
            instructions.append(
                {
                    "type": "correlate",
                    "inputs": op.input_vars,
                }
            )

        elif op_type == "EmitReportOp":
            instructions.append(
                {
                    "type": "emit",
                    "target": op.target,
                }
            )

    payload = {
        "module": ir_module.name,
        "instructions": instructions,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(payload, f, indent=2)