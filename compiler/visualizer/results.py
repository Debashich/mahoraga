
import json
import subprocess
import sys
from pathlib import Path


def _escape(value):
    """Escape values for Graphviz DOT labels."""
    return (
        str(value)
        .replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
    )


def _truncate(text, max_len=60):
    """Truncate long strings for graph labels."""
    text = str(text)
    if len(text) > max_len:
        return text[:max_len - 3] + "..."
    return text


def _classify_stix_objects(objects):
    """Classify STIX bundle objects into meaningful categories."""
    indicators = []
    observed_data = []
    relationships = []
    raw_artifacts = []

    for obj in objects:
        if not isinstance(obj, dict):
            continue
        obj_type = obj.get("type", "")
        if obj_type == "indicator":
            indicators.append(obj)
        elif obj_type == "observed-data":
            observed_data.append(obj)
        elif obj_type == "relationship":
            relationships.append(obj)
        else:
            # Raw artifacts dumped by the detection engine (system_info,
            # process_list, network_connections, auth_logs, etc.)
            raw_artifacts.append(obj)

    return indicators, observed_data, relationships, raw_artifacts


def _summarize_artifact(artifact):
    """Build a human-readable summary of a single artifact/object."""
    art_type = artifact.get("type", "unknown")
    data = artifact.get("data", {})
    if not isinstance(data, dict):
        data = {}

    lines = []

    if art_type == "system_info":
        if data.get("hostname"):
            lines.append(f"Host: {data['hostname']}")
        if data.get("os"):
            lines.append(f"OS: {data['os']}")

    elif art_type == "process_list":
        processes = data.get("processes", [])
        count = len(processes) if isinstance(processes, list) else 0
        lines.append(f"{count} process entries")
        # Show first few process names
        if isinstance(processes, list):
            for proc in processes[:3]:
                if isinstance(proc, dict):
                    name = proc.get("name") or proc.get("comm", "")
                    pid = proc.get("pid", "")
                    if name:
                        lines.append(f"  {name} (pid {pid})" if pid else f"  {name}")
            if count > 3:
                lines.append(f"  ...and {count - 3} more")

    elif art_type == "network_connections":
        connections = data.get("connections", [])
        count = len(connections) if isinstance(connections, list) else 0
        lines.append(f"{count} connections")
        if isinstance(connections, list):
            for conn in connections[:3]:
                if isinstance(conn, dict):
                    remote = conn.get("remote_address") or conn.get("dst", "")
                    port = conn.get("remote_port") or conn.get("dport", "")
                    state = conn.get("state", "")
                    if remote:
                        entry = f"  {remote}:{port}" if port else f"  {remote}"
                        if state:
                            entry += f" ({state})"
                        lines.append(entry)
            if count > 3:
                lines.append(f"  ...and {count - 3} more")

    elif art_type == "auth_logs":
        logs = data.get("logs", [])
        count = len(logs) if isinstance(logs, list) else 0
        lines.append(f"{count} log entries")
        # Count failed vs successful
        if isinstance(logs, list):
            failed = sum(
                1 for e in logs
                if isinstance(e, dict)
                and any(
                    m in e.get("raw", "").lower()
                    for m in ("failure", "failed", "invalid")
                )
            )
            if failed:
                lines.append(f"  {failed} failed attempts")

    elif art_type == "file_hashes":
        hashes = data.get("hashes", data.get("files", []))
        count = len(hashes) if isinstance(hashes, list) else 0
        lines.append(f"{count} file hashes")

    elif art_type == "dns_cache":
        entries = data.get("entries", data.get("dns", []))
        count = len(entries) if isinstance(entries, list) else 0
        lines.append(f"{count} DNS entries")

    else:
        # Generic fallback: show keys and counts
        for key, value in data.items():
            if isinstance(value, list):
                lines.append(f"{key}: {len(value)} entries")
            elif isinstance(value, (str, int, float, bool)):
                lines.append(f"{key}: {_truncate(value, 40)}")

    return art_type, lines


def _print_text_summary(sealed, bundle):
    """Print a structured text summary of investigation results to stdout."""
    artifacts = sealed.get("sealed_artifacts", [])
    objects = bundle.get("objects", [])
    indicators, observed_data, relationships, raw_artifacts = (
        _classify_stix_objects(objects)
    )

    print()
    print("=" * 64)
    print("  INVESTIGATION RESULTS SUMMARY")
    print("=" * 64)
    print()

    # --- Evidence artifacts ---
    print(f"  SEALED EVIDENCE: {len(artifacts)} artifact(s)")
    print("  " + "-" * 40)
    for i, artifact in enumerate(artifacts, 1):
        if not isinstance(artifact, dict):
            continue
        art_type, details = _summarize_artifact(artifact)
        label = art_type.replace("_", " ").title()
        provider = artifact.get("provider", "")
        prov_str = f" [{provider}]" if provider else ""
        print(f"    {i}. {label}{prov_str}")
        for detail in details:
            print(f"       {detail}")
        digest = artifact.get("sha256", "")
        if digest:
            print(f"       SHA-256: {digest[:24]}...")
    print()

    # --- Detection findings ---
    print(f"  DETECTION FINDINGS: {len(indicators)} indicator(s)")
    print("  " + "-" * 40)
    if indicators:
        for i, ind in enumerate(indicators, 1):
            name = ind.get("name", "Unnamed")
            desc = ind.get("description", "")
            print(f"    {i}. {name}")
            if desc:
                print(f"       {desc}")
    else:
        print("    (no detection rules triggered)")
    print()

    # --- STIX observed data ---
    if observed_data:
        print(f"  OBSERVED DATA: {len(observed_data)} object(s)")
        print("  " + "-" * 40)
        for i, od in enumerate(observed_data, 1):
            first_observed = od.get("first_observed", "")
            last_observed = od.get("last_observed", "")
            obj_refs = od.get("object_refs", [])
            count = od.get("number_observed", len(obj_refs))
            print(f"    {i}. {count} observation(s)")
            if first_observed:
                print(f"       From: {first_observed}")
            if last_observed:
                print(f"       To:   {last_observed}")
        print()

    # --- STIX relationships ---
    if relationships:
        print(f"  RELATIONSHIPS: {len(relationships)} link(s)")
        print("  " + "-" * 40)
        for i, rel in enumerate(relationships, 1):
            src = rel.get("source_ref", "?")
            tgt = rel.get("target_ref", "?")
            rtype = rel.get("relationship_type", "related-to")
            print(f"    {i}. {_truncate(src, 30)} --[{rtype}]--> {_truncate(tgt, 30)}")
        print()

    # --- Raw artifacts in STIX bundle (not proper STIX types) ---
    if raw_artifacts:
        print(f"  RAW EVIDENCE IN STIX BUNDLE: {len(raw_artifacts)} object(s)")
        print("  " + "-" * 40)
        for i, ra in enumerate(raw_artifacts, 1):
            art_type, details = _summarize_artifact(ra)
            label = art_type.replace("_", " ").title()
            print(f"    {i}. {label}")
            for detail in details:
                print(f"       {detail}")
        print()

    print("=" * 64)
    print()


def generate_results_graph(sealed_path, stix_path, output_path,
                           open_image=True):
    sealed_path = Path(sealed_path)
    stix_path = Path(stix_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    sealed = json.loads(sealed_path.read_text())
    bundle = json.loads(stix_path.read_text())

    # Always print the textual summary first
    _print_text_summary(sealed, bundle)

    artifacts = sealed.get("sealed_artifacts", [])
    objects = bundle.get("objects", [])

    indicators, observed_data, relationships, raw_artifacts = (
        _classify_stix_objects(objects)
    )

    lines = [
        "digraph InvestigationResults {",
        '  graph [rankdir=TB, bgcolor="white", pad="0.35", '
        'nodesep="0.4", ranksep="0.65", splines=ortho];',
        '  node [shape=box, style="rounded,filled", '
        'fontname="DejaVu Sans", fontsize=10, margin="0.16,0.10"];',
        '  edge [fontname="DejaVu Sans", fontsize=9, color="#64748b"];',
        "",
        '  root [label="INVESTIGATION RESULTS", '
        'fillcolor="#172554", fontcolor="white", '
        'color="#172554", penwidth=1.5, fontsize=15];',
        '  evidence [label="SEALED EVIDENCE\\n'
        f'{len(artifacts)} artifacts", '
        'fillcolor="#dbeafe", color="#60a5fa", fontcolor="#172554"];',
        '  detection [label="DETECTION FINDINGS\\n'
        f'{len(indicators)} indicators", '
        'fillcolor="#fef3c7", color="#f59e0b", fontcolor="#78350f"];',
        "",
        '  root -> evidence [label="collected"];',
        '  root -> detection [label="evaluated"];',
    ]

    # If the STIX bundle has raw artifacts, add a node for that context
    if raw_artifacts:
        lines.append(
            f'  stix_data [label="STIX BUNDLE DATA\\n'
            f'{len(raw_artifacts)} raw objects", '
            'fillcolor="#f1f5f9", color="#94a3b8", fontcolor="#0f172a"];'
        )
        lines.append('  root -> stix_data [label="bundled"];')
        if indicators:
            lines.append('  { rank=same; evidence; detection; stix_data; }')
        else:
            lines.append('  { rank=same; evidence; stix_data; }')
    else:
        lines.append('  { rank=same; evidence; detection; }')

    # --- Evidence artifact nodes ---
    for index, artifact in enumerate(artifacts):
        if not isinstance(artifact, dict):
            continue

        art_type, details = _summarize_artifact(artifact)

        digest = artifact.get("sha256")
        if digest:
            details.append(f"SHA-256: {digest[:16]}...")

        evidence_id = artifact.get("evidence_id")
        if evidence_id:
            details.append(f"ID: {evidence_id[:12]}...")

        label = art_type.replace("_", " ").title()
        if details:
            label += "\\n" + "\\n".join(
                _escape(_truncate(d, 50)) for d in details
            )

        node_id = f"artifact{index}"
        lines.append(
            f'  {node_id} [label="{_escape(label)}", '
            'fillcolor="#eff6ff", color="#93c5fd", '
            'fontcolor="#1e3a8a"];'
        )
        lines.append(f'  evidence -> {node_id};')

    # --- Detection indicator nodes ---
    for index, finding in enumerate(indicators):
        name = finding.get("name", "Unnamed finding")
        description = finding.get("description", "")
        pattern_type = finding.get("pattern_type", "")

        label = _escape(_truncate(name, 50))
        if description:
            label += "\\n" + _escape(_truncate(description, 60))
        if pattern_type:
            label += "\\n" + f"[{_escape(pattern_type)}]"

        node_id = f"finding{index}"
        lines.append(
            f'  {node_id} [label="{label}", '
            'fillcolor="#fee2e2", color="#f87171", '
            'fontcolor="#7f1d1d"];'
        )
        lines.append(f'  detection -> {node_id};')

    # If no findings, add a "clean" node so the graph isn't empty
    if not indicators:
        lines.append(
            '  no_findings [label="No detection rules triggered\\n'
            '(clean investigation)", '
            'fillcolor="#d1fae5", color="#34d399", '
            'fontcolor="#064e3b"];'
        )
        lines.append('  detection -> no_findings;')

    # --- Raw STIX artifact nodes ---
    for index, ra in enumerate(raw_artifacts):
        art_type, details = _summarize_artifact(ra)

        label = art_type.replace("_", " ").title()
        if details:
            label += "\\n" + "\\n".join(
                _escape(_truncate(d, 50)) for d in details[:4]
            )
            if len(details) > 4:
                label += f"\\n...+{len(details) - 4} more"

        node_id = f"stixraw{index}"
        lines.append(
            f'  {node_id} [label="{_escape(label)}", '
            'fillcolor="#f8fafc", color="#cbd5e1", '
            'fontcolor="#334155"];'
        )
        lines.append(f'  stix_data -> {node_id};')

    lines.append("}")

    dot_path = output_path.with_suffix(".dot")
    dot_path.write_text("\n".join(lines))

    subprocess.run(
        ["dot", "-Tpng", str(dot_path), "-o", str(output_path)],
        check=True,
    )

    print(f"Results graph written to {output_path}")
    print(f"Evidence artifacts: {len(artifacts)}")
    print(f"Detection indicators: {len(indicators)}")
    if raw_artifacts:
        print(f"STIX raw objects: {len(raw_artifacts)}")

    if open_image:
        subprocess.Popen(
            ["xdg-open", str(output_path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    return output_path


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(
            "Usage: python -m compiler.visualizer.results "
            "<sealed.json> <stix.json> <output.png>"
        )
        sys.exit(2)

    generate_results_graph(sys.argv[1], sys.argv[2], sys.argv[3])
