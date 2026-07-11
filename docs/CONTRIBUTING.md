# 参与 Outdoor Route Studio

**[中文](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md)**

感谢参与。项目的核心约束是：日常开发维护模块化 `src/`，发布时仍交付可离线打开的单 HTML。

## 开始之前

```bash
git clone git@github.com:Sicily-love/hiking-trail-mapper.git
cd hiking-trail-mapper
npm ci
./tests/run_full_check.sh
```

需要：

- Node.js 18 或更高版本；
- npm（使用 lockfile 安装）；
- Python 3；运行浏览器/E2E 时需要 `websocket-client` 或 `uv`；
- 可启动 Chrome 的环境，用于完整功能与视觉回归。

先记录基线失败，再开始修改。不要把已有失败混进新补丁。

## 先认清文件职责

```text
index.html                    小型 Vite 入口壳
src/                          应用实现唯一真源
hiking-trail-mapper.html      自动生成的离线发布物
dist/                         自动生成的 Pages 发布目录
```

规则：

1. 业务、DOM、CSS 和浏览器行为只在 `src/` 修改。
2. 不手工编辑 `hiking-trail-mapper.html` 或 `dist/`。
3. `index.html` 只在入口元信息或模块入口变化时修改；不要把应用实现放回壳中。
4. 构建脚本从 `index.html + src/` 重现发布物。
5. 生成文件有漂移时，修源码或构建脚本，然后重新生成。

## 源码选择

| 改动 | 首选位置 |
|------|----------|
| 纯计算、KML、存储 snapshot、render model | `src/core` |
| 全局应用状态、命令、交互和刷新协调 | `src/app` |
| 单个功能的 controller/state | `src/features` |
| Leaflet / IndexedDB 副作用 | `src/adapters` |
| DOM 壳、Workbench、响应式布局、dialog | `src/ui` |
| 全局或 vendor 样式 | `src/styles` |
| 过渡旧浏览器编排 | `src/app/runtime.ts`，并附迁移边界 |

优先复用现有 owner，不为一个局部改动新建平行架构。

## 启动代码

启动顺序由 `src/app/bootstrap.ts` 统一拥有：

```text
index.html -> src/main.ts -> bootstrapOutdoorRouteStudio()
           -> Workbench DOM -> vendors -> typed modules -> runtime.ts bridge
```

新增启动能力时：

- 保持 `src/main.ts` 薄，只导入样式和调用 bootstrap。
- 在 bootstrap 中显式排序，并暴露可等待的 ready 状态。
- 不让 typed module 依赖 runtime 偶然创建的隐式全局。
- 不在 `index.html` 增加内联业务脚本。

## 迁移 runtime.ts

`src/app/runtime.ts` 是仍在使用的 classic-runtime 兼容层，不是已废弃的空文件。可以修复其中尚未迁出的生产 bug，但新功能应尽量进入 typed owner。

迁移一个行为的推荐步骤：

1. 为当前行为补单元、浏览器或 E2E 回归。
2. 抽出 DOM-free 计算和 feature state。
3. 接入合适的 manager/controller/adapter。
4. 让旧入口转发到新实现。
5. 删除 `runtime.ts` 中被完全替代的分支。
6. 构建单 HTML并跑真实浏览器测试。

不要复制一份新实现后把旧实现留在原处；也不要仅因文件改名就宣称 runtime 已完成拆分。

## 四个管理器怎么选

### InteractionManager

用于互斥、可取消、有 phase 的地图交互，例如测距、分段、标注、下撤和 Day 预览。

- 每次激活必须有明确 kind、phase 和 owner。
- timer、RAF 与 listener 应绑定 session 生命周期。
- 异步结果写状态前检查 session/owner 是否仍有效。

### RenderScheduler

用于合并轨迹、标注、侧栏、行程、图例、海拔图和 fit 刷新。

- 发出最小 dirty mask。
- 不在一次 state change 中手工串联多个重复 redraw。
- fit 使用 scheduler 的最后请求语义，不额外维护竞争 timer。

### CommandRegistry

用于所有用户可触发的命令。

- 一个行为对应一个稳定 command ID。
- enabled/checked 从 context 计算。
- 桌面侧栏、移动底栏、菜单和键盘入口共享 dispatch。

### DialogController

用于 info、confirm、prompt 和 custom modal。

- 用户内容使用 `textContent`。
- 危险操作显式设置 danger 状态。
- 保持 Escape、cancel、默认按钮和焦点恢复一致。

## Workbench 改动

Workbench 的响应式契约是桌面七项侧栏、移动五项底栏。修改命令或布局时：

1. 先更新 command 定义与状态，再更新 placement。
2. 不为桌面和移动复制业务 listener。
3. 低频操作进入 More/menu/bottom sheet，不挤压核心控制。
4. 同时检查宽桌面、窄桌面、390px 和 320px。
5. 验证路线侧栏、海拔坞、工具面板、dialog 与地图控件不重叠。
6. 中英文最长 label 都要适配。

布局变化必须补 `test_ui_contract.js` 或 `tests/visual` 覆盖。

## TypeScript 与代码风格

- 使用现有 TypeScript 类型和 barrel；不要用 `any` 绕过边界，兼容 runtime 除外。
- 新的纯逻辑保持 DOM-free，并使用显式输入/输出。
- 函数和变量用 `camelCase`，类型/类用 `PascalCase`，常量用 `SCREAMING_SNAKE_CASE`。
- controller 名称表达 owner；渲染数据用 `*Model`，工厂用 `create*`。
- 注释只解释不明显的约束、生命周期或兼容原因。
- 超长函数按职责拆分，但不要为了行数制造无意义 wrapper。

`runtime.ts` 暂时使用 `@ts-nocheck` 不代表新模块可以跳过类型检查。

## 状态与副作用

- 每个状态只有一个 owner。
- `Set` 持久化前转数组，恢复后转回 `Set`。
- DOM、Leaflet layer、AbortController 和 timer handle 不进入 snapshot。
- 旧路径仍可通过 `applyChange()`；新路径优先用精确 render dirty mask。
- interaction 取消后，旧异步任务不得更新 state、DOM 或地图。

## 测试要求

按风险选择最小测试，再以完整检查收尾：

```bash
npm run test:unit
npm run typecheck
./tests/run_full_check.sh
npm run test:visual:capture
```

常见映射：

| 改动 | 至少补充 |
|------|----------|
| `src/core` 纯逻辑 | 对应 Node 单元 |
| manager/controller | manager 单元 + 必要浏览器回归 |
| bootstrap / entry / build | `test_vite_entry.js` + `test_release_pipeline.js` |
| Workbench 布局 | UI contract + 桌面/移动视觉截图 |
| 导入、存储、导出 | 单元 + E2E |
| runtime 迁移 | 旧行为回归 + 单文件真实 Chrome |

完整说明见 [TESTING.md](TESTING.md)。

## 构建与生成物

```bash
npm run build
npm run release:prepare
```

`npm run build` 应生成：

- `dist/index.html`：自包含 Pages 主入口；
- `dist/hiking-trail-mapper.html`：内容相同的兼容别名；
- `dist/release.json`：版本、日期、hash 和字节数；
- 根目录 `hiking-trail-mapper.html`：按脚本刷新或检查的离线发布物。

最终 HTML 不得引用外部 JavaScript 或 CSS asset。不要把兼容别名误称为第二套源码。

## 版本与发布

普通功能分支不要顺手改版本。发布负责人使用：

```bash
npm run version:bump -- patch --zh "中文更新项" --en "English change"
npm run release:prepare
```

版本工具负责同步 package、runtime metadata、CHANGELOG 和 README。不要手工更新零散版本戳，也不要在与发布无关的补丁里提前占用版本号。

## 文档

- `README.md` / `README.en.md`、`ARCHITECTURE*`、`TESTING*`、`CONTRIBUTING*` 必须表达相同事实。
- 中文和英文可以自然表达，但标题结构、命令、文件职责和状态结论必须一致。
- 描述迁移状态时区分“API 已建立”“旧路径已接入”“兼容层已删除”三个阶段。
- 不把计划中的 runtime 拆分写成已经完成。

## 提交前检查

- 改动发生在正确 owner，没有编辑生成 HTML。
- 新命令在七侧栏/五底栏共享同一 dispatch。
- manager 生命周期与取消路径有测试。
- 中英文文档和 UI 文案同步。
- `npm run typecheck` 与相关单元通过。
- 完整检查和需要的视觉回归已运行；未运行项明确记录。
- PR 描述列出用户行为变化、兼容影响和验证结果。

## 问题与许可

报 bug 时附复现步骤、浏览器/系统、输入文件特征和相关测试输出。功能建议先描述户外路线工作流，再讨论实现。

贡献以 [MIT License](../LICENSE) 发布。
