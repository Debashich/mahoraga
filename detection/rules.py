def rule_brute_force(artifact, params):
    if artifact.get("type") != "auth_logs":
        return False

    data = artifact.get("data", {})

    if not isinstance(data, dict):
        return False

    logs = data.get("logs", [])

    if not isinstance(logs, list):
        return False

    try:
        threshold = int(params.get("threshold", 5))
    except (TypeError, ValueError):
        threshold = 5

    failed_attempts = 0

    failure_markers = (
        "authentication failure",
        "failed password",
        "authentication failed",
        "failed login",
        "invalid user",
    )

    for entry in logs:
        if not isinstance(entry, dict):
            continue

        raw = entry.get("raw", "")

        if not isinstance(raw, str):
            continue

        raw_lower = raw.lower()

        if any(marker in raw_lower for marker in failure_markers):
            failed_attempts += 1

    return failed_attempts >= threshold


ACTIVE_RULES = {
    "brute_force": rule_brute_force,
}