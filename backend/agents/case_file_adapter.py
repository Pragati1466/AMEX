def format_case_file_for_agents(package: dict) -> str:
    """
    Converts the real Investigation module package into clean text
    for the advocate/fairness agents to reason over.
    """
    case = package["case_file"]
    evidence = package.get("evidence", [])
    validations = package.get("validations", [])
    policy_mapping = package.get("policy_mapping", [])
    timeline = package.get("timeline", [])

    lines = []
    lines.append(f"CASE FILE: {case['case_file_id']}")
    lines.append(f"Investigation Summary: {package.get('investigation_summary', 'N/A')}")
    lines.append("")

    lines.append("EVIDENCE:")
    for e in evidence:
        desc = e.get("description") or e.get("content_text") or "No description"
        lines.append(
            f"- [{e.get('type') or e.get('evidence_type')}] {e['title']}: {desc} "
            f"(status: {e.get('status', 'unknown')}, date: {e.get('event_date', 'unknown')})"
        )
    lines.append("")

    lines.append("TIMELINE:")
    for t in sorted(timeline, key=lambda x: x.get("sequence_order", 0)):
        date = t.get("date") or t.get("event_date", "unknown")
        lines.append(f"- {date}: {t['title']} — {t.get('description', '')}")
    lines.append("")

    if validations:
        lines.append("KNOWN ISSUES WITH THIS EVIDENCE (identified by Investigation module):")
        for v in validations:
            detail = v.get("detail") or v.get("description", "")
            lines.append(
                f"- [{v['severity'].upper()}] {v['category']}: {v['title']} — {detail}"
            )
    else:
        lines.append("KNOWN ISSUES: None identified.")
    lines.append("")

    if policy_mapping:
        lines.append("APPLICABLE POLICIES:")
        for p in policy_mapping:
            lines.append(
                f"- {p.get('explanation', 'N/A')} (relevance: {p.get('relevance_score', 'N/A')}, "
                f"match type: {p.get('match_type', 'N/A')})"
            )
    else:
        lines.append("APPLICABLE POLICIES: None identified.")

    return "\n".join(lines)