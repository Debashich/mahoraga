import hashlib
import json

def compute_sha256(data: dict) -> str:
    """Compute a deterministic SHA-256 hash of a dictionary."""
    # Sort keys to ensure deterministic hashing of JSON objects
    serialized = json.dumps(data, sort_keys=True, separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(serialized).hexdigest()