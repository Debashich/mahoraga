from dataclasses import dataclass
from typing import List
from .operations import IROp

@dataclass
class Module:
    name: str
    operations: List[IROp]