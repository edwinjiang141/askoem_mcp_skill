import type { FetchDataChartSpec, FetchDataChartsPayload } from '../types/appTypes';
import type { ChartPreferences } from './parseChartPreferencesFromQuestion';
import { parseChartPreferencesFromQuestion } from './parseChartPreferencesFromQuestion';

const MAX_CHARTS = 10;
const MAX_POINTS = 200;

const SENSITIVE_KEY = /password|passwd|pwd|secret|token|credential/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

function asRowArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) {
    return [];
  }
  return v.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x));
}

function parseNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/,/g, ''));
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return undefined;
}

function findTimeColumn(rows: Record<string, unknown>[]): string | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  const keys = Object.keys(rows[0]);
  const timeRe = /collection_timestamp|timestamp|time|date|_utc|created|updated|last_updated/i;
  for (const k of keys) {
    if (isSensitiveKey(k)) {
      continue;
    }
    if (timeRe.test(k)) {
      return k;
    }
  }
  return undefined;
}

function findValueColumn(rows: Record<string, unknown>[]): string | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  const keys = Object.keys(rows[0]);
  const prefer = ['VALUE', 'value', 'metric_value'];
  for (const p of prefer) {
    if (keys.includes(p) && !isSensitiveKey(p)) {
      return p;
    }
  }
  for (const k of keys) {
    if (isSensitiveKey(k)) {
      continue;
    }
    if (/value|usage|percent|cpu|memory|count|rate/i.test(k)) {
      const n = parseNumber(rows[0][k]);
      if (n !== undefined) {
        return k;
      }
    }
  }
  for (const k of keys) {
    if (isSensitiveKey(k)) {
      continue;
    }
    const n = parseNumber(rows[0][k]);
    if (n !== undefined) {
      return k;
    }
  }
  return undefined;
}

function findGroupKey(rows: Record<string, unknown>[]): string | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  const keys = Object.keys(rows[0]);
  /** 与前端展示一致：优先按 column_label 分组，图表个数 = 不同 column_label 取值个数。 */
  for (const p of ['COLUMN_LABEL', 'column_label'] as const) {
    if (keys.includes(p)) {
      return p;
    }
  }
  const prefer = ['METRIC_NAME', 'metric_name', 'METRIC_COLUMN', 'metric_column'];
  for (const p of prefer) {
    if (keys.includes(p)) {
      return p;
    }
  }
  return undefined;
}

/** 当 findGroupKey 无返回值但需按指标拆图时：找多值列。 */
function findSplitMetricKey(rows: Record<string, unknown>[]): string | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  const candidates = [
    'COLUMN_LABEL',
    'column_label',
    'METRIC_NAME',
    'metric_name',
    'METRIC_COLUMN',
    'metric_column',
    'TARGET_NAME',
    'target_name'
  ];
  const keys = Object.keys(rows[0]);
  for (const c of candidates) {
    if (!keys.includes(c)) {
      continue;
    }
    const distinct = new Set(rows.map(r => String(r[c] ?? '')));
    if (distinct.size > 1) {
      return c;
    }
  }
  return undefined;
}

/** Prefer COLUMN_LABEL / metric columns for CPU-style breakdown (X = category). */
function findCategoryColumn(rows: Record<string, unknown>[]): string | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  const keys = Object.keys(rows[0]);
  const tk = findTimeColumn(rows);
  const vk = findValueColumn(rows);
  const preferOrder = [
    'COLUMN_LABEL',
    'column_label',
    'METRIC_COLUMN',
    'metric_column',
    'METRIC_NAME',
    'metric_name'
  ];
  for (const p of preferOrder) {
    if (keys.includes(p) && p !== tk && p !== vk && !isSensitiveKey(p)) {
      return p;
    }
  }
  const lower = keys.map(k => k.toLowerCase());
  for (const p of ['column_label', 'metric_column', 'metric_name']) {
    const idx = lower.indexOf(p);
    if (idx >= 0) {
      const k = keys[idx];
      if (k !== tk && k !== vk && !isSensitiveKey(k)) {
        return k;
      }
    }
  }
  for (const k of keys) {
    if (k === tk || k === vk || isSensitiveKey(k)) {
      continue;
    }
    const v = rows[0][k];
    if (typeof v === 'string' || typeof v === 'number') {
      return k;
    }
  }
  return keys.find(k => !isSensitiveKey(k) && k !== tk && k !== vk);
}

function friendlyAxisName(columnKey: string): string {
  const map: Record<string, string> = {
    COLUMN_LABEL: '指标',
    column_label: '指标',
    METRIC_COLUMN: '监控项',
    metric_column: '监控项',
    METRIC_NAME: '指标名',
    metric_name: '指标名',
    VALUE: '数值',
    value: '数值',
    collection_timestamp: '时间',
    COLLECTION_TIMESTAMP: '时间'
  };
  return map[columnKey] ?? columnKey;
}

function findTwoNumericColumns(rows: Record<string, unknown>[]): [string, string] | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  const keys = Object.keys(rows[0]).filter(k => !isSensitiveKey(k));
  const numericKeys: string[] = [];
  for (const k of keys) {
    if (parseNumber(rows[0][k]) !== undefined) {
      numericKeys.push(k);
    }
  }
  if (numericKeys.length >= 2) {
    return [numericKeys[0], numericKeys[1]];
  }
  return undefined;
}

function getMetricNameColumnKey(rows: Record<string, unknown>[]): string | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  const keys = Object.keys(rows[0]);
  if (keys.includes('METRIC_NAME')) {
    return 'METRIC_NAME';
  }
  if (keys.includes('metric_name')) {
    return 'metric_name';
  }
  return undefined;
}

/** 语义分桶：METRIC_NAME 单值时仍可按列名拆成多图（含 4 类及以上）。 */
type MetricSemanticBucket = 'cpu' | 'memory' | 'disk' | 'io' | 'network';

const METRIC_BUCKET_ORDER: Array<{ key: MetricSemanticBucket; title: string }> = [
  { key: 'cpu', title: 'CPU' },
  { key: 'memory', title: '内存' },
  { key: 'disk', title: '磁盘' },
  { key: 'io', title: 'I/O' },
  { key: 'network', title: '网络' }
];

/**
 * 单行归入一类；顺序固定，减少 CPU/内存/I/O 重叠时的歧义。
 */
function bucketMetricCategory(row: Record<string, unknown>): MetricSemanticBucket | null {
  const mn = String(row.METRIC_NAME ?? row.metric_name ?? '').toLowerCase();
  const cl = String(row.COLUMN_LABEL ?? row.column_label ?? '');
  const clLower = cl.toLowerCase();
  const mc = String(row.METRIC_COLUMN ?? row.metric_column ?? '').toLowerCase();
  const ml = String(row.METRIC_LABEL ?? row.metric_label ?? '').toLowerCase();
  const hay = `${mn} ${clLower} ${mc} ${ml}`;
  const hayZh = `${cl} ${mn} ${mc} ${ml}`;

  if (/\b(load|cpu)\b/.test(mn)) {
    return 'cpu';
  }
  if (/\bmemory\b/.test(mn)) {
    return 'memory';
  }
  if (/\b(filesystems|filesystem|response)\b/.test(mn) && !/memory/i.test(mn)) {
    return 'disk';
  }

  const memHit =
    /\b(memory|mem|sga|pga|buffer cache|heap size)\b/.test(hay) ||
    /内存|sga|pga|缓冲池/i.test(hayZh);
  const cpuHit =
    /\b(cpu|load|processor|cores|time per sec|usage)\b/.test(hay) ||
    /cpu|处理器|负载|使用量|利用率/i.test(hayZh);
  const diskHit =
    /filesystem|disk space|tablespace|archive area|usable fast recovery|磁盘|表空间|归档|未保护数据窗口/i.test(
      hay
    ) || /表空间|磁盘|空间\s*\(/i.test(hayZh);
  const ioHit =
    /physical read|physical write|i\s*\/\s*o|io wait|foreground wait|read.*latency|write.*latency/i.test(
      hay
    ) || /物理读|物理写|等待.*类|i\s*\/\s*o/i.test(hayZh);
  const netHit = /\bnetwork\b|tcp|traffic|listener|网络|监听/i.test(hay + hayZh);

  if (netHit && !cpuHit && !memHit) {
    return 'network';
  }
  if (diskHit && !ioHit) {
    return 'disk';
  }
  if (ioHit && !diskHit) {
    return 'io';
  }
  if (diskHit && ioHit) {
    return /tablespace|filesystem|space\s*\(|磁盘|表空间|archive|fast recovery/i.test(hay + hayZh)
      ? 'disk'
      : 'io';
  }
  if (cpuHit && !memHit) {
    return 'cpu';
  }
  if (memHit && !cpuHit) {
    return 'memory';
  }
  if (cpuHit && memHit) {
    return clLower.includes('memory') || /内存|sga|pga/i.test(hayZh) ? 'memory' : 'cpu';
  }
  return null;
}

function getColumnLabelKey(rows: Record<string, unknown>[]): string | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  const keys = Object.keys(rows[0]);
  if (keys.includes('COLUMN_LABEL')) {
    return 'COLUMN_LABEL';
  }
  if (keys.includes('column_label')) {
    return 'column_label';
  }
  return undefined;
}

function truncateLegendLabel(s: string, max = 80): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/** 仅根据 COLUMN_LABEL 文本做语义分桶，用于多条线两两拆图。 */
function columnLabelSemanticBucket(label: string): MetricSemanticBucket | 'other' {
  const row: Record<string, unknown> = {
    COLUMN_LABEL: label,
    column_label: label,
    METRIC_NAME: '',
    metric_name: '',
    METRIC_COLUMN: '',
    metric_column: '',
    METRIC_LABEL: '',
    metric_label: ''
  };
  const b = bucketMetricCategory(row);
  return b ?? 'other';
}

/**
 * 同一折线图最多 2 条线：按语义桶内排序后两两一组；余 1 条单独一张图。
 */
function groupColumnLabelsIntoPairs(seriesNames: string[]): string[][] {
  const buckets = new Map<MetricSemanticBucket | 'other', string[]>();
  for (const name of seriesNames) {
    const b = columnLabelSemanticBucket(name);
    const arr = buckets.get(b) ?? [];
    arr.push(name);
    buckets.set(b, arr);
  }
  const order: Array<MetricSemanticBucket | 'other'> = [
    ...METRIC_BUCKET_ORDER.map(x => x.key),
    'other'
  ];
  const out: string[][] = [];
  for (const key of order) {
    const arr = [...(buckets.get(key) ?? [])].sort((a, b) => a.localeCompare(b));
    for (let i = 0; i < arr.length; i += 2) {
      out.push(arr.slice(i, i + 2));
    }
  }
  return out;
}

/** 单张折线图内 1～2 条 COLUMN_LABEL 系列。 */
function buildOneMultiSeriesLineChart(
  rows: Record<string, unknown>[],
  timeKey: string,
  valKey: string,
  columnLabelKey: string,
  seriesNames: string[],
  title: string
): FetchDataChartSpec | undefined {
  if (seriesNames.length < 1 || seriesNames.length > 2) {
    return undefined;
  }
  const sorted = sortRowsByTime(rows, timeKey).slice(-MAX_POINTS);
  const timeSet = new Set<string>();
  for (const r of sorted) {
    const col = String(r[columnLabelKey] ?? '').trim();
    if (!seriesNames.includes(col)) {
      continue;
    }
    const t = labelForTime(r[timeKey]);
    if (t !== '') {
      timeSet.add(t);
    }
  }
  const allLabels = [...timeSet].sort((a, b) => a.localeCompare(b));
  if (allLabels.length === 0) {
    return undefined;
  }
  const datasets: Array<{ label: string; data: (number | null)[] }> = [];
  for (const seriesName of seriesNames) {
    const timeToVal = new Map<string, number>();
    for (const r of sorted) {
      const col = String(r[columnLabelKey] ?? '').trim();
      if (col !== seriesName) {
        continue;
      }
      const t = labelForTime(r[timeKey]);
      if (t === '') {
        continue;
      }
      const v = parseNumber(r[valKey]);
      timeToVal.set(t, v === undefined ? 0 : v);
    }
    const data = allLabels.map(l => {
      const v = timeToVal.get(l);
      return v === undefined ? null : v;
    });
    datasets.push({ label: truncateLegendLabel(seriesName), data });
  }
  if (datasets.length === 0) {
    return undefined;
  }
  return {
    title,
    chartType: 'line',
    labels: allLabels,
    datasets,
    xAxisLabel: friendlyAxisName(timeKey),
    yAxisLabel: friendlyAxisName(valKey)
  };
}

function buildMultiSeriesLineCharts(
  rows: Record<string, unknown>[],
  timeKey: string,
  valKey: string,
  columnLabelKey: string,
  title: string
): FetchDataChartSpec[] {
  const sorted = sortRowsByTime(rows, timeKey).slice(-MAX_POINTS);
  const seriesNames = [
    ...new Set(sorted.map(r => String(r[columnLabelKey] ?? '').trim()).filter(Boolean))
  ].sort((a, b) => a.localeCompare(b));
  if (seriesNames.length < 2) {
    return [];
  }
  if (seriesNames.length <= 2) {
    const one = buildOneMultiSeriesLineChart(rows, timeKey, valKey, columnLabelKey, seriesNames, title);
    return one ? [one] : [];
  }
  const groups = groupColumnLabelsIntoPairs(seriesNames);
  const out: FetchDataChartSpec[] = [];
  const total = groups.length;
  groups.forEach((g, gi) => {
    const subTitle = total > 1 ? `${title} (${gi + 1}/${total})` : title;
    const spec = buildOneMultiSeriesLineChart(rows, timeKey, valKey, columnLabelKey, g, subTitle);
    if (spec) {
      out.push(spec);
    }
  });
  return out;
}

function buildLineChartFromRows(
  rows: Record<string, unknown>[],
  timeKey: string,
  valKey: string,
  title: string
): FetchDataChartSpec[] {
  if (rows.length === 0) {
    return [];
  }
  const clk = getColumnLabelKey(rows);
  if (clk) {
    const distinctLabels = [
      ...new Set(rows.map(r => String(r[clk] ?? '').trim()).filter(Boolean))
    ];
    if (distinctLabels.length >= 2) {
      return buildMultiSeriesLineCharts(rows, timeKey, valKey, clk, title);
    }
  }
  const sorted = sortRowsByTime(rows, timeKey).slice(-MAX_POINTS);
  const map = new Map<string, number>();
  for (const r of sorted) {
    const t = labelForTime(r[timeKey]);
    if (t === '') {
      continue;
    }
    const v = parseNumber(r[valKey]);
    map.set(t, v === undefined ? 0 : v);
  }
  const labels = [...map.keys()];
  const values = [...map.values()];
  if (labels.length === 0) {
    return [];
  }
  let datasetLabel = valKey;
  if (clk) {
    const one = [...new Set(rows.map(r => String(r[clk] ?? '').trim()).filter(Boolean))];
    if (one.length === 1) {
      datasetLabel = truncateLegendLabel(one[0]);
    }
  }
  return [
    {
      title,
      chartType: 'line',
      labels,
      datasets: [{ label: datasetLabel, data: values }],
      xAxisLabel: friendlyAxisName(timeKey),
      yAxisLabel: friendlyAxisName(valKey)
    }
  ];
}

/**
 * 时间范围类问题：latest_data 用折线图，横轴时间、纵轴 VALUE。
 */
function tryBuildLatestTimeRangeLineCharts(
  latest: Record<string, unknown>[],
  maxCharts: number,
  timeKey: string,
  valKey: string
): FetchDataChartSpec[] {
  const out: FetchDataChartSpec[] = [];
  const mk = getMetricNameColumnKey(latest);
  if (mk) {
    const byMetric = new Map<string, Record<string, unknown>[]>();
    for (const row of latest) {
      const name = String(row[mk] ?? '').trim() || '_';
      if (!byMetric.has(name)) {
        byMetric.set(name, []);
      }
      byMetric.get(name)!.push(row);
    }
    if (byMetric.size >= 1) {
      const names = [...byMetric.keys()].sort((a, b) => a.localeCompare(b));
      for (const name of names) {
        if (out.length >= maxCharts) {
          break;
        }
        const groupRows = byMetric.get(name);
        if (!groupRows?.length) {
          continue;
        }
        const specs = buildLineChartFromRows(groupRows, timeKey, valKey, `指标: ${name}`);
        for (const spec of specs) {
          if (out.length >= maxCharts) {
            break;
          }
          out.push(spec);
        }
      }
      if (out.length > 0) {
        return out;
      }
    }
  }

  const bySemantic = new Map<MetricSemanticBucket, Record<string, unknown>[]>();
  for (const b of METRIC_BUCKET_ORDER) {
    bySemantic.set(b.key, []);
  }
  for (const row of latest) {
    const cat = bucketMetricCategory(row);
    if (cat) {
      bySemantic.get(cat)!.push(row);
    }
  }
  const nonEmptyBuckets = METRIC_BUCKET_ORDER.filter(({ key }) => (bySemantic.get(key) ?? []).length > 0);
  if (nonEmptyBuckets.length >= 1) {
    for (const { key, title } of nonEmptyBuckets) {
      if (out.length >= maxCharts) {
        break;
      }
      const rows = bySemantic.get(key) ?? [];
      const specs = buildLineChartFromRows(rows, timeKey, valKey, `${title} 使用量`);
      for (const spec of specs) {
        if (out.length >= maxCharts) {
          break;
        }
        out.push(spec);
      }
    }
    if (out.length > 0) {
      return out;
    }
  }

  const specs = buildLineChartFromRows(latest, timeKey, valKey, 'latest_data (时间序列)');
  return specs.slice(0, maxCharts);
}

/**
 * latest_data：优先按 METRIC_NAME 多值拆图（OEM 多指标组 → 任意多张，受 maxCharts 限制）；
 * 否则按语义分桶（CPU/内存/磁盘/I/O/网络），至少两桶有数据则每桶一图。
 */
function tryBuildLatestGroupedBarCharts(
  latest: Record<string, unknown>[],
  maxCharts: number,
  prefs: ChartPreferences
): FetchDataChartSpec[] {
  const out: FetchDataChartSpec[] = [];
  if (latest.length === 0 || maxCharts < 1) {
    return out;
  }
  const valKey = findValueColumn(latest);
  if (!valKey) {
    return out;
  }

  if (prefs.timeRangeQuery) {
    const timeKey = findTimeColumn(latest);
    if (timeKey && timeKey !== valKey) {
      const lineCharts = tryBuildLatestTimeRangeLineCharts(latest, maxCharts, timeKey, valKey);
      if (lineCharts.length > 0) {
        return lineCharts;
      }
    }
  }

  const buildBucketChart = (
    rows: Record<string, unknown>[],
    title: string
  ): FetchDataChartSpec | undefined => {
    let catKey = findCategoryColumn(rows);
    if (!catKey || catKey === valKey) {
      const k0 = Object.keys(rows[0]);
      catKey = k0.find(k => (k === 'COLUMN_LABEL' || k === 'column_label') && k !== valKey);
    }
    if (!catKey || catKey === valKey) {
      return undefined;
    }
    const slice = rows.slice(0, MAX_POINTS);
    const labels = slice.map(r => String(r[catKey] ?? '').slice(0, 40));
    const values = slice.map(r => parseNumber(r[valKey])).map(v => (v === undefined ? 0 : v));
    if (!labels.some(Boolean)) {
      return undefined;
    }
    return {
      title,
      chartType: 'bar',
      labels,
      datasets: [{ label: valKey, data: values }],
      xAxisLabel: friendlyAxisName(catKey),
      yAxisLabel: friendlyAxisName(valKey)
    };
  };

  const mk = getMetricNameColumnKey(latest);
  if (mk) {
    const byMetric = new Map<string, Record<string, unknown>[]>();
    for (const row of latest) {
      const name = String(row[mk] ?? '').trim() || '_';
      if (!byMetric.has(name)) {
        byMetric.set(name, []);
      }
      byMetric.get(name)!.push(row);
    }
    if (byMetric.size >= 2) {
      const names = [...byMetric.keys()].sort((a, b) => a.localeCompare(b));
      for (const name of names) {
        if (out.length >= maxCharts) {
          break;
        }
        const groupRows = byMetric.get(name);
        if (!groupRows?.length) {
          continue;
        }
        let catKey = findCategoryColumn(groupRows);
        if (!catKey || catKey === valKey) {
          const k0 = Object.keys(groupRows[0]);
          catKey = k0.find(k => (k === 'COLUMN_LABEL' || k === 'column_label') && k !== valKey);
        }
        if (!catKey || catKey === valKey) {
          continue;
        }
        const slice = groupRows.slice(0, MAX_POINTS);
        const labels = slice.map(r => String(r[catKey] ?? '').slice(0, 40));
        const values = slice.map(r => parseNumber(r[valKey])).map(v => (v === undefined ? 0 : v));
        if (!labels.some(Boolean)) {
          continue;
        }
        out.push({
          title: `指标: ${name}`,
          chartType: 'bar',
          labels,
          datasets: [{ label: valKey, data: values }],
          xAxisLabel: friendlyAxisName(catKey),
          yAxisLabel: friendlyAxisName(valKey)
        });
      }
      if (out.length > 0) {
        return out;
      }
    }
  }

  const bySemantic = new Map<MetricSemanticBucket, Record<string, unknown>[]>();
  for (const b of METRIC_BUCKET_ORDER) {
    bySemantic.set(b.key, []);
  }
  for (const row of latest) {
    const cat = bucketMetricCategory(row);
    if (cat) {
      bySemantic.get(cat)!.push(row);
    }
  }
  const nonEmptyBuckets = METRIC_BUCKET_ORDER.filter(({ key }) => (bySemantic.get(key) ?? []).length > 0);
  if (nonEmptyBuckets.length >= 2) {
    for (const { key, title } of nonEmptyBuckets) {
      if (out.length >= maxCharts) {
        break;
      }
      const rows = bySemantic.get(key) ?? [];
      const chart = buildBucketChart(rows, `${title} 使用量`);
      if (chart) {
        out.push(chart);
      }
    }
    if (out.length > 0) {
      return out;
    }
  }

  return out;
}

function sortRowsByTime(rows: Record<string, unknown>[], timeKey: string): Record<string, unknown>[] {
  return [...rows].sort((a, b) => {
    const ta = String(a[timeKey] ?? '');
    const tb = String(b[timeKey] ?? '');
    return ta.localeCompare(tb);
  });
}

function labelForTime(v: unknown): string {
  if (v === null || v === undefined) {
    return '';
  }
  const s = String(v);
  return s.length > 32 ? s.slice(0, 29) + '…' : s;
}

/** Table cells for two-numeric-column display (replaces scatter/bubble). */
function formatChartTableNumber(n: number): string {
  if (!Number.isFinite(n)) {
    return '';
  }
  if (Number.isInteger(n) && Math.abs(n) < 1e15) {
    return String(n);
  }
  const a = Math.abs(n);
  if (a >= 1e7 || (a > 0 && a < 1e-4)) {
    return n.toExponential(4);
  }
  const s = n.toFixed(6);
  return s.replace(/\.?0+$/, '');
}

function formatChartTableCell(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) {
    return '';
  }
  return formatChartTableNumber(Number(v));
}

/** 折线/柱状 → 表格（多系列为多列）。 */
function lineOrBarChartToTable(chart: FetchDataChartSpec): FetchDataChartSpec {
  if (chart.chartType !== 'line' && chart.chartType !== 'bar') {
    return chart;
  }
  const labels = chart.labels ?? [];
  const datasets = chart.datasets ?? [];
  if (labels.length === 0 || datasets.length === 0) {
    return chart;
  }
  const xLabel = chart.xAxisLabel || '类别';
  const cols: string[] = [xLabel, ...datasets.map(d => String(d.label || chart.yAxisLabel || '值'))];
  const rows: string[][] = labels.map((_, i) => {
    const row: string[] = [String(labels[i] ?? '')];
    for (const ds of datasets) {
      row.push(formatChartTableCell(ds.data[i] as number | null | undefined));
    }
    return row;
  });
  return {
    ...chart,
    chartType: 'table',
    labels: [],
    datasets: [],
    tableColumns: cols,
    tableRows: rows,
    scatterPoints: undefined
  };
}

/** 折线图横轴点数 ≤3 时用表格更清晰。 */
function lineChartWithAtMostThreePointsToTable(chart: FetchDataChartSpec): FetchDataChartSpec {
  if (chart.chartType !== 'line') {
    return chart;
  }
  const n = chart.labels?.length ?? 0;
  if (n === 0 || n > 3) {
    return chart;
  }
  return lineOrBarChartToTable(chart);
}

function applyChartTypePreference(
  chart: FetchDataChartSpec,
  pref?: 'line' | 'bar' | 'scatter'
): FetchDataChartSpec {
  /**
   * Legacy scatter payloads: table unless user explicitly wants line/bar (must run before pref-match early return,
   * otherwise pref===scatter and chartType===scatter would skip normalization).
   */
  if (chart.chartType === 'scatter' && chart.scatterPoints?.length) {
    const pts = chart.scatterPoints;
    if (pref === 'line' || pref === 'bar') {
      return {
        ...chart,
        chartType: pref,
        labels: pts.map((_, i) => String(i + 1)),
        datasets: [{ label: chart.title, data: pts.map(p => p.y) }],
        scatterPoints: undefined
      };
    }
    const xLab = chart.xAxisLabel || 'X';
    const yLab = chart.yAxisLabel || 'Y';
    chart = {
      ...chart,
      chartType: 'table',
      labels: [],
      datasets: [],
      tableColumns: [xLab, yLab],
      tableRows: pts.map(p => [formatChartTableNumber(p.x), formatChartTableNumber(p.y)]),
      scatterPoints: undefined,
      xAxisLabel: chart.xAxisLabel,
      yAxisLabel: chart.yAxisLabel
    };
  }

  if (!pref || chart.chartType === pref) {
    return chart;
  }

  /** Two-column numeric table: scatter preference keeps table (no bubble). Line/bar pref converts to chart. */
  if (chart.chartType === 'table' && chart.tableRows?.length && chart.tableColumns?.length === 2) {
    if (pref === 'scatter') {
      return chart;
    }
    if (pref === 'line' || pref === 'bar') {
      const ys = chart.tableRows.map(r => Number(r[1])).filter(Number.isFinite);
      if (ys.length === chart.tableRows.length && ys.length > 0) {
        return {
          ...chart,
          chartType: pref,
          labels: chart.tableRows.map((_, i) => String(i + 1)),
          datasets: [{ label: chart.title, data: ys }],
          tableColumns: undefined,
          tableRows: undefined,
          scatterPoints: undefined
        };
      }
    }
    return chart;
  }

  if (pref === 'scatter') {
    if (chart.chartType === 'line' || chart.chartType === 'bar') {
      const ds0 = chart.datasets[0];
      const labels = chart.labels;
      const vals = ds0?.data ?? [];
      const xLabel = chart.xAxisLabel || '序号';
      const yLabel = String(ds0?.label ?? chart.yAxisLabel ?? '值');
      return {
        ...chart,
        chartType: 'table',
        labels: [],
        datasets: [],
        tableColumns: [xLabel, yLabel],
        tableRows: labels.map((l, i) => {
          const v = vals[i];
          const y =
            v === null || v === undefined ? '' : formatChartTableNumber(Number(v));
          return [String(l), y];
        }),
        scatterPoints: undefined,
        xAxisLabel: chart.xAxisLabel,
        yAxisLabel: chart.yAxisLabel
      };
    }
    return chart;
  }

  if (
    (chart.chartType === 'line' || chart.chartType === 'bar') &&
    (pref === 'line' || pref === 'bar')
  ) {
    return { ...chart, chartType: pref };
  }

  return chart;
}

function mergeLineChartSpecs(charts: FetchDataChartSpec[]): FetchDataChartSpec[] {
  const lines = charts.filter(c => c.chartType === 'line' && c.datasets.length === 1);
  if (lines.length < 2) {
    return charts;
  }
  const nonLine = charts.filter(c => !lines.includes(c));
  const allLabels = [...new Set(lines.flatMap(c => c.labels))].sort();
  const datasets = lines.map(c => {
    const map = new Map(c.labels.map((l, i) => [l, c.datasets[0].data[i]]));
    return {
      label: c.title.replace(/^指标:\s*/, '') || c.datasets[0].label,
      data: allLabels.map(l => {
        const v = map.get(l);
        return v === undefined ? null : v;
      })
    };
  });
  const merged: FetchDataChartSpec = {
    title: '多指标对比',
    chartType: 'line',
    labels: allLabels,
    datasets,
    xAxisLabel: lines[0].xAxisLabel,
    yAxisLabel: lines[0].yAxisLabel
  };
  return [...nonLine, merged];
}

/**
 * latest_data 含多条不同采集时间时，视为时间范围查询结果，优先折线图（横轴时间、纵轴数值）。
 */
function mergeChartPrefsForLatestData(
  prefs: ChartPreferences,
  latest: Record<string, unknown>[]
): ChartPreferences {
  if (latest.length < 2) {
    return prefs;
  }
  const tk = findTimeColumn(latest);
  if (!tk) {
    return prefs;
  }
  const distinctTimes = new Set(
    latest.map(r => {
      const v = r[tk];
      return v === null || v === undefined ? '' : String(v);
    })
  );
  if (distinctTimes.size < 2) {
    return prefs;
  }
  const out: ChartPreferences = { ...prefs, timeRangeQuery: true };
  if (prefs.chartType !== 'bar' && prefs.chartType !== 'scatter') {
    out.chartType = prefs.chartType ?? 'line';
  }
  return out;
}

/**
 * Build chart specs from MCP fetch_data_from_oem JSON string (unredacted).
 * userQuestion：与工具入参 question 一致，用于解析图表类型、分图/合图等偏好。
 */
export function buildFetchDataChartsPayload(
  rawToolResult: string,
  userQuestion?: string
): FetchDataChartsPayload | undefined {
  const prefs = parseChartPreferencesFromQuestion(userQuestion ?? '');
  const capCharts = Math.min(MAX_CHARTS, prefs.maxCharts ?? MAX_CHARTS);

  const trimmed = rawToolResult.trim();
  if (!trimmed.startsWith('{')) {
    return undefined;
  }
  let root: Record<string, unknown>;
  try {
    root = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return undefined;
  }
  if (root.ok !== true) {
    return undefined;
  }
  if (root.multi_query === true && Array.isArray(root.sub_results)) {
    const subs = root.sub_results as Array<Record<string, unknown>>;
    const mergedCharts: FetchDataChartSpec[] = [];
    for (const sub of subs) {
      if (mergedCharts.length >= capCharts) {
        break;
      }
      const subData = sub.data as Record<string, unknown> | undefined;
      const subQ = String(sub.sub_question ?? userQuestion ?? '');
      if (!subData || typeof subData !== 'object') {
        continue;
      }
      const fakeRoot = {
        ok: true,
        data: subData,
        intent: root.intent,
        routing: root.routing
      };
      const subPayload = buildFetchDataChartsPayload(JSON.stringify(fakeRoot), subQ);
      const subCharts = subPayload?.charts ?? [];
      for (const c of subCharts) {
        if (mergedCharts.length >= capCharts) {
          break;
        }
        mergedCharts.push(c);
      }
    }
    return mergedCharts.length
      ? finalizeCharts(mergedCharts.slice(0, capCharts), { ...prefs, splitByMetric: true }, capCharts)
      : undefined;
  }
  const data = root.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const charts: FetchDataChartSpec[] = [];

  const ts = asRowArray(data.metric_time_series);
  const latest = asRowArray(data.latest_data);
  const chartPrefs = mergeChartPrefsForLatestData(prefs, latest);

  const metricKeys = (root.intent as Record<string, unknown> | undefined)?.metric_keys;
  const metricKeyList = Array.isArray(metricKeys)
    ? metricKeys.filter((x): x is string => typeof x === 'string')
    : [];

  if (ts.length > 0) {
    let gk = findGroupKey(ts);
    if (chartPrefs.splitByMetric === true && !gk) {
      gk = findSplitMetricKey(ts);
    }
    if (gk) {
      const byGroup = new Map<string, Record<string, unknown>[]>();
      for (const row of ts) {
        const g = String(row[gk] ?? 'default');
        if (!byGroup.has(g)) {
          byGroup.set(g, []);
        }
        byGroup.get(g)!.push(row);
      }
      const groupNames = [...byGroup.keys()].sort();
      const orderedGroups =
        metricKeyList.length > 0
          ? metricKeyList.filter(m => byGroup.has(m)).concat(groupNames.filter(g => !metricKeyList.includes(g)))
          : groupNames;

      for (const g of orderedGroups) {
        if (charts.length >= capCharts) {
          break;
        }
        const groupRows = byGroup.get(g);
        if (!groupRows?.length) {
          continue;
        }
        const timeKey = findTimeColumn(groupRows);
        const valKey = findValueColumn(groupRows);
        if (!timeKey || !valKey) {
          continue;
        }
        const lineSpecs = buildLineChartFromRows(groupRows, timeKey, valKey, `指标: ${g}`);
        for (const spec of lineSpecs) {
          if (charts.length >= capCharts) {
            break;
          }
          charts.push(spec);
        }
      }
    } else {
      const timeKey = findTimeColumn(ts);
      const valKey = findValueColumn(ts);
      if (timeKey && valKey) {
        const lineSpecs = buildLineChartFromRows(ts, timeKey, valKey, 'metric_time_series');
        for (const spec of lineSpecs) {
          if (charts.length >= capCharts) {
            break;
          }
          charts.push(spec);
        }
      }
    }
  }

  if (charts.length >= capCharts) {
    return finalizeCharts(charts.slice(0, capCharts), chartPrefs, capCharts);
  }

  if (latest.length > 0 && charts.length < capCharts) {
    const groupedBars = tryBuildLatestGroupedBarCharts(latest, capCharts - charts.length, chartPrefs);
    if (groupedBars.length > 0) {
      charts.push(...groupedBars);
    } else {
    const catKey = findCategoryColumn(latest);
    const valKey = findValueColumn(latest);
    const timeKey = findTimeColumn(latest);

    if (catKey && valKey && catKey !== valKey) {
      if (chartPrefs.timeRangeQuery && timeKey && timeKey !== valKey) {
        const lineSpecs = buildLineChartFromRows(latest, timeKey, valKey, `${catKey} vs ${valKey}`);
        for (const lineSpec of lineSpecs) {
          if (charts.length >= capCharts) {
            break;
          }
          charts.push(lineSpec);
        }
      } else {
        const slice = latest.slice(0, MAX_POINTS);
        const labels = slice.map(r => String(r[catKey] ?? '').slice(0, 40));
        const values = slice.map(r => parseNumber(r[valKey])).map(v => (v === undefined ? 0 : v));
        if (labels.some(Boolean)) {
          charts.push({
            title: `${catKey} vs ${valKey}`,
            chartType: 'bar',
            labels,
            datasets: [{ label: valKey, data: values }],
            xAxisLabel: friendlyAxisName(catKey),
            yAxisLabel: friendlyAxisName(valKey)
          });
        }
      }
    } else if (timeKey && valKey && !charts.some(c => c.title.includes('latest_data'))) {
      const sorted = sortRowsByTime(latest, timeKey).slice(-MAX_POINTS);
      const labels = sorted.map(r => labelForTime(r[timeKey]));
      const values = sorted.map(r => parseNumber(r[valKey])).map(v => (v === undefined ? 0 : v));
      if (labels.length) {
        charts.push({
          title: 'latest_data (time series)',
          chartType: 'line',
          labels,
          datasets: [{ label: valKey, data: values }],
          xAxisLabel: friendlyAxisName(timeKey),
          yAxisLabel: friendlyAxisName(valKey)
        });
      }
    } else {
      const pair = findTwoNumericColumns(latest);
      if (pair) {
        const [k1, k2] = pair;
        const pts = latest
          .slice(0, MAX_POINTS)
          .map(r => {
            const x = parseNumber(r[k1]);
            const y = parseNumber(r[k2]);
            if (x === undefined || y === undefined) {
              return undefined;
            }
            return { x, y };
          })
          .filter((p): p is { x: number; y: number } => p !== undefined);
        const xLab = friendlyAxisName(k1);
        const yLab = friendlyAxisName(k2);
        const title = `${k1} vs ${k2}`;
        if (pts.length >= 1) {
          charts.push({
            title,
            chartType: 'table',
            labels: [],
            datasets: [],
            tableColumns: [xLab, yLab],
            tableRows: pts.map(p => [formatChartTableNumber(p.x), formatChartTableNumber(p.y)]),
            xAxisLabel: xLab,
            yAxisLabel: yLab
          });
        }
      }
    }
    }
  }

  if (charts.length === 0) {
    return undefined;
  }
  return finalizeCharts(charts.slice(0, capCharts), chartPrefs, capCharts);
}

function finalizeCharts(
  charts: FetchDataChartSpec[],
  prefs: ChartPreferences,
  capCharts: number
): FetchDataChartsPayload | undefined {
  if (charts.length === 0) {
    return undefined;
  }
  let out = charts.slice(0, capCharts);
  if (prefs.splitByMetric === false && out.filter(c => c.chartType === 'line').length > 1) {
    out = mergeLineChartSpecs(out);
  }
  out = out.map(c => lineChartWithAtMostThreePointsToTable(c));
  out = out.map(c => applyChartTypePreference(c, prefs.chartType));
  return { charts: out.slice(0, capCharts) };
}
