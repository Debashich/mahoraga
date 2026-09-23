def rule_suspicious_process(artifact: dict) -> bool:
    if artifact["type"] == "process_list":
        cmd = artifact["data"].get("cmd", "").lower()
        suspicious_keywords = ["nc", "nmap", "netcat", "curl", "wget"]
        return any(kw in cmd for kw in suspicious_keywords)
    return False

# Simple registry of active rules
ACTIVE_RULES = {
    "T1059_SuspiciousCommand": rule_suspicious_process
}