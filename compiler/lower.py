from .ast import Investigation, Collect, Correlate, Emit, Detect
from .ir.module import Module
from .ir.operations import (
    CollectOp,
    CorrelateOp,
    SealEvidenceOp,
    EmitReportOp,
    DetectOp,
)

def lower_to_ir(ast: Investigation) -> Module:
    ops = []
    for stmt in ast.statements:
        stmt_type = type(stmt).__name__
        
        if stmt_type == "Collect":
            ops.append(CollectOp(operation=stmt.operation, target_var=stmt.alias))
        elif stmt_type == "Correlate":
            ops.append(CorrelateOp(source=stmt.source,target=stmt.target))
            ops.append(SealEvidenceOp()) 
        elif stmt_type == "Emit":
            ops.append(EmitReportOp(target=stmt.target))
        elif stmt_type == "Detect":
            ops.append(
                DetectOp(
                    rule_name=stmt.rule_name,
                    params=stmt.params,
                )
            )
    return Module(name=ast.name, operations=ops)    