from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Node:
    pass

@dataclass
class Collect(Node):
    operation: str
    alias: Optional[str]

@dataclass
class Correlate:
    source: str
    target: str

@dataclass
class Emit(Node):
    target: str

@dataclass
class Detect(Node):
    rule_name: str
    params: dict

@dataclass
class Investigation(Node):
    name: str
    statements: List[Node]