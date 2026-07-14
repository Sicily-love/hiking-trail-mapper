export const APP_SHELL = `
<header id="header" style="display:none">
  <div class="brand">
    <span class="brand-icon" aria-hidden="true"></span>
    <h1 id="app-title" data-i18n="app.title">徒步路线地图</h1>
  </div>
</header>

<div id="main">
  <div id="map-mode-controls" class="map-mode-controls" aria-label="地图显示模式">
    <button class="btn-mini on" data-mode="elev" data-i18n="mode.elev">海拔模式</button>
    <button class="btn-mini" data-mode="waypoint" data-i18n="mode.waypoint">标注点模式</button>
  </div>

  <div id="map">
    <div id="legend" hidden></div>
    <div id="primary-mini" style="display:none" title="点击展开侧栏，拖动可移动"></div>

    <div id="map-toolbar">
      <div class="toolbar-group">
        <button id="help-btn" class="tb-btn" data-i18n="action.help">帮助</button>
        <button id="reset-btn" class="tb-btn" data-i18n="action.reset">复位</button>
        <button id="measure-btn" class="tb-btn" data-i18n="action.measure">测距</button>
        <button id="segment-btn" class="tb-btn" data-i18n="action.segment">分段</button>
        <button id="add-waypoint-btn" class="tb-btn" data-i18n="action.addWaypoint">标注</button>
        <button id="add-escape-btn" class="tb-btn" data-i18n="action.addEscape">下撤</button>
        <button id="reverse-btn" class="tb-btn" data-i18n="action.reverse">反向</button>
        <button id="add-trail-btn" class="tb-btn" data-i18n="action.add">添加轨迹</button>
        <button id="export-btn" class="tb-btn" data-i18n="action.export">导出</button>
        <button id="clear-btn" class="tb-btn" data-i18n="action.clear">清空</button>
      </div>
    </div>

    <div id="add-trail-modal" class="modal-mask">
      <div class="modal-card">
        <h3 data-i18n="add.title">添加新轨迹</h3>
        <p class="modal-description">上传一个或多个户外平台导出的 KML 文件。</p>
        <div id="kml-drop" class="kml-drop-zone">
          <div class="kml-drop-icon" aria-hidden="true">+</div>
          <div>点击或拖拽 .kml 文件到此处</div>
          <small>支持多选和多次添加</small>
          <input id="kml-file" type="file" accept=".kml,.zip,application/vnd.google-earth.kml+xml,application/zip" multiple hidden>
        </div>
        <div id="kml-list" class="kml-file-list"></div>
        <div id="add-status" class="kml-add-status"></div>
        <div class="modal-actions">
          <button class="btn-mini" id="add-cancel">关闭</button>
        </div>
        <details class="kml-help">
          <summary>如何导出 KML</summary>
          <div>在两步路、六只脚、Strava、Gaia GPS、AllTrails 或 Garmin Connect 中选择导出 KML，再将文件拖入上方区域。</div>
        </details>
      </div>
    </div>
  </div>

  <section id="elev-bar" class="floating-panel" aria-label="海拔剖面">
    <canvas id="elev-canvas" class="elev-canvas"></canvas>
    <div class="panel-drag-grip" data-panel-drag title="拖动；双击恢复默认位置" aria-hidden="true"></div>
    <div id="elev-crosshair" class="elev-crosshair"></div>
    <div id="elev-tip" class="elev-tip"></div>
    <div id="elev-label" class="elev-label">海拔剖面</div>
    <div id="elev-stats" class="elev-stats">
      <span id="elev-stat-asc" class="elev-stat-asc">↑-</span>
      <span id="elev-stat-desc" class="elev-stat-desc">↓-</span>
    </div>
    <div id="measure-distance" class="measure-distance-readout"><span id="m-dist">-</span></div>
    <div id="measure-hint" class="measure-hint-line">在主轨迹上点击起点，再点击终点。</div>
  </section>

  <aside id="sidebar">
    <button class="sidebar-close" id="sidebar-close" title="收起">收起</button>
    <div id="primary-card"></div>
    <nav class="tabs" aria-label="工作台页面">
      <button class="tab active" data-tab="trails" data-i18n="tab.trail">轨迹</button>
      <button class="tab" data-tab="days" data-i18n="tab.day">行程</button>
      <button id="lang-btn" class="btn-mini" title="Language / 语言">语言</button>
    </nav>
    <div class="tab-content">
      <section class="tab-pane active" id="tab-trails">
        <section id="trail-selector-panel" class="studio-trail-selector" aria-labelledby="trail-selector-title">
          <header class="studio-trail-selector__header">
            <h3 id="trail-selector-title" data-i18n="trail.list">轨迹选择</h3>
            <span class="studio-trail-selector__hint" data-i18n="trail.selector.hint">选择主轨迹与叠加轨迹</span>
          </header>
          <div id="trail-list"></div>
        </section>
        <div class="section">
          <h3 id="mode-tag-title">当前模式 · 标注点</h3>
          <div class="filter-grid" id="filter-grid"></div>
          <div class="filter-actions">
            <button class="btn-mini" id="filterAll" data-i18n="filter.selectAll">全选</button>
            <button class="btn-mini" id="filterNone" data-i18n="filter.selectNone">全不选</button>
          </div>
        </div>
      </section>
      <section class="tab-pane" id="tab-days"></section>
    </div>
  </aside>
</div>

<div id="tooltip"></div>
<div id="wp-photo-tip" class="waypoint-photo-card"></div>

<section id="measure-panel" class="floating-panel">
  <div class="measure-panel-grip" data-panel-drag title="拖动；双击恢复默认位置" aria-hidden="true"></div>
  <div class="panel-actions panel-actions-three">
    <button id="measure-reset" class="panel-btn muted">重新选点</button>
    <button id="measure-reverse" class="panel-btn muted">反向</button>
    <button id="measure-exit" class="panel-btn ghost">退出</button>
  </div>
</section>

<section id="segment-panel" class="floating-panel">
  <header class="tool-panel-header">
    <b class="tool-panel-title">行程分段</b>
    <button id="segment-close" class="tool-panel-close">关闭</button>
  </header>
  <div id="segment-hint" class="tool-panel-hint">在主轨迹上点击起点，之后每次点击增加一天。</div>
  <div id="segment-list"></div>
  <footer class="tool-panel-footer">
    <div class="panel-actions panel-actions-four">
      <button id="segment-undo" class="panel-btn muted">撤销</button>
      <button id="segment-clear" class="panel-btn muted">清空</button>
      <button id="segment-apply" class="panel-btn primary">应用</button>
      <button id="segment-exit" class="panel-btn ghost">退出</button>
    </div>
  </footer>
</section>

<section id="addescape-panel" class="floating-panel">
  <header class="tool-panel-header">
    <b class="tool-panel-title">下撤路线</b>
    <button id="addescape-close" class="tool-panel-close">关闭</button>
  </header>
  <div id="addescape-hint" class="tool-panel-hint">在依据轨迹上点击起点 A，再点击终点 B。</div>
  <div id="addescape-result" class="escape-result">
    <div class="escape-result-grid">
      <div>沿迹：<b id="ae-dist" class="escape-value-warn">-</b></div>
      <div>依据轨迹：<b id="ae-trail" class="escape-value-info">-</b></div>
      <div>爬升：<b id="ae-asc" class="escape-value-up">-</b></div>
      <div>下降：<b id="ae-desc" class="escape-value-down">-</b></div>
      <div>起点：<b id="ae-eA" class="escape-value-neutral">-</b></div>
      <div>终点：<b id="ae-eB" class="escape-value-neutral">-</b></div>
    </div>
    <div class="form-row">
      <label class="form-label" for="addescape-name">路线名称：</label>
      <input id="addescape-name" class="form-input" type="text" placeholder="自动填写，可修改">
    </div>
    <div class="escape-actions">
      <button id="addescape-commit" class="panel-btn danger">保存到下撤方案</button>
      <button id="addescape-reset" class="panel-btn muted">重选</button>
      <button id="addescape-exit" class="panel-btn ghost">退出</button>
    </div>
  </div>
</section>

<div id="lightbox" class="image-lightbox">
  <img id="lightbox-img" alt="">
  <button class="image-lightbox-close" type="button" aria-label="关闭">×</button>
  <div id="lightbox-caption"></div>
</div>
`;

export function mountAppShell(root: HTMLElement): void {
  root.innerHTML = APP_SHELL;
}
