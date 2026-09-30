from compiler.parser import parse_source
from compiler.validator import SemanticValidator

src1 = """
investigate endpoint {
collect system_info as sys
}
"""
tree = parse_source(src1)
validator = SemanticValidator()
validator.validate(tree)
print("Validated!")
