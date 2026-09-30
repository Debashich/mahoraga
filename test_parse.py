from compiler.parser import parse_source

src1 = """
investigate endpoint {
collect system_info as sys
}
"""
print(parse_source(src1))

src2 = """
investigation "Triage" {
collect process_list
}
"""
print(parse_source(src2))
