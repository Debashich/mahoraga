from pathlib import Path

from lark import Lark, Transformer

from .ast import Investigation, Collect, Correlate, Emit, Detect

GRAMMAR_PATH = Path(__file__).parent.parent / "language" / "grammar.lark"


class OdinTransformer(Transformer):

    def start(self, items):
        return items[0]

    def investigation(self, items):
        name = items[0].strip('"')
        statements = items[1:]

        return Investigation(
            name=name,
            statements=statements
        )

    def collect_stmt(self, items):
        operation = str(items[0])
        alias = str(items[1]) if len(items) > 1 else None

        return Collect(
            operation=operation,
            alias=alias
        )

    def correlate_stmt(self, items):
        return Correlate(
            source=str(items[0]),
            target=str(items[1])
        )

    def emit_stmt(self, items):
        target = str(items[0])

        return Emit(
            target=target
        )

    def detect_stmt(self, items):
        return Detect(
            condition_a=str(items[0]),
            condition_b=str(items[1])
        )


def parse_source(source_text: str) -> Investigation:

    with open(GRAMMAR_PATH, "r") as f:
        parser = Lark(
            f.read(),
            parser="lalr",
            start="start"
        )

    tree = parser.parse(source_text)

    return OdinTransformer().transform(tree)