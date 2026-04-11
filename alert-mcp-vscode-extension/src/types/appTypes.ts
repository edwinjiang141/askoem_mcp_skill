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
  };
  oem: {
    baseUrl: string;
    username: string;
  };
}

export interface AssistantResult {
  finalText: string;
  steps: ExecutionStep[];
}

export interface ExecutionStep {
  type: 'thought' | 'tool-call' | 'tool-result' | 'info' | 'error';
  title: string;
  detail: string;
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
