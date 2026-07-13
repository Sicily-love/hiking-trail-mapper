#!/usr/bin/env python3
"""清理 classic runtime 模板和垂直 owner 中过时的版本标记注释。"""

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCES = [
    ROOT / "src" / "app" / "runtime.ts",
    ROOT / "src" / "app" / "runtime" / "classic.ts",
    *sorted((ROOT / "src" / "features").glob("*/runtime.ts")),
    ROOT / "src" / "ui" / "orchestration" / "runtime.ts",
]
KEEP_VERSIONS = {"v1.14.1", "v1.15.0", "v1.16.0"}
LINE_PATTERN = re.compile(r"^(\s*)//\s*(v1\.[0-9]+(?:\.[0-9]+)?)[:：]\s*(.*)$")
INLINE_PATTERN = re.compile(r"//\s*(v1\.[0-9]+(?:\.[0-9]+)?)[:：]\s*")


def clean_source(source: Path) -> tuple[int, str]:
    lines = source.read_text(encoding="utf-8").split("\n")
    changed = 0
    for index, line in enumerate(lines):
        match = LINE_PATTERN.match(line)
        if match:
            indent, version, rest = match.groups()
            if version in KEEP_VERSIONS:
                continue
            lines[index] = f"{indent}// {rest.strip()}" if rest.strip() else None
            changed += 1
            continue

        inline_match = INLINE_PATTERN.search(line)
        if inline_match and inline_match.group(1) not in KEEP_VERSIONS:
            lines[index] = INLINE_PATTERN.sub("// ", line, count=1)
            changed += 1

    result = "\n".join(line for line in lines if line is not None)
    source.write_text(result, encoding="utf-8")
    return changed, result


changed_total = 0
remaining_total = 0
version_counts = {version: 0 for version in KEEP_VERSIONS}
for source_path in SOURCES:
    changed, cleaned = clean_source(source_path)
    changed_total += changed
    remaining_total += len(re.findall(r"//\s*v1\.[0-9]", cleaned))
    for version in KEEP_VERSIONS:
        version_counts[version] += cleaned.count(f"// {version}")

print(f"共清理 {changed_total} 处历史版本注释")
print(f"剩余 v1.X 注释数：{remaining_total}")
for version in ("v1.14.1", "v1.15.0", "v1.16.0"):
    print(f"  {version}: {version_counts[version]}")
