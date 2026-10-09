import subprocess
from pathlib import Path


def generate_ir_graph(module, output_path: Path, open_image: bool = True):
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    dot_path = output_path.with_suffix(".dot")

    lines = [
        "digraph ForensicIR {",
        '    rankdir=TB;',
        '    graph [pad="0.3", nodesep="0.45", ranksep="0.65"];',
        '    node [shape=box, style="rounded", fontname="DejaVu Sans", fontsize=11];',
        '    edge [fontname="DejaVu Sans", fontsize=9];',
        "",
    ]

    operations = module.operations

    # Module node
    lines.append(
        f'    module [label="Jocky: {module.name}", '
        'shape=box, style="rounded,bold"];'
    )

    previous = "module"

    for index, op in enumerate(operations):
        node_id = f"op{index}"
        op_type = type(op).__name__

        if op_type == "CollectOp":
            label = (
                f"collect\\n"
                f"operation: {op.operation}\\n"
                f"capability: {op.capability}"
            )

        elif op_type == "CorrelateOp":
            label = (
                f"correlate\\n"
                f"{op.source} → {op.target}"
            )

        elif op_type == "DetectOp":
            label = (
                f"detect\\n"
                f"rule: {op.rule_name}"
            )

        elif op_type == "SealEvidenceOp":
            label = "evidence.seal"

        elif op_type == "EmitReportOp":
            label = f"emit\\nformat: {op.target}"

        else:
            label = op_type

        lines.append(f'    {node_id} [label="{label}"];')
        lines.append(f"    {previous} -> {node_id};")

        previous = node_id

    lines.append("}")

    dot_path.write_text("\n".join(lines))

    subprocess.run(
        ["dot", "-Tpng", str(dot_path), "-o", str(output_path)],
        check=True,
    )

    if open_image:
        subprocess.Popen(
            ["xdg-open", str(output_path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    return output_path
