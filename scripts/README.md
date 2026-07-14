# Script Layout

Outdoor Route Studio 的构建、发布与维护脚本。 / Build, release, and maintenance scripts for Outdoor Route Studio.

## 中文

- `build/`：以小壳 `index.html` 和 `src/` 为输入运行 Vite，将生成的 JavaScript/CSS 内联到 `dist/index.html`，生成相同内容的兼容别名与 `release.json`。
- `release/`：版本、元数据、文档同步、生成物校验和完整发布准备。
- `maintenance/`：非日常构建的一次性清理工具。

从仓库根目录调用 package scripts：

```bash
npm run build
npm run sync:release
npm run release:prepare
npm run version:bump -- patch --zh "..." --en "..."
```

构建规则：

1. `src/` 是应用实现真源，`index.html` 只保持为小壳。
2. `hiking-trail-mapper.html` 和 `dist/` 是生成物，不手工编辑。
3. 最终 `dist/index.html` 必须是无外部 JavaScript/CSS asset 的自包含单 HTML。
4. `dist/hiking-trail-mapper.html` 是同内容兼容别名，不是第二套源码。
5. Pages workflow 上传 `dist/`。
6. bootstrap 直接导入 `src/app/runtime/studio.ts`；构建不得恢复 raw import、composer 或脚本执行桥。发布版本真源是 `src/app/version.ts`，更新内容真源是 `src/features/localization/changelog.ts`。

新脚本放入最小匹配目录；浏览器断言属于 `tests/browser`，不要放进 `scripts/`。

## English

- `build/`: run Vite from the small `index.html` shell and `src/`, inline generated JavaScript/CSS into `dist/index.html`, and emit the identical compatibility alias plus `release.json`.
- `release/`: versioning, metadata, documentation synchronization, generated-artifact validation, and complete release preparation.
- `maintenance/`: one-off cleanup tools outside normal builds.

Invoke package scripts from the repository root:

```bash
npm run build
npm run sync:release
npm run release:prepare
npm run version:bump -- patch --zh "..." --en "..."
```

Build rules:

1. `src/` is the application implementation source of truth; `index.html` stays a small shell.
2. `hiking-trail-mapper.html` and `dist/` are generated and must not be hand-edited.
3. Final `dist/index.html` is a self-contained single HTML with no external JavaScript/CSS assets.
4. `dist/hiking-trail-mapper.html` is an identical compatibility alias, not a second source.
5. The Pages workflow uploads `dist/`.
6. Bootstrap imports `src/app/runtime/studio.ts` directly; builds must not restore raw imports, a composer, or a script-execution bridge. `src/app/version.ts` owns the release version and `src/features/localization/changelog.ts` owns release notes.

Put new scripts in the smallest matching directory. Browser assertions belong under `tests/browser`, not `scripts/`.
