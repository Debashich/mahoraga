from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class JockyProcess:
    pid: str
    command: str
    provider: str

@dataclass
class JockyNetwork:
    raw_entry: str
    provider: str