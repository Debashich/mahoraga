from .ast import Investigation, Collect, Correlate, Emit
from .ir.module import Module
from .ir.operations import CollectOp, CorrelateOp, SealEvidenceOp, EmitReportOp

def lower_to_ir(ast: Investigation) -> Module:
    ops = []
    for stmt in ast.statements:
        stmt_type = type(stmt).__name__
        
        if stmt_type == "Collect":
            ops.append(CollectOp(operation=stmt.operation, target_var=stmt.alias))
        elif stmt_type == "Correlate":
            ops.append(CorrelateOp(input_vars=stmt.aliases))
            ops.append(SealEvidenceOp()) # Implicit seal upon correlation
        elif stmt_type == "Emit":
            ops.append(EmitReportOp(target=stmt.target))
            
    return Module(name=ast.name, operations=ops)