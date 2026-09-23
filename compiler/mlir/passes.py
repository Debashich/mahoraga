from .dialect import MLIRModule, MLIROp

def pass_execution_strategy(module: MLIRModule) -> MLIRModule:
    """
    Compiler Pass: Execution Strategy Selection.
    Annotates collection operations with execution profiles (e.g., stealth/in-memory).
    """
    for op in module.body:
        if op.name == "forensic.collect":
            # For demonstration, we default to standard execution.
            # In a full build, this evaluates target EDR presence.
            op.attributes["exec_mode"] = "standard"
    return module

def pass_dead_code_elimination(module: MLIRModule) -> MLIRModule:
    """
    Compiler Pass: Dead Operation Elimination.
    Removes collections that are never correlated or emitted.
    """
    used_vars = set()
    for op in module.body:
        if op.name == "forensic.correlate":
            used_vars.update(op.attributes.get("inputs", []))

    optimized_body = []
    for op in module.body:
        if op.name == "forensic.collect":
            # If the collection result isn't used in correlation, drop it (semantic preservation)
            if any(res in used_vars for res in op.results) or not op.results:
                optimized_body.append(op)
        else:
            optimized_body.append(op)
            
    module.body = optimized_body
    return module

def apply_mlir_passes(module: MLIRModule) -> MLIRModule:
    module = pass_execution_strategy(module)
    module = pass_dead_code_elimination(module)
    return module