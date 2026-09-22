from typing import Set
from .ast import Investigation, Collect, Correlate, Emit
from .capabilities import Capability, OPERATION_REQUIREMENTS
from .types import ValidationError

class SemanticValidator:
    def __init__(self, provider_capabilities: Set[Capability] = None):
        # If no provider constraints are given, assume all capabilities for testing
        self.provider_capabilities = provider_capabilities or set(Capability)
        self.declared_vars: Set[str] = set()

    def validate(self, ast: Investigation):
        for stmt in ast.statements:
            stmt_type = type(stmt).__name__
            
            if stmt_type == "Collect":
                self._validate_capabilities(stmt.operation)
                if stmt.alias:
                    if stmt.alias in self.declared_vars:
                        raise ValidationError(f"Alias '{stmt.alias}' already declared.")
                    self.declared_vars.add(stmt.alias)
                    
            elif stmt_type == "Correlate":
                for alias in stmt.aliases:
                    if alias not in self.declared_vars:
                        raise ValidationError(f"Undefined reference: '{alias}'")
                self.declared_vars.add("correlated_bundle")
                
            elif stmt_type == "Emit":
                pass # Emits act on the global bundle or specific target in this phase

    def _validate_capabilities(self, operation: str):
        reqs = OPERATION_REQUIREMENTS.get(operation, [])
        for req in reqs:
            if req not in self.provider_capabilities:
                raise ValidationError(
                    f"Capability mismatch: Target provider lacks {req.name} required for '{operation}'"
                )