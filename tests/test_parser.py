import pytest
from lark.exceptions import LarkError
from compiler.parser import parse_source
from compiler.ast import Investigation, Collect, Correlate, Emit

def test_valid_investigation():
    source = """
    investigation "Test Auth" {
        collect file_metadata as files
        emit report
    }
    """
    ast = parse_source(source)
    assert isinstance(ast, Investigation)
    assert ast.name == "Test Auth"
    assert len(ast.statements) == 2
    assert isinstance(ast.statements[0], Collect)
    assert ast.statements[0].operation == "file_metadata"
    assert ast.statements[0].alias == "files"
    assert isinstance(ast.statements[1], Emit)
    assert ast.statements[1].target == "report"

def test_full_pipeline():
    source = """
    investigation "Host Analysis" {
        collect process_list as processes
        collect network_connections as networks
        correlate processes, networks
        emit evidence
    }
    """
    ast = parse_source(source)
    assert len(ast.statements) == 4
    assert isinstance(ast.statements[2], Correlate)
    assert ast.statements[2].aliases == ["processes", "networks"]

def test_invalid_syntax_fails():
    source = """
    investigation "Bad" {
        collect invalid_operation
    }
    """
    with pytest.raises(LarkError):
        parse_source(source)