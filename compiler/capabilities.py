from enum import Enum, auto
from typing import List

class Capability(Enum):
    ProcessRead = auto()
    NetworkRead = auto()
    FileMetadataRead = auto()
    MemoryRead = auto()
    KernelAccess = auto()
    NetworkEgress = auto()

class ExecutionContext(Enum):
    ReadOnly = auto()
    Privileged = auto()
    Kernel = auto()
    Network = auto()

OPERATION_REQUIREMENTS = {
    "process_list": [Capability.ProcessRead],
    "network_connections": [Capability.NetworkRead],
    "file_metadata": [Capability.FileMetadataRead],
    "memory_snapshot": [Capability.MemoryRead],
    "kernel_callbacks": [Capability.KernelAccess],
}