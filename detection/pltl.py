from enum import Enum

class PLTLState(Enum):
    START = 0
    CONDITION_A_MET = 1
    MATCHED = 2

class TemporalFSM:
    """Evaluates 'A SINCETRUE B' sequences over an evidence timeline."""
    def __init__(self, cond_a_rule, cond_b_rule):
        self.state = PLTLState.START
        self.cond_a = cond_a_rule
        self.cond_b = cond_b_rule
        self.matched_artifacts = []

    def process_artifact(self, artifact: dict) -> bool:
        if self.state == PLTLState.START:
            if self.cond_a(artifact):
                self.state = PLTLState.CONDITION_A_MET
                self.matched_artifacts.append(artifact)
        elif self.state == PLTLState.CONDITION_A_MET:
            if self.cond_b(artifact):
                self.state = PLTLState.MATCHED
                self.matched_artifacts.append(artifact)
                return True
        return False