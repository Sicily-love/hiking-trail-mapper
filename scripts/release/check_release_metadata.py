#!/usr/bin/env python3
"""Release 2.0 source, artifact, and metadata consistency checks."""
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

    source_html_path = ROOT / "index.html"
    release_html_path = ROOT / "hiking-trail-mapper.html"
    version_path = ROOT / "src" / "app" / "version.ts"
    studio_runtime_path = ROOT / "src" / "app" / "runtime" / "studio.ts"
    bootstrap_path = ROOT / "src" / "app" / "bootstrap.ts"
    changelog_path = ROOT / "src" / "features" / "localization" / "changelog.ts"
    package_path = ROOT / "package.json"
    lock_path = ROOT / "package-lock.json"
    tsconfig_path = ROOT / "tsconfig.json"
    vite_path = ROOT / "vite.config.mts"
    build_path = ROOT / "scripts" / "build" / "build_release.mjs"
    sync_path = ROOT / "scripts" / "release" / "sync_release.sh"
    bump_path = ROOT / "scripts" / "release" / "bump_version.mjs"
    full_check_path = ROOT / "tests" / "run_full_check.sh"
    workflow_path = ROOT / ".github" / "workflows" / "pages.yml"

    source_html = read_text(source_html_path)
    release_html = read_text(release_html_path)
    version_source = read_text(version_path)
    studio_runtime = read_text(studio_runtime_path)
    bootstrap = read_text(bootstrap_path)
    changelog_source = read_text(changelog_path)
    package_json = json.loads(read_text(package_path))
    lock_json = json.loads(read_text(lock_path))
    tsconfig = json.loads(read_text(tsconfig_path))
    vite_config = read_text(vite_path)
    build_script = read_text(build_path)
    sync_script = read_text(sync_path)
    bump_script = read_text(bump_path)
    full_check = read_text(full_check_path)
    workflow = read_text(workflow_path) if workflow_path.exists() else ""
    gitignore_entries = set(read_text(ROOT / ".gitignore").splitlines())

    runtime_version = extract(r"STUDIO_VERSION = '(v[0-9]+\.[0-9]+\.[0-9]+)'", version_source)
    runtime_changelog_version = extract(
        r"export const CHANGELOG = \[\s*\{\s*version:\s*'(v[0-9]+\.[0-9]+\.[0-9]+)'",
        changelog_source,
    )
    runtime_build_date = extract(
        r"export const CHANGELOG = \[\s*\{\s*version:\s*'v[0-9]+\.[0-9]+\.[0-9]+',\s*date:\s*'([0-9]{4}-[0-9]{2}-[0-9]{2})'",
        changelog_source,
    )
    release_comment_version = extract(
        r"APP_VERSION:\s*(v[0-9]+\.[0-9]+\.[0-9]+)", release_html
    )
    release_build_date = extract(
        r"BUILD_DATE:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})", release_html
    )
    readme_version = extract(
        r"(?m)^版本：\s*(v[0-9]+\.[0-9]+\.[0-9]+)", read_text(ROOT / "README.md")
    )
    readme_en_version = extract(
        r"(?m)^Version:\s*(v[0-9]+\.[0-9]+\.[0-9]+)",
        read_text(ROOT / "README.en.md"),
    )
    changelog_version = extract(
        r"(?m)^##\s+(v[0-9]+\.[0-9]+\.[0-9]+)\b", read_text(ROOT / "CHANGELOG.md")
    )

    expected_version = runtime_version
    package_version = f"v{package_json.get('version', '')}"
    lock_version = f"v{lock_json.get('version', '')}"
    lock_root_version = f"v{lock_json.get('packages', {}).get('', {}).get('version', '')}"

    print("\n▸ Release 2.0 metadata")
    runner.check("version.ts STUDIO_VERSION exists", bool(expected_version), expected_version)
    version_sources = {
        "changelog module top": runtime_changelog_version,
        "release comment": release_comment_version,
        "CHANGELOG.md": changelog_version,
        "README.md": readme_version,
        "README.en.md": readme_en_version,
        "package.json": package_version,
        "package-lock.json": lock_version,
        "package-lock root package": lock_root_version,
    }
    for label, version in version_sources.items():
        runner.check(f"{label} = {expected_version}", version == expected_version, version or "missing")
    runner.check(
        "release BUILD_DATE matches top changelog entry",
        bool(runtime_build_date) and release_build_date == runtime_build_date,
        release_build_date or "missing",
    )

    module_sources = re.findall(
        r'<script\s+type="module"[^>]*\bsrc="([^"]+)"[^>]*>\s*</script>', source_html
    )
    runner.check("index.html is the sole Vite HTML source", source_html_path.exists())
    runner.check("index.html has one #app mount", source_html.count('id="app"') == 1)
    runner.check("index.html has one /src/main.ts entry", module_sources == ["/src/main.ts"], str(module_sources))
    runner.check("index.html is a source shell", "data-studio-bundle" not in source_html)
    runner.check("release artifact is distinct from source shell", release_html != source_html)
    runner.check("release JavaScript is inline", release_html.count('<script type="module" data-studio-bundle>') == 1)
    runner.check("release CSS is inline", release_html.count('<style data-studio-bundle>') == 1)
    runner.check(
        "release has no external build assets",
        not re.search(r'<script\s+type="module"[^>]+\bsrc=', release_html)
        and not re.search(r'<link\s+rel="stylesheet"[^>]+\bhref=', release_html),
    )
    runner.check(
        "legacy generated IIFE markers are absent",
        all(marker not in release_html for marker in (
            "data-generated-core-runtime",
            "data-generated-app-runtime",
            "CORE_RUNTIME_START",
            "APP_MODULE_RUNTIME_START",
        )),
    )

    scripts = package_json.get("scripts", {})
    for script_name in (
        "typecheck",
        "build",
        "test:unit",
        "test:visual:capture",
        "check:release-metadata",
        "release:check",
        "sync:release",
        "check:generated",
        "release:prepare",
        "version:bump",
    ):
        runner.check(f"package script {script_name}", script_name in scripts)
    for retired_script in (
        "sync:core",
        "check:core-runtime",
        "generate:html",
        "prune:fallbacks",
    ):
        runner.check(f"retired package script {retired_script} absent", retired_script not in scripts)
    runner.check(
        "check:generated is a read-only .vite-build check",
        scripts.get("check:generated")
        == "node scripts/build/build_release.mjs --check --outDir .vite-build",
    )
    runner.check("dev opens the sole Vite HTML", "/dev.html" not in scripts.get("dev", ""))
    for test_name in (
        "test_performance_core.js",
        "test_interaction_manager.js",
        "test_render_scheduler.js",
        "test_command_dialog.js",
        "test_ui_contract.js",
    ):
        runner.check(f"test:unit includes {test_name}", test_name in scripts.get("test:unit", ""))

    runner.check("vite.config.mts exists", vite_path.exists())
    runner.check("vite.config.ts absent", not (ROOT / "vite.config.ts").exists())
    runner.check("tsconfig includes vite.config.mts", "vite.config.mts" in tsconfig.get("include", []))
    runner.check("Vite production input is index.html", "input: 'index.html'" in vite_config)
    runner.check("Vite uses relative asset base", "base: './'" in vite_config)
    runner.check("release build reads version.ts", "src/app/version.ts" in build_script)
    runner.check(
        "release build reads changelog module",
        "src/features/localization/changelog.ts" in build_script,
    )
    runner.check("release build emits release.json", "release.json" in build_script)
    runner.check("release sync uses the Vite build", "npm run build" in sync_script)
    runner.check("version bump updates version.ts", "src/app/version.ts" in bump_script)
    runner.check(
        "version bump updates changelog module",
        "src/features/localization/changelog.ts" in bump_script,
    )
    runner.check("full check exports HTM_RELEASE_HTML", "HTM_RELEASE_HTML" in full_check)

    for retired_path in (
        ROOT / "scripts" / "build" / "generate_release_html.mjs",
        ROOT / "scripts" / "build" / "sync_core_bundle.mjs",
        ROOT / "scripts" / "maintenance" / "prune_runtime_fallbacks.mjs",
        ROOT / "src" / "app" / "runtime.js",
        ROOT / "src" / "app" / "runtime.ts",
        ROOT / "src" / "app" / "runtime" / "classic.ts",
        ROOT / "src" / "app" / "runtime" / "compose.ts",
    ):
        runner.check(f"retired path absent: {retired_path.name}", not retired_path.exists())
    runner.check("direct Studio runtime exists", studio_runtime_path.exists())
    runner.check("bootstrap imports direct runtime", "startStudioRuntime" in bootstrap)
    runner.check("bootstrap has no raw runtime imports", "?raw" not in bootstrap)
    runner.check("bootstrap has no script execution bridge", "executeClassicScript" not in bootstrap)
    runner.check("Studio runtime has no composer markers", "@runtime-slice" not in studio_runtime and "@runtime-fragment" not in studio_runtime)
    runner.check(
        "floating version tag binds the version module",
        'id="version-tag-link"' in studio_runtime and "${APP_VERSION}</a>" in studio_runtime,
    )
    runner.check("browser tests are grouped", (ROOT / "tests/browser/test_v1_31.py").exists())
    runner.check("release HTML remains tracked", "hiking-trail-mapper.html" not in gitignore_entries)
    for entry in ("node_modules/", "dist/", ".vite-build/"):
        runner.check(f".gitignore contains {entry}", entry in gitignore_entries)
    for action in (
        "actions/checkout@v6",
        "actions/setup-node@v6",
        "actions/configure-pages@v6",
        "actions/upload-pages-artifact@v5",
        "actions/deploy-pages@v5",
    ):
        runner.check(f"workflow uses {action}", action in workflow)

    return runner.finish()


if __name__ == "__main__":
    sys.exit(main())
