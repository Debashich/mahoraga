def rule_suspicious_process(artifact):
    data = artifact.get("data", {})

    if not isinstance(data, dict):
        return False

    cmd = data.get("cmd", "")

    if not isinstance(cmd, str):
        return False

    cmd = cmd.lower()

    suspicious = [
        "powershell",
        "cmd.exe",
        "whoami",
        "mimikatz",
        "nc ",
        "netcat",
    ]

    return any(keyword in cmd for keyword in suspicious)


ACTIVE_RULES = {
    "suspicious_process": rule_suspicious_process,
}