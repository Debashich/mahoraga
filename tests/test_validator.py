import pytest
from compiler.parser import parse_source
from compiler.validator import SemanticValidator
from compiler.capabilities import Capability
from compiler.types import ValidationError

def test_undefined_reference():
    source = """
    investigation "Test" {
        collect process_list as procs
        correlate procs with missing_var
    }
    """
    ast = parse_source(source)
    validator = SemanticValidator()
    with pytest.raises(ValidationError, match="Undefined reference: 'missing_var'"):
        validator.validate(ast)

def test_capability_rejection():
    source = """
    investigation "Test Cap" {
        collect kernel_callbacks
    }
    """
    ast = parse_source(source)
    # Simulate a provider that only has ProcessRead, no KernelAccess
    validator = SemanticValidator(provider_capabilities={Capability.ProcessRead})
    with pytest.raises(ValidationError, match="Target provider lacks KernelAccess"):
        validator.validate(ast)

def test_valid_flow():
    source = """
    investigation "Host Analysis" {
        collect process_list as processes
        collect network_connections as networks
        correlate processes with networks
    }
    """
    ast = parse_source(source)
    validator = SemanticValidator()
    validator.validate(ast) 