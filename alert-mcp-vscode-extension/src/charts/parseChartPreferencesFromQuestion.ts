/**
 * 从用户自然语言问题中解析图表展示偏好（不传则扩展侧不强制，由 build 使用默认逻辑）。
 */

export interface ChartPreferences {
  /** 用户明确指定的图表类型 */
  chartType?: 'line' | 'bar' | 'scatter';
  /** true：每个指标单独一图；false：尽量合并为一张图（多系列折线） */
  splitByMetric?: boolean;
  /** 如「3个图」限制数量，与 MAX_CHARTS 取较小 */
  maxCharts?: number;
  /** 问题含时间范围/趋势/历史时：latest_data 优先用折线图，横轴时间、纵轴数值 */
  timeRangeQuery?: boolean;
}

/**
 * 输入：传给 fetch_data_from_oem 的 question 全文（与 MCP 一致）。
 */
export function parseChartPreferencesFromQuestion(question: string): ChartPreferences {
  const q = (question || '').trim();
  if (!q) {
    return {};
  }

  const prefs: ChartPreferences = {};

  const mergeOneChart =
    /(合并|一张图|单个图|一图|合在.{0,3}图).{0,8}(展示|显示|画)/i.test(q) ||
    /(用|要|展示|画).{0,6}(一张|单个|一个)(图)?/i.test(q) ||
    /(只|仅).{0,4}(要|需要|展示).{0,4}一(张|个)图/i.test(q);

  const splitMetrics =
    /(分开展示|分别展示|分别.*图|每个指标|各指标|指标分别|一指标一图|一图一指标|每.{0,4}指标.{0,6}图|单独.{0,4}图|多图|分开.{0,4}画|各画.{0,4}图)/i.test(q) ||
    /(每个|分别).{0,4}(指标|监控项).{0,8}(图|展示|画)/i.test(q) ||
    /(不同|多个).{0,4}指标.{0,8}(分|各|分别)/i.test(q);

  if (splitMetrics && !mergeOneChart) {
    prefs.splitByMetric = true;
  } else if (mergeOneChart && !splitMetrics) {
    prefs.splitByMetric = false;
  }

  const mNum = q.match(/(\d+)\s*[个张幅]\s*图/);
  if (mNum) {
    const n = parseInt(mNum[1], 10);
    if (n > 0 && n <= 10) {
      prefs.maxCharts = n;
    }
  }

  // 类型：中文优先于英文，后出现的覆盖（简单：按特异性检测）
  if (/散点图/.test(q) || /\bscatter\b/i.test(q)) {
    prefs.chartType = 'scatter';
  } else if (/柱状图|条形图/.test(q) || /\bbar\s*chart\b/i.test(q) || /(?<![折])柱状/.test(q)) {
    prefs.chartType = 'bar';
  } else if (/折线图|趋势图/.test(q) || /\bline\s*chart\b/i.test(q)) {
    prefs.chartType = 'line';
  }

  if (/\bbar\b/i.test(q) && !/柱状|条形/.test(q) && !prefs.chartType) {
    prefs.chartType = 'bar';
  }
  if (/\bline\b/i.test(q) && !/折线|趋势/.test(q) && !prefs.chartType && /chart|图/.test(q)) {
    prefs.chartType = 'line';
  }

  const timeRangeQuery =
    /(?:最近|过去|近)\s*\d+\s*(?:小时|天|周|月|分钟|分)/.test(q) ||
    /\d+\s*(?:h|小时|hr|天|周|week|days?|分钟|分)\b/i.test(q) ||
    /(?:24|48|72)\s*小时/.test(q) ||
    /时间范围|时段|从\s*.+\s*到|between|last\s+\d+/i.test(q) ||
    /趋势|历史|变化|时序|走势|随时间/.test(q) ||
    /今日|昨日|本周|本月|上周/.test(q) ||
    /\b(?:24h|7d|1w|30d)\b/i.test(q) ||
    /过去\s*\d+\s*(?:小时|天)/.test(q);

  if (timeRangeQuery) {
    prefs.timeRangeQuery = true;
    if (!prefs.chartType) {
      prefs.chartType = 'line';
    }
  }

  return prefs;
}
