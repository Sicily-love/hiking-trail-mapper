#!/usr/bin/env python3
"""
Release metadata consistency checks.

This script keeps the generated Vite/TypeScript source and directly-openable
single-file release artifacts aligned.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class CheckRunner:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0

    def check(self, name: str, ok: bool, detail: str = "") -> None:
        if ok:
            print(f"  ✓ {name}" + (f"  ({detail})" if detail else ""))
            self.passed += 1
            return
        print(f"  ✗ {name}" + (f"  ({detail})" if detail else ""))
        self.failed += 1

    def finish(self) -> int:
        total = self.passed + self.failed
        print("\n══════════════════════════════════════════════════")
        print(f"结果: {self.passed}/{total} passed")
        return 0 if self.failed == 0 else 1


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def extract(pattern: str, text: str) -> str:
    match = re.search(pattern, text)
    return match.group(1) if match else ""


def main() -> int:
    runner = CheckRunner()

    html_path = ROOT / "hiking-trail-mapper.html"
    index_path = ROOT / "index.html"
    readme_path = ROOT / "README.md"
    readme_en_path = ROOT / "README.en.md"
    package_path = ROOT / "package.json"
    lock_path = ROOT / "package-lock.json"
    tsconfig_path = ROOT / "tsconfig.json"
    vite_mts_path = ROOT / "vite.config.mts"
    vite_ts_path = ROOT / "vite.config.ts"
    gitignore_path = ROOT / ".gitignore"
    core_sync_path = ROOT / "scripts" / "build" / "sync_core_bundle.mjs"
    html_generator_path = ROOT / "scripts" / "build" / "generate_release_html.mjs"
    release_build_path = ROOT / "scripts" / "build" / "build_release.mjs"
    release_prepare_path = ROOT / "scripts" / "release" / "prepare_release.sh"
    pages_workflow_path = ROOT / ".github" / "workflows" / "pages.yml"

    html = read_text(html_path)
    index_html = read_text(index_path)
    package_json = json.loads(read_text(package_path))
    lock_json = json.loads(read_text(lock_path))
    tsconfig = json.loads(read_text(tsconfig_path))
    gitignore_entries = set(read_text(gitignore_path).splitlines())
    vite_config = read_text(vite_mts_path)
    pages_workflow = read_text(pages_workflow_path) if pages_workflow_path.exists() else ""

    comment_version = extract(r"APP_VERSION:\s*(v[0-9]+\.[0-9]+\.[0-9]+)", html)
    title_version = extract(r"在线版\s+(v[0-9]+\.[0-9]+\.[0-9]+)", html)
    js_version = extract(r"const APP_VERSION = '(v[0-9]+\.[0-9]+\.[0-9]+)'", html)
    changelog_version = extract(r"version:\s*'(v[0-9]+\.[0-9]+\.[0-9]+)'", html)
    version_tag = extract(r"id=\"version-tag-link\"[^>]*>(v[0-9]+\.[0-9]+\.[0-9]+)<", html)
    readme_version = extract(r"(?m)^版本：\s*(v[0-9]+\.[0-9]+\.[0-9]+)", read_text(readme_path))
    readme_en_version = extract(r"(?m)^Version:\s*(v[0-9]+\.[0-9]+\.[0-9]+)", read_text(readme_en_path))

    expected_version = js_version
    package_version = f"v{package_json.get('version', '')}"
    lock_version = f"v{lock_json.get('version', '')}"
    lock_root_version = f"v{lock_json.get('packages', {}).get('', {}).get('version', '')}"

    print("\n▸ Release metadata")
    runner.check("APP_VERSION exists", bool(expected_version), expected_version)

    version_sources = {
        "HTML comment": comment_version,
        "HTML title": title_version,
        "JS APP_VERSION": js_version,
        "CHANGELOG top": changelog_version,
        "floating version tag": version_tag,
        "README.md": readme_version,
        "README.en.md": readme_en_version,
        "package.json": package_version,
        "package-lock.json": lock_version,
        "package-lock root package": lock_root_version,
    }
    for label, version in version_sources.items():
        runner.check(f"{label} = {expected_version}", version == expected_version, version or "missing")

    build_date = extract(r"BUILD_DATE:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})", html)
    runner.check("BUILD_DATE uses YYYY-MM-DD", bool(build_date), build_date or "missing")
    runner.check("index.html mirrors hiking-trail-mapper.html", index_html == html)
    runner.check("package-lock.json exists", lock_path.exists())

    scripts = package_json.get("scripts", {})
    for script_name in (
        "typecheck", "build", "test:unit", "test:visual:capture", "release:check", "sync:release",
        "sync:core", "check:core-runtime", "generate:html", "check:generated",
        "release:prepare", "version:bump",
    ):
        runner.check(f"package script {script_name}", script_name in scripts)

    runner.check("vite.config.mts exists", vite_mts_path.exists())
    runner.check("vite.config.ts absent", not vite_ts_path.exists())
    runner.check("tsconfig includes vite.config.mts", "vite.config.mts" in tsconfig.get("include", []))
    runner.check("Vite production input is index.html", "input: 'index.html'" in vite_config)
    runner.check("Vite uses relative asset base", "base: './'" in vite_config)
    for label, file_path in (
        ("core runtime sync script", core_sync_path),
        ("release HTML generator", html_generator_path),
        ("release build script", release_build_path),
        ("release preparation script", release_prepare_path),
        ("GitHub Pages workflow", pages_workflow_path),
    ):
        runner.check(f"{label} exists", file_path.exists())
    runner.check("embedded core runtime marker", "data-generated-core-runtime" in html)
    runner.check("embedded app runtime marker", "data-generated-app-runtime" in html)
    runner.check("HTML binds src/core runtime", "window.__HTM_CORE_RUNTIME__ = HTM_CORE" in html)
    runner.check("HTML binds src/app runtime", "window.__HTM_APP_RUNTIME__ = HTM_APP" in html)
    runner.check("canonical release template exists", (ROOT / "src/template/app.html").exists())
    runner.check("canonical UI stylesheet exists", (ROOT / "src/ui/workbench.css").exists())
    runner.check("canonical browser runtime exists", (ROOT / "src/app/runtime.js").exists())
    runner.check("removed core fallback stays absent", "function haversine(" not in read_text(ROOT / "src/app/runtime.js"))
    runner.check("build scripts are grouped", (ROOT / "scripts/build/generate_release_html.mjs").exists())
    runner.check("release scripts are grouped", (ROOT / "scripts/release/sync_release.sh").exists())
    runner.check("maintenance scripts are grouped", (ROOT / "scripts/maintenance/prune_runtime_fallbacks.mjs").exists())
    runner.check("browser tests are grouped", (ROOT / "tests/browser/test_v1_31.py").exists())
    runner.check("visual regression states exist", all(
        name in read_text(ROOT / "tests/visual/capture_field_console.py")
        for name in ("field-console-day-cards.png", "field-console-measure.png", "field-console-segment.png")
    ))
    runner.check("access-proxy scripts absent", "accessproxy_statics" not in html)
    for action in (
        "actions/checkout@v6",
        "actions/setup-node@v6",
        "actions/configure-pages@v5",
        "actions/upload-pages-artifact@v4",
        "actions/deploy-pages@v4",
    ):
        runner.check(f"workflow uses {action}", action in pages_workflow)
    for entry in ("node_modules/", "dist/", ".vite-build/"):
        runner.check(f".gitignore contains {entry}", entry in gitignore_entries)

    return runner.finish()


if __name__ == "__main__":
    sys.exit(main())
