# Contributing to hiking-trail-mapper

感谢想参与 —— 这个项目坚持**一个 HTML 文件跑全部**的哲学，所以贡献流程略特殊。读这份文档能省你一半时间。

## 项目结构快览

```
github-release/hiking-trail-mapper/
├── hiking-trail-mapper.html     # ⭐ 唯一的产品文件（约 8000 行）
├── docs/                        # 文档（zh + en 双语）
│   ├── ARCHITECTURE.md
│   ├── FEATURES.md
│   ├── TESTING.md               # 测试指南（必读）
│   └── CONTRIBUTING.md          # 本文
├── examples/
│   └── sample-trails/           # 样本 KML
├── tests/
│   ├── run_full_check.sh        # 一键 6 阶段测试
│   ├── unit/                    # Node 单元测试
│   │   ├── trail_core.js        # 纯函数镜像
│   │   ├── test_math.js
│   │   ├── test_enrich.js
│   │   └── verify_alignment.js  # 镜像与 HTML 对齐校准
│   └── e2e/
│       └── run_all.py           # 端到端 14 场景
└── CHANGELOG.md
```

skill 侧（agent 自动生成 HTML 时用）：

```
user-skills/hiking-trail-mapper/
├── SKILL.md                     # agent 触发规则
├── assets/online_kml_template.html   # 与 hiking-trail-mapper.html 同源
└── scripts/                     # 数据抓取/处理脚本（Python）
```

两个 HTML 通过 `scripts/release/sync_release.sh` 从 `src` **单向生成**。

## 开始贡献

### 1. Clone + 装依赖

```bash
git clone git@github.com:Sicily-love/hiking-trail-mapper.git
cd hiking-trail-mapper

# Node（>= 18，仅测试用；产品是纯前端 HTML，无 build）
node --version

# Python + uv（跑功能/端到端测试）
uv --version
```

### 2. 跑一次基线

任何改动之前，先确认基线是绿的：

```bash
./tests/run_full_check.sh
```

**基线红了别改代码**——先修基线。

### 3. 改代码

改动**必须**发生在两个地方之一：

- `hiking-trail-mapper.html`（release 侧）
- `../../user-skills/hiking-trail-mapper/assets/online_kml_template.html`（skill 侧）

**如果两处都改**：以 skill 侧为准，跑一次 `sync_release.sh` 把 release 侧覆盖。

### 4. 再跑测试

```bash
./tests/run_full_check.sh
```

失败即修，直到 6/6 绿。

### 5. Commit + PR

```bash
git add .
git commit -m 'vX.Y.Z · brief description'
git push
```

## 代码风格

### JSDoc 类型注解（v1.19.0 开始要求）

所有新增/修改的**顶层函数**必须有 JSDoc：

```javascript
/**
 * Haversine 球面距离
 * @param {number} lat1 起点纬度（度）
 * @param {number} lng1 起点经度（度）
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} 距离（米）
 */
function haversine(lat1, lng1, lat2, lng2) {
  // ...
}
```

数据结构变化必须更新 `@typedef`：

```javascript
/**
 * @typedef {Object} Trail
 * @property {string} id
 * @property {string} name
 * // ...
 */
```

集中定义在文件顶部的 `Type Definitions (JSDoc)` 区块。

### 命名约定

- **函数**：`camelCase`，动词开头（`handleFiles` / `renderTrailCard` / `drawElevBar`）
- **纯计算/工具**：动词或名词（`haversine` / `smoothElev`）
- **辅助渲染**：`draw*` / `render*` / `build*`
- **状态变更**：`toggle*` / `apply*` / `move*`
- **常量**：`SCREAMING_SNAKE`（`APP_VERSION` / `PALETTE_LOCAL`）
- **私有字段**：下划线前缀（`trail._contentHash` / `drawElevBar._overflowRequest`）

### 函数长度红线

**任何函数超过 100 行，触发拆分警报**。参考已有拆分：

- v1.17.0 `buildTrailList`: 372 → 25 行
- v1.18.0 `handleFiles`: 166 → 17 行
- v1.18.0 `parseAndProcessKml`: 174 → 36 行
- v1.18.0 `drawElevBar`: 363 → 24 行

原则：
1. **单一职责**：函数只做一件事
2. **可测试**：纯函数抽到 `trail_core.js` 供单元测试
3. **可读性 > 简洁**：宁可加辅助函数命名清晰

### state 变更必须走 applyChange

**错误**：

```javascript
state.activeTrails.add(id);
rebuildAll();
buildHeaderStats();
saveToStorage();
```

**正确**：

```javascript
toggleTrailActive(id);   // 或直接改字段
applyChange();
```

`applyChange` 统一处理"重建 UI → 持久化"流水线。改任何 state 后必调。

## 大改动流程

如果你的改动符合以下任一：

- 修改 300+ 行函数
- 新增/删除 state 字段
- 改数据结构
- 改 IO 层
- 版本号变化

**必须**走完整流程：

1. 在 CHANGELOG.md 加条目（放在最顶部）
2. 更新版本号 5 处：
   - HTML 头注释 `APP_VERSION: vX.Y.Z`
   - `<title>徒步路线地图（在线版 vX.Y.Z）</title>`
   - `const APP_VERSION = 'vX.Y.Z';`
   - `version-tag` 链接文本
   - 文件名 `hiking-trail-mapper-vX.Y.Z.html`
3. 跑 `./tests/run_full_check.sh`（6/6 绿）
4. 如果改了 `trail_core.js` 里的函数或对应 HTML 实现，跑 `verify_alignment.js`
5. Push + PR，在 PR 描述里贴测试结果

## 测试期望值调整

**只有故意改变行为时**才动测试。改测试的 commit 必须：

1. commit message 说明"故意改变行为"
2. CHANGELOG 里描述新行为
3. 更新的断言必须清晰对应实现

看到"改测试让它通过"的诱惑时，先问自己：**这是 bug 还是新行为**？

## 提问 / 报 Bug

- 报 bug：贴 `run_full_check.sh` 全部输出 + 复现步骤
- 提功能：先说使用场景，再说实现建议

## 许可

MIT License，贡献视为同意以 MIT 授权。
