from dataclasses import dataclass, field
from typing import List, Dict, Any
from ..ir.module import Module as OdinModule

@dataclass
class MLIROp:
    name: str
    attributes: Dict[str, Any] = field(default_factory=dict)
    results: List[str] = field(default_factory=list)

@dataclass
class MLIRModule:
    name: str
    body: List[MLIROp] = field(default_factory=list)

def lower_odin_to_mlir(ir_module: OdinModule) -> MLIRModule:
    """Translates Odin IR into the custom MLIR Forensic Dialect."""
    mlir = MLIRModule(name=ir_module.name)
    
    for op in ir_module.operations:
        op_type = type(op).__name__
        if op_type == "CollectOp":
            mlir.body.append(MLIROp(
                name="forensic.collect",
                attributes={"target": op.operation, "capability": op.capability},
                results=[op.target_var or "anon"]
            ))
        elif op_type == "CorrelateOp":
            mlir.body.append(MLIROp(
                name="forensic.correlate",
                attributes={"inputs": op.input_vars},
                results=["correlated_bundle"]
            ))
        elif op_type == "SealEvidenceOp":
            mlir.body.append(MLIROp(
                name="evidence.seal",
                attributes={"target": "correlated_bundle"}
            ))
        elif op_type == "EmitReportOp":
            mlir.body.append(MLIROp(
                name="forensic.emit",
                attributes={"format": op.target}
            ))
    return mlir