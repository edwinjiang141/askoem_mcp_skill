/**
 * 前端正文 / Tool Execution Trace 展示：tabular 数据超过上限时截断；
 * 图表构建须使用原始 MCP 返回（不经本模块）。
 */

export const UI_MAX_DATA_ROWS = 20;

const MARKER = '[structuredContent]';

export function extractPrimaryJsonFromMcpToolResult(raw: string): string | null {
  const t = raw.trim();
  const idx = t.indexOf(MARKER);
  const candidate = idx >= 0 ? t.slice(idx + MARKER.length).trim() : t;
  if (!candidate.startsWith('{')) {
    return null;
  }
  return candidate;
}

function truncateArray<T>(arr: T[] | undefined, maxRows: number): T[] {
  if (!Array.isArray(arr) || arr.length <= maxRows) {
    return arr ?? [];
  }
  return arr.slice(0, maxRows);
}

function truncateDataObject(data: Record<string, unknown>, maxRows: number): void {
  const d = data;
  if (Array.isArray(d.latest_data) && d.latest_data.length > maxRows) {
    d.latest_data = truncateArray(d.latest_data as unknown[], maxRows);
  }
  if (Array.isArray(d.metric_time_series) && d.metric_time_series.length > maxRows) {
    d.metric_time_series = truncateArray(d.metric_time_series as unknown[], maxRows);
  }
  if (Array.isArray(d.incidents) && d.incidents.length > maxRows) {
    d.incidents = truncateArray(d.incidents as unknown[], maxRows);
  }
  if (Array.isArray(d.events) && d.events.length > maxRows) {
    d.events = truncateArray(d.events as unknown[], maxRows);
  }
}

/**
 * 压缩 report / result 中带「查询结果（共 N 行）」的 ASCII 表格，仅保留前 maxRows 条数据行。
 */
export function truncateReportTextTables(text: string, maxRows: number): string {
  if (maxRows <= 0 || !text) {
    return text;
  }
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^查询结果（共 (\d+) 行）：\s*$/);
    if (!m) {
      out.push(line);
      i++;
      continue;
    }
    const total = parseInt(m[1], 10);
    out.push(line);
    i++;
    if (i < lines.length && lines[i].trim() === '') {
      out.push(lines[i]);
      i++;
    }
    if (i >= lines.length || !lines[i].includes('|')) {
      continue;
    }
    out.push(lines[i]);
    i++;
    if (i < lines.length && /^[\s|+:\-]+$/.test(lines[i])) {
      out.push(lines[i]);
      i++;
    }
    if (total <= maxRows) {
      while (i < lines.length) {
        const L = lines[i];
        if (L.trim() === '' || L.startsWith('---') || L.startsWith('【')) {
          break;
        }
        if (/^查询结果（共 \d+ 行）：/.test(L)) {
          break;
        }
        if (!L.includes('|')) {
          break;
        }
        out.push(L);
        i++;
      }
      continue;
    }
    let rowCount = 0;
    while (i < lines.length) {
      const L = lines[i];
      if (L.trim() === '' || L.startsWith('---') || L.startsWith('【')) {
        break;
      }
      if (/^查询结果（共 \d+ 行）：/.test(L)) {
        break;
      }
      if (!L.includes('|')) {
        break;
      }
      if (rowCount < maxRows) {
        out.push(L);
        rowCount++;
      }
      i++;
    }
    out.push(`…（共 ${total} 条，此处仅显示前 ${maxRows} 条）`);
  }
  return out.join('\n');
}

function truncateFetchToolJsonObject(obj: Record<string, unknown>, maxRows: number): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  if (clone.data && typeof clone.data === 'object') {
    truncateDataObject(clone.data as Record<string, unknown>, maxRows);
  }
  if (Array.isArray(clone.sub_results)) {
    for (const sub of clone.sub_results as Record<string, unknown>[]) {
      const data = sub.data as Record<string, unknown> | undefined;
      if (data && typeof data === 'object') {
        truncateDataObject(data, maxRows);
      }
    }
  }
  if (typeof clone.report === 'string') {
    clone.report = truncateReportTextTables(clone.report, maxRows);
  }
  if (typeof clone.result === 'string') {
    clone.result = truncateReportTextTables(clone.result, maxRows);
  }
  if (typeof clone.result_summary === 'string') {
    clone.result_summary = truncateReportTextTables(clone.result_summary, maxRows);
  }
  return clone;
}

/**
 * 供正文区与 Tool Execution Trace 使用；图表请仍用原始 tool 返回字符串调用 buildFetchDataChartsPayload。
 */
export function truncateOemToolResultStringForUi(raw: string, maxRows: number = UI_MAX_DATA_ROWS): string {
  const extracted = extractPrimaryJsonFromMcpToolResult(raw);
  if (!extracted) {
    return truncateReportTextTables(raw, maxRows);
  }
  try {
    const obj = JSON.parse(extracted) as Record<string, unknown>;
    const truncated = truncateFetchToolJsonObject(obj, maxRows);
    return JSON.stringify(truncated, null, 2);
  } catch {
    return truncateReportTextTables(raw, maxRows);
  }
}
