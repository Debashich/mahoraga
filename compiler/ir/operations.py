from dataclasses import dataclass
from typing import List, Optional
from .types import IROp
from ..capabilities import Capability, OPERATION_REQUIREMENTS

@dataclass
class CollectOp(IROp):
    operation: str
    target_var: Optional[str]
    
    @property
    def capability(self) -> str:
        reqs = OPERATION_REQUIREMENTS.get(self.operation, [])
        return reqs[0].name if reqs else "None"

@dataclass
class CorrelateOp(IROp):
    source: str
    target: str

@dataclass
class SealEvidenceOp(IROp):
    pass

@dataclass
class EmitReportOp(IROp):
    target: str

@dataclass
class DetectOp(IROp):
    rule_name: str
    params: dict