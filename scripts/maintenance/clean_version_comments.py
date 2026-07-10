#!/usr/bin/env python3
"""
清理 src/app/runtime.js 里过时的版本标记注释。

策略：
- 保留：v1.14.1 / v1.15.0 / v1.16.0（最近 3 版）
- 保留：注释含有实际语义信息（>= 20 字符且不只是版本号）
- 删除：纯版本号 stamp（如 "// v1.12.4：" 后面简短描述且属于内部实现细节）

具体逻辑：把 "  // v1.X：xxx" 或 "  // v1.X.Y：xxx" 开头的注释行改成 "  // xxx"（去掉版本前缀）
除非该版本是 v1.14.1 / v1.15.0 / v1.16.0（保留原样）
"""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TMPL = ROOT / "src" / "app" / "runtime.js"
KEEP_VERSIONS = {'v1.14.1', 'v1.15.0', 'v1.16.0'}

html = TMPL.read_text(encoding='utf-8')
lines = html.split('\n')

pattern = re.compile(r'^(\s*)//\s*(v1\.[0-9]+(?:\.[0-9]+)?)[:：]\s*(.*)$')
inline_pattern = re.compile(r'//\s*(v1\.[0-9]+(?:\.[0-9]+)?)[:：]\s*')

changed = 0
for i, line in enumerate(lines):
    m = pattern.match(line)
    if m:
        indent, ver, rest = m.group(1), m.group(2), m.group(3)
        if ver in KEEP_VERSIONS:
            continue
        if rest.strip():
            lines[i] = f"{indent}// {rest.strip()}"
        else:
            lines[i] = None  # 删除空注释行
        changed += 1
        continue
    # 处理行尾内联的 "// v1.X.Y："
    m2 = inline_pattern.search(line)
    if m2 and m2.group(1) not in KEEP_VERSIONS:
        # 把 "code // v1.12.4：xxx" 改成 "code // xxx"
        lines[i] = inline_pattern.sub('// ', line, count=1)
        changed += 1

# 删掉 None
result = '\n'.join(l for l in lines if l is not None)
TMPL.write_text(result, encoding='utf-8')

# 统计
new_html = result
remaining = len(re.findall(r"//\s*v1\.[0-9]", new_html))
print(f"共清理 {changed} 处历史版本注释")
print(f"剩余 v1.X 注释数：{remaining}")
for ver in ('v1.14.1', 'v1.15.0', 'v1.16.0'):
    cnt = new_html.count(f'// {ver}')
    print(f"  {ver}: {cnt}")
