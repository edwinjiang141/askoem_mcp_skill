import type { ChatPanelMode } from './chatPanelTypes';

export function buildChatPanelHtml(options: {
  mode: ChatPanelMode;
  chartSrc: string;
  csp: string;
}): string {
  const isOem = options.mode === 'oem';
  const { chartSrc, csp } = options;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, '&quot;')}" />
  <title>${isOem ? 'OEM Assistant Console' : 'OEM RAG Console'}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      margin: 0;
      padding: 0;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .layout {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .conv-sidebar {
      width: 200px;
      min-width: 160px;
      border-right: 1px solid var(--vscode-panel-border);
      display: flex;
      flex-direction: column;
      background: color-mix(in srgb, var(--vscode-sideBar-background) 90%, transparent);
    }
    .conv-toolbar {
      padding: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .conv-toolbar button {
      width: 100%;
      padding: 6px 8px;
      font-size: 12px;
      cursor: pointer;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
    }
    .conv-toolbar button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .conv-list {
      list-style: none;
      margin: 0;
      padding: 4px;
      overflow-y: auto;
      flex: 1;
    }
    .conv-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 6px;
      margin-bottom: 2px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      border: 1px solid transparent;
    }
    .conv-item:hover {
      background: color-mix(in srgb, var(--vscode-list-hoverBackground) 80%, transparent);
    }
    .conv-item.active {
      background: color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 50%, transparent);
      border-color: var(--vscode-focusBorder);
      box-shadow: inset 3px 0 0 var(--vscode-focusBorder);
    }
    .conv-title-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .conv-item button.icon {
      flex: 0 0 22px;
      height: 22px;
      padding: 0;
      font-size: 11px;
      line-height: 1;
      cursor: pointer;
      border: none;
      border-radius: 3px;
      background: transparent;
      color: var(--vscode-foreground);
      opacity: 0.85;
    }
    .conv-item button.icon:hover {
      background: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 90%, transparent);
    }
    .conv-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: 8px 4px;
    }
    .chat-log {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 12px;
      min-height: 200px;
      flex: 1;
      overflow-y: auto;
    }
    .bubble {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 10px;
      padding: 10px;
      white-space: pre-wrap;
      word-break: break-word;
      min-width: 0;
    }
    .bubble.user {
      align-self: flex-end;
      max-width: min(92%, 720px);
      background: color-mix(in srgb, var(--vscode-button-background) 15%, transparent);
    }
    .bubble.assistant {
      align-self: stretch;
      width: 100%;
      max-width: 100%;
      background: color-mix(in srgb, var(--vscode-editorWidget-background) 75%, transparent);
    }
    .bubble.info {
      align-self: center;
      background: color-mix(in srgb, var(--vscode-textCodeBlock-background) 65%, transparent);
      opacity: 0.95;
      font-size: 12px;
    }
    .bubble-title {
      font-weight: 600;
      margin-bottom: 6px;
      font-size: 12px;
      opacity: 0.9;
    }
    details {
      margin-top: 8px;
      border-top: 1px dashed var(--vscode-panel-border);
      padding-top: 8px;
    }
    details summary {
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    }
    .step {
      margin-top: 8px;
      padding: 8px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      background: color-mix(in srgb, var(--vscode-textCodeBlock-background) 55%, transparent);
    }
    .step-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .composer {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: end;
      position: relative;
    }
    textarea {
      width: 100%;
      min-height: 96px;
      resize: vertical;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 8px;
      padding: 8px;
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
    }
    .submit-btn {
      height: 38px;
      width: 38px;
      border-radius: 8px;
      border: 1px solid var(--vscode-button-border);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
    }
    .submit-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .tool-picker {
      position: absolute;
      left: 0;
      right: 46px;
      bottom: 110px;
      max-height: 220px;
      overflow-y: auto;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      background: var(--vscode-editorWidget-background);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
      z-index: 10;
      display: none;
    }
    .tool-picker.visible {
      display: block;
    }
    .tool-option {
      padding: 8px 10px;
      cursor: pointer;
      border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 40%, transparent);
    }
    .tool-option:last-child {
      border-bottom: none;
    }
    .tool-option:hover,
    .tool-option.active {
      background: color-mix(in srgb, var(--vscode-list-hoverBackground) 80%, transparent);
    }
    .tool-option .name {
      font-weight: 600;
      font-size: 12px;
    }
    .tool-option .desc {
      font-size: 11px;
      opacity: 0.9;
      margin-top: 4px;
    }
    .hint {
      margin-top: 6px;
      font-size: 11px;
      opacity: 0.8;
    }
    .mention-pill {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--vscode-badge-background);
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 11px;
      margin-right: 6px;
      margin-bottom: 6px;
      background: color-mix(in srgb, var(--vscode-badge-background) 22%, transparent);
    }
    .mention-wrap {
      min-height: 20px;
      margin: 4px 0;
    }
    .oem-fetch-charts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 16px;
      margin-top: 10px;
      width: 100%;
      align-items: start;
    }
    .chart-wrap {
      position: relative;
      width: 100%;
      min-height: 300px;
      height: clamp(320px, 44vh, 560px);
      max-height: min(60vh, 640px);
      min-width: 0;
      margin-bottom: 0;
    }
    .chart-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0 10px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      font-size: 12px;
      flex-wrap: wrap;
    }
    .chart-toolbar .chart-toggle-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
    }
    .chart-toolbar .chart-hint {
      opacity: 0.75;
      font-size: 11px;
    }
    .oem-chart-section {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed var(--vscode-panel-border);
    }
    .oem-chart-section-title {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
      opacity: 0.9;
    }
    .oem-chart-block-title {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
      opacity: 0.95;
      color: var(--vscode-foreground);
    }
    .chart-wrap-table {
      min-height: auto;
      height: auto;
      max-height: none;
    }
    .oem-chart-table-wrap {
      overflow-x: auto;
      width: 100%;
    }
    .oem-chart-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .oem-chart-table th,
    .oem-chart-table td {
      border: 1px solid var(--vscode-panel-border);
      padding: 8px 10px;
      text-align: left;
      word-break: break-word;
    }
    .oem-chart-table th {
      background: color-mix(in srgb, var(--vscode-editorWidget-background) 82%, transparent);
      font-weight: 600;
    }
    .oem-chart-table tbody tr:nth-child(even) {
      background: color-mix(in srgb, var(--vscode-editorWidget-background) 45%, transparent);
    }
    .ref-links {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed var(--vscode-panel-border);
      font-size: 12px;
    }
    .ref-links-title {
      font-weight: 600;
      margin-bottom: 6px;
      opacity: 0.9;
    }
    .ref-link-row {
      margin: 4px 0;
    }
    .ref-link-row a {
      color: var(--vscode-textLink-foreground);
    }
    .rag-top-hint {
      font-size: 11px;
      opacity: 0.85;
      padding: 6px 0 8px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="conv-sidebar">
      <div class="conv-toolbar">
        <button type="button" id="newConvBtn">+ 新建会话</button>
      </div>
      <ul id="convList" class="conv-list" role="list"></ul>
    </aside>
    <div class="conv-main">
      <div class="chart-toolbar" style="${isOem ? '' : 'display:none'}">
        <label class="chart-toggle-label" for="chartToggle">
          <input type="checkbox" id="chartToggle" checked />
          显示数据图表
        </label>
        <span class="chart-hint">图表展示在助手回答正文下方；关闭后仅隐藏图表。</span>
      </div>
      <div class="rag-top-hint" style="${isOem ? 'display:none' : ''}">
        知识检索：仅 https://docs.oracle.com/en/ 与 https://blogs.oracle.com/ 。请在 OEM Assistant Settings → RAG 中配置 Tavily API Key（SecretStorage）。
      </div>
      <div id="log" class="chat-log"></div>
      <div class="mention-wrap" id="mentions" style="${isOem ? '' : 'display:none'}"></div>
      <div class="composer">
        <div id="toolPicker" class="tool-picker" role="listbox" aria-label="MCP tools" style="${isOem ? '' : 'display:none'}"></div>
        <textarea id="input" placeholder="${isOem ? '输入 @ 可快速选择 tool，例如：@fetch_data_from_oem 查询xx主机CPU告警。' : '输入关于 Oracle 文档的问题（英文关键词检索效果更稳）。'}"></textarea>
        <button id="askBtn" class="submit-btn" title="Submit">➤</button>
      </div>
      <div class="hint">${isOem ? '提示：输入 @tool_name 可指定优先调用工具；Ctrl/Cmd+Enter 发送。' : 'Ctrl/Cmd+Enter 发送。'}</div>
    </div>
  </div>

  ${isOem ? `<script src="${chartSrc}"></script>` : ''}
  <script>
    const vscode = acquireVsCodeApi();
    const IS_OEM = ${isOem ? 'true' : 'false'};
    const input = document.getElementById('input');
    const log = document.getElementById('log');
    const picker = document.getElementById('toolPicker');
    const mentions = document.getElementById('mentions');
    const convList = document.getElementById('convList');
    const newConvBtn = document.getElementById('newConvBtn');
    const chartToggle = document.getElementById('chartToggle');
    let toolsCatalog = [];
    let currentOptions = [];
    let activeOptionIndex = 0;
    let currentActiveId = '';
    let convItems = [];
    let showFetchDataCharts = true;
    let settingsAllowCharts = true;

    (function initChartToggleFromStorage() {
      if (!chartToggle) {
        return;
      }
      const saved = localStorage.getItem('oemAssistant.showCharts');
      if (saved !== null) {
        chartToggle.checked = saved === 'true';
      }
    })();

    if (chartToggle) {
      chartToggle.addEventListener('change', function() {
        localStorage.setItem('oemAssistant.showCharts', String(chartToggle.checked));
        document.querySelectorAll('.oem-chart-section').forEach(function(el) {
          el.style.display = chartToggle.checked && settingsAllowCharts ? '' : 'none';
        });
      });
    }

    function redrawMentions() {
      if (!IS_OEM) {
        mentions.innerHTML = '';
        return;
      }
      const used = extractToolMentions(input.value);
      if (!used.length) {
        mentions.innerHTML = '';
        return;
      }
      mentions.innerHTML = used.map(name => '<span class="mention-pill">@' + escapeHtml(name) + '</span>').join('');
    }

    function redactSensitiveText(raw) {
      let text = String(raw || '');
      text = text.replace(/"password"\\s*:\\s*"[^"]*"/gi, '"password": "***"');
      text = text.replace(/"pass"\\s*:\\s*"[^"]*"/gi, '"pass": "***"');
      text = text.replace(/"pwd"\\s*:\\s*"[^"]*"/gi, '"pwd": "***"');
      text = text.replace(/(password\\s*[=:]\\s*)([^\\s,\\n]+)/gi, '$1***');
      text = text.replace(/(密码\\s*[：:\\=]\\s*)([^\\s,\\n]+)/g, '$1***');
      text = text.replace(/(username\\s*[=:]\\s*)([^\\s,\\n]+)/gi, '$1***');
      text = text.replace(/(用户名\\s*[：:\\=]\\s*)([^\\s,\\n]+)/g, '$1***');
      text = text.replace(/(https?:\\/\\/[^\\s]*\\/em\\/api)/gi, '[OEM_API_REDACTED]');
      return text;
    }

    function appendBubble(type, title, bodyHtml) {
      const div = document.createElement('div');
      div.className = 'bubble ' + type;
      div.innerHTML = '<div class="bubble-title">' + escapeHtml(title) + '</div>' + bodyHtml;
      log.appendChild(div);
      div.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return div;
    }

    function clearLog() {
      log.innerHTML = '';
    }

    function renderConvList(items, activeId) {
      convItems = items || [];
      currentActiveId = activeId || '';
      convList.innerHTML = (convItems || []).map(meta => {
        const active = meta.id === activeId ? ' conv-item active' : ' conv-item';
        return '<li class="' + active.trim() + '" data-id="' + escapeHtml(meta.id) + '">'
          + '<span class="conv-title-text" title="' + escapeHtml(meta.title) + '">' + escapeHtml(meta.title) + '</span>'
          + '<button type="button" class="icon conv-rename" title="重命名" data-id="' + escapeHtml(meta.id) + '">✎</button>'
          + '<button type="button" class="icon conv-del" title="删除" data-id="' + escapeHtml(meta.id) + '">×</button>'
          + '</li>';
      }).join('');
    }

    function buildChartJsOptions(chart) {
      const tickFont = { font: { size: 11 } };
      const scales = {};
      if (chart.chartType === 'bar') {
        scales.x = {
          title: chart.xAxisLabel ? { display: true, text: chart.xAxisLabel } : undefined,
          ticks: { maxRotation: 50, minRotation: 0, autoSkip: false, ...tickFont }
        };
        if (chart.yAxisLabel) {
          scales.y = {
            title: { display: true, text: chart.yAxisLabel },
            ticks: { maxTicksLimit: 8, ...tickFont }
          };
        }
      } else {
        if (chart.xAxisLabel) {
          scales.x = { title: { display: true, text: chart.xAxisLabel }, ticks: { ...tickFont } };
        }
        if (chart.yAxisLabel) {
          scales.y = {
            title: { display: true, text: chart.yAxisLabel },
            ticks: { maxTicksLimit: 8, ...tickFont }
          };
        }
      }
      const base = { responsive: true, maintainAspectRatio: false };
      if (Object.keys(scales).length) {
        base.scales = scales;
      }
      const ds = chart.datasets || [];
      if (chart.chartType === 'line' && ds.length > 1) {
        base.plugins = {
          legend: { display: true, position: 'bottom' }
        };
      }
      return base;
    }

    function initFetchCharts(container) {
      if (typeof Chart === 'undefined') {
        return;
      }
      container.querySelectorAll('.oem-fetch-charts').forEach(function(el) {
        const raw = el.getAttribute('data-spec');
        if (!raw) {
          return;
        }
        try {
          const spec = JSON.parse(decodeURIComponent(raw));
          el.innerHTML = '';
          spec.charts.forEach(function(chart) {
            const wrap = document.createElement('div');
            wrap.className = 'chart-wrap';

            if (chart.chartType === 'table' && chart.tableRows && chart.tableRows.length && chart.tableColumns && chart.tableColumns.length >= 2) {
              wrap.classList.add('chart-wrap-table');
              if (chart.title) {
                const bt = document.createElement('div');
                bt.className = 'oem-chart-block-title';
                bt.textContent = chart.title;
                wrap.appendChild(bt);
              }
              const tw = document.createElement('div');
              tw.className = 'oem-chart-table-wrap';
              const tbl = document.createElement('table');
              tbl.className = 'oem-chart-table';
              const thead = document.createElement('thead');
              const trh = document.createElement('tr');
              chart.tableColumns.forEach(function(col) {
                const th = document.createElement('th');
                th.textContent = col;
                trh.appendChild(th);
              });
              thead.appendChild(trh);
              tbl.appendChild(thead);
              const tbody = document.createElement('tbody');
              chart.tableRows.forEach(function(row) {
                const tr = document.createElement('tr');
                row.forEach(function(cell) {
                  const td = document.createElement('td');
                  td.textContent = cell;
                  tr.appendChild(td);
                });
                tbody.appendChild(tr);
              });
              tbl.appendChild(tbody);
              tw.appendChild(tbl);
              wrap.appendChild(tw);
              el.appendChild(wrap);
              return;
            }

            const canvas = document.createElement('canvas');
            wrap.appendChild(canvas);
            el.appendChild(wrap);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return;
            }
            if (chart.chartType === 'scatter' && chart.scatterPoints && chart.scatterPoints.length) {
              var pts = chart.scatterPoints;
              var mag = pts.map(function(p) { return Math.abs(p.x) + Math.abs(p.y); });
              var maxMag = Math.max.apply(null, mag) || 1;
              if (chart.title) {
                const bt2 = document.createElement('div');
                bt2.className = 'oem-chart-block-title';
                bt2.textContent = chart.title;
                wrap.insertBefore(bt2, canvas);
              }
              var gridCol = 'rgba(128, 128, 128, 0.18)';
              new Chart(ctx, {
                type: 'bubble',
                data: {
                  datasets: [{
                    label: chart.title || 'series',
                    data: pts.map(function(p, i) {
                      var t = mag[i] / maxMag;
                      var r = Math.max(14, Math.min(34, 10 + Math.sqrt(t) * 24));
                      return { x: p.x, y: p.y, r: r };
                    }),
                    backgroundColor: pts.map(function(_, i) {
                      var h = (200 + i * 47) % 360;
                      return 'hsla(' + h + ', 58%, 52%, 0.58)';
                    }),
                    borderColor: pts.map(function(_, i) {
                      var h = (200 + i * 47) % 360;
                      return 'hsla(' + h + ', 58%, 38%, 0.92)';
                    }),
                    borderWidth: 2,
                    hoverBackgroundColor: pts.map(function(_, i) {
                      var h = (200 + i * 47) % 360;
                      return 'hsla(' + h + ', 58%, 48%, 0.75)';
                    }),
                    hoverBorderWidth: 2
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      type: 'linear',
                      title: chart.xAxisLabel ? { display: true, text: chart.xAxisLabel } : undefined,
                      ticks: { font: { size: 11 } },
                      grid: { color: gridCol }
                    },
                    y: {
                      title: chart.yAxisLabel ? { display: true, text: chart.yAxisLabel } : undefined,
                      ticks: { maxTicksLimit: 8, font: { size: 11 } },
                      grid: { color: gridCol }
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(ctx) {
                          var d = ctx.raw;
                          return 'x: ' + d.x + ', y: ' + d.y + ' (r≈' + (d.r && d.r.toFixed ? d.r.toFixed(1) : d.r) + ')';
                        }
                      }
                    }
                  }
                }
              });
            } else {
              const opts = buildChartJsOptions(chart);
              new Chart(ctx, {
                type: chart.chartType,
                data: {
                  labels: chart.labels,
                  datasets: (chart.datasets || []).map(function(ds) {
                    return { label: ds.label, data: ds.data };
                  })
                },
                options: opts
              });
            }
          });
        } catch (e) {
          console.error(e);
        }
      });
    }

    function collectAllFetchCharts(result) {
      const out = [];
      if (!result || !result.steps) {
        return { charts: [] };
      }
      for (var i = 0; i < result.steps.length; i++) {
        var step = result.steps[i];
        if (step.fetchCharts && step.fetchCharts.charts && step.fetchCharts.charts.length) {
          for (var j = 0; j < step.fetchCharts.charts.length; j++) {
            out.push(step.fetchCharts.charts[j]);
          }
        }
      }
      return { charts: out.slice(0, 10) };
    }

    function appendReferenceLinks(wrapper, result) {
      if (!result || !result.referenceLinks || !result.referenceLinks.length) {
        return;
      }
      const box = document.createElement('div');
      box.className = 'ref-links';
      box.innerHTML =
        '<div class="ref-links-title">相关文档</div>' +
        result.referenceLinks
          .map(function (l) {
            const u = escapeHtml(String(l.url || ''));
            const t = escapeHtml(String(l.title || l.url || ''));
            return '<div class="ref-link-row"><a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a></div>';
          })
          .join('');
      wrapper.appendChild(box);
    }

    function renderAssistantBubble(result, skipTypewriter, messageShowCharts) {
      const settingsOk = messageShowCharts !== undefined ? messageShowCharts : showFetchDataCharts;
      const userWantsCharts = chartToggle ? chartToggle.checked : true;
      const useCharts = userWantsCharts && settingsOk && settingsAllowCharts;

      const wrapper = appendBubble('assistant', 'Assistant', '<div class="answer-body"></div>');
      const answerBody = wrapper.querySelector('.answer-body');
      if (!answerBody) return;

      const chartSection = document.createElement('div');
      chartSection.className = 'oem-chart-section';
      chartSection.style.display = 'none';
      answerBody.after(chartSection);

      const runSteps = () => {
        const merged = collectAllFetchCharts(result);
        if (useCharts && merged.charts.length) {
          chartSection.style.display = '';
          chartSection.innerHTML =
            '<div class="oem-chart-section-title">数据图表</div>'
            + '<div class="oem-fetch-charts" data-spec="' + encodeURIComponent(JSON.stringify(merged)) + '"></div>';
          initFetchCharts(chartSection);
        } else {
          chartSection.style.display = 'none';
          chartSection.innerHTML = '';
        }

        const stepsHtml = result.steps
          .map(function(step) {
            return (
              '<div class="step">'
              + '<div class="step-title">' + escapeHtml(step.title) + '</div>'
              + '<div>' + escapeHtml(redactSensitiveText(step.detail)) + '</div>'
              + '</div>'
            );
          })
          .join('');
        if (stepsHtml) {
          const details = document.createElement('details');
          details.innerHTML = '<summary>Tool Execution Trace</summary>' + stepsHtml;
          wrapper.appendChild(details);
        }
        appendReferenceLinks(wrapper, result);
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
      };

      if (skipTypewriter) {
        answerBody.textContent = redactSensitiveText(result.finalText);
        runSteps();
        return;
      }

      const text = redactSensitiveText(result.finalText);
      const batchSize = 3;
      const frameDelay = 12;
      let index = 0;
      const timer = setInterval(() => {
        const next = Math.min(index + batchSize, text.length);
        answerBody.textContent = text.slice(0, next);
        index = next;
        if (index >= text.length) {
          clearInterval(timer);
          runSteps();
        }
      }, frameDelay);
    }

    function renderMessages(messages) {
      clearLog();
      if (!messages || !messages.length) return;
      for (const m of messages) {
        if (m.kind === 'user') {
          appendBubble('user', 'You', '<div>' + escapeHtml(redactSensitiveText(m.text)) + '</div>');
        } else if (m.kind === 'assistant') {
          renderAssistantBubble(m.result, true, undefined);
        } else if (m.kind === 'info') {
          appendBubble('info', 'Info', '<div>' + escapeHtml(redactSensitiveText(m.text)) + '</div>');
        }
      }
    }

    function extractToolMentions(text) {
      const names = new Set();
      for (const match of String(text).matchAll(/@([a-zA-Z0-9_:-]+)/g)) {
        const name = match[1];
        if (name) names.add(name);
      }
      return Array.from(names);
    }

    function getCurrentMentionQuery() {
      const value = input.value;
      const caret = input.selectionStart || 0;
      const beforeCaret = value.slice(0, caret);
      const match = beforeCaret.match(/(?:^|\\s)@([a-zA-Z0-9_:-]*)$/);
      if (!match) return undefined;
      const atPos = beforeCaret.lastIndexOf('@');
      return { query: (match[1] || '').toLowerCase(), atPos };
    }

    function rankTools(query) {
      if (!query) return toolsCatalog.slice(0, 20);
      return toolsCatalog
        .map(tool => {
          const name = tool.name.toLowerCase();
          const desc = (tool.description || '').toLowerCase();
          let score = 0;
          if (name.startsWith(query)) score += 6;
          if (name.includes(query)) score += 4;
          if (desc.includes(query)) score += 1;
          return { tool, score };
        })
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
        .slice(0, 20)
        .map(entry => entry.tool);
    }

    function renderPicker(options) {
      currentOptions = options;
      if (!options.length) {
        picker.classList.remove('visible');
        picker.innerHTML = '';
        return;
      }
      picker.classList.add('visible');
      activeOptionIndex = Math.min(activeOptionIndex, options.length - 1);
      picker.innerHTML = options.map((tool, idx) => {
        const cls = idx === activeOptionIndex ? 'tool-option active' : 'tool-option';
        return '<div class="' + cls + '" data-tool-name="' + escapeHtml(tool.name) + '">'
          + '<div class="name">' + escapeHtml(tool.name) + '</div>'
          + '<div class="desc">' + escapeHtml(tool.description || 'No description') + '</div>'
          + '</div>';
      }).join('');
    }

    function applyToolMention(toolName) {
      const mention = getCurrentMentionQuery();
      if (!mention) return;
      const caret = input.selectionStart || 0;
      const before = input.value.slice(0, mention.atPos);
      const after = input.value.slice(caret);
      const spaceAfter = after.startsWith(' ') ? '' : ' ';
      input.value = before + '@' + toolName + ' ' + spaceAfter + after;
      const nextPos = (before + '@' + toolName + ' ').length;
      input.focus();
      input.selectionStart = nextPos;
      input.selectionEnd = nextPos;
      picker.classList.remove('visible');
      picker.innerHTML = '';
      redrawMentions();
    }

    function maybeShowPicker() {
      if (!IS_OEM) {
        return;
      }
      const mention = getCurrentMentionQuery();
      if (!mention) {
        picker.classList.remove('visible');
        picker.innerHTML = '';
        return;
      }
      activeOptionIndex = 0;
      renderPicker(rankTools(mention.query));
    }

    function submitAsk() {
      const question = input.value.trim();
      if (!question) return;
      appendBubble('user', 'You', '<div>' + escapeHtml(redactSensitiveText(question)) + '</div>');
      if (IS_OEM) {
        const preferredTools = extractToolMentions(question);
        vscode.postMessage({ type: 'ask', payload: { question, preferredTools } });
      } else {
        vscode.postMessage({ type: 'rag-ask', payload: { question } });
      }
      input.value = '';
      mentions.innerHTML = '';
      picker.classList.remove('visible');
      picker.innerHTML = '';
    }

    newConvBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'conversation/create' });
    });

    convList.addEventListener('click', e => {
      const del = e.target.closest('.conv-del');
      if (del) {
        e.preventDefault();
        e.stopPropagation();
        const id = del.getAttribute('data-id');
        if (id) {
          vscode.postMessage({ type: 'conversation/delete', id });
        }
        return;
      }
      const ren = e.target.closest('.conv-rename');
      if (ren) {
        e.preventDefault();
        e.stopPropagation();
        const id = ren.getAttribute('data-id');
        if (id) {
          vscode.postMessage({ type: 'conversation/rename', id });
        }
        return;
      }
      const row = e.target.closest('.conv-item');
      if (row && !e.target.closest('button')) {
        const id = row.getAttribute('data-id');
        if (id) {
          vscode.postMessage({ type: 'conversation/select', id });
        }
      }
    });

    document.getElementById('askBtn').addEventListener('click', submitAsk);

    input.addEventListener('input', () => {
      redrawMentions();
      maybeShowPicker();
    });

    input.addEventListener('keydown', event => {
      if (picker.classList.contains('visible') && currentOptions.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          activeOptionIndex = (activeOptionIndex + 1) % currentOptions.length;
          renderPicker(currentOptions);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          activeOptionIndex = (activeOptionIndex - 1 + currentOptions.length) % currentOptions.length;
          renderPicker(currentOptions);
          return;
        }
        if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
          event.preventDefault();
          applyToolMention(currentOptions[activeOptionIndex].name);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          picker.classList.remove('visible');
          return;
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        submitAsk();
      }
    });

    picker.addEventListener('mousedown', event => {
      const row = event.target.closest('[data-tool-name]');
      if (!row) return;
      const name = row.getAttribute('data-tool-name');
      if (name) applyToolMention(name);
    });

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'tools-catalog') {
        toolsCatalog = Array.isArray(message.payload) ? message.payload : [];
        maybeShowPicker();
        return;
      }
      if (message.type === 'conversations-bootstrap') {
        const p = message.payload;
        if (p && p.items) renderConvList(p.items, p.activeId);
        if (p && p.activeMessages) renderMessages(p.activeMessages);
        return;
      }
      if (message.type === 'conversations-list') {
        const p = message.payload;
        if (p && p.items) renderConvList(p.items, p.activeId);
        return;
      }
      if (message.type === 'conversation-activate') {
        const p = message.payload;
        if (p && p.activeId) {
          currentActiveId = p.activeId;
          renderConvList(convItems, p.activeId);
        }
        if (p && p.messages) renderMessages(p.messages);
        return;
      }
      if (message.type === 'info') {
        appendBubble('info', 'Info', '<div>' + escapeHtml(redactSensitiveText(message.payload)) + '</div>');
        return;
      }
      if (message.type === 'chart-settings') {
        showFetchDataCharts = Boolean(message.payload);
        settingsAllowCharts = Boolean(message.payload);
        if (chartToggle && localStorage.getItem('oemAssistant.showCharts') === null) {
          chartToggle.checked = settingsAllowCharts;
        }
        if (chartToggle) {
          document.querySelectorAll('.oem-chart-section').forEach(function(el) {
            el.style.display = chartToggle.checked && settingsAllowCharts ? '' : 'none';
          });
        }
        return;
      }
      if (message.type === 'assistant-result') {
        const payload = message.payload;
        if (payload.conversationId && payload.conversationId !== currentActiveId) {
          return;
        }
        const result = payload.result;
        const msgCharts = payload.showFetchDataCharts;
        renderAssistantBubble(result, false, msgCharts);
        return;
      }
    });

    function escapeHtml(str) {
      return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
    }

    vscode.postMessage({ type: 'webview-ready' });
  </script>
</body>
</html>`;
}
