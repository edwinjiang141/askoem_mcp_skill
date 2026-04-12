export type ConnectionMode = 'auto' | 'legacy-sse' | 'streamable-http';
export type LlmProvider = 'openai-compatible' | 'copilot';

export interface ExtensionSettings {
  mcp: {
    serverUrl: string;
    connectionMode: ConnectionMode;
    requestTimeoutMs: number;
  };
  llm: {
    provider: LlmProvider;
    baseUrl: string;
    model: string;
    temperature: number;
  };
  ui: {
    maxToolRounds: number;
    /** When true, Webview renders charts for fetch_data_from_oem tool results (max 10 charts). */
    showFetchDataCharts: boolean;
  };
  oem: {
    baseUrl: string;
    username: string;
  };
  /** RAG console: Tavily search scoped to docs.oracle.com/en + blogs.oracle.com (API key in SecretStorage). */
  rag: {
    searchTopK: number;
    snippetMaxChars: number;
    fetchSnippetPages: number;
  };
}

export interface DocReferenceLink {
  title: string;
  url: string;
  /** Tavily result snippet; optional. */
  snippet?: string;
}

export interface AssistantResult {
  finalText: string;
  steps: ExecutionStep[];
  /** RAG console: links from Tavily (docs.oracle.com/en + blogs.oracle.com only). */
  referenceLinks?: DocReferenceLink[];
}

/** One chart block for Webview (Chart.js). */
export interface FetchDataChartSpec {
  title: string;
  chartType: 'line' | 'bar' | 'scatter' | 'table';
  /** Category or time labels (line/bar). */
  labels: string[];
  /** Series values for line/bar. `null` marks gaps when multiple series share one label axis. */
  datasets: Array<{ label: string; data: (number | null)[] }>;
  /** Legacy: [{x,y}, ...]; payload layer normalizes to table before Webview. */
  scatterPoints?: Array<{ x: number; y: number }>;
  /** Table: first column is category/time; more columns when multi-series. */
  tableColumns?: string[];
  tableRows?: string[][];
  /** Chart.js X axis title (e.g. 指标 / 时间). */
  xAxisLabel?: string;
  /** Chart.js Y axis title (e.g. 数值 / VALUE). */
  yAxisLabel?: string;
}

export interface FetchDataChartsPayload {
  charts: FetchDataChartSpec[];
}

export interface ExecutionStep {
  type: 'thought' | 'tool-call' | 'tool-result' | 'info' | 'error';
  title: string;
  detail: string;
  /** Present only for fetch_data_from_oem tool-result when data is chartable. */
  fetchCharts?: FetchDataChartsPayload;
}

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenAiCompatibleToolCall[];
}

/** One persisted chat session (metadata + full message list, no truncation). */
export interface ConversationMeta {
  id: string;
  title: string;
  updatedAt: number;
}

export type StoredChatMessage =
  | {
      id: string;
      kind: 'user';
      createdAt: number;
      text: string;
      preferredTools?: string[];
    }
  | {
      id: string;
      kind: 'assistant';
      createdAt: number;
      result: AssistantResult;
    }
  | {
      id: string;
      kind: 'info';
      createdAt: number;
      text: string;
    };

export interface ConversationSnapshot {
  meta: ConversationMeta;
  messages: StoredChatMessage[];
}

/** Webview bootstrap: list metadata + full messages for the active session only. */
export interface ConversationsBootstrapPayload {
  items: ConversationMeta[];
  activeId: string;
  activeMessages: StoredChatMessage[];
}

export interface OpenAiCompatibleToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAiCompatibleTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenAiCompatibleChoiceMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: OpenAiCompatibleToolCall[];
}
