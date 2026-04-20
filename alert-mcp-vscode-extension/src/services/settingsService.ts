import * as vscode from 'vscode';
import type { ExtensionSettings } from '../types/appTypes';

export class SettingsService {
  get(): ExtensionSettings {
    const config = vscode.workspace.getConfiguration('alertMcp');
    return {
      mcp: {
        serverUrl: config.get<string>('mcp.serverUrl', 'http://127.0.0.1:3000/sse'),
        connectionMode: config.get<'auto' | 'legacy-sse' | 'streamable-http'>('mcp.connectionMode', 'auto'),
        requestTimeoutMs: config.get<number>('mcp.requestTimeoutMs', 180000)
      },
      llm: {
        provider: config.get<'openai-compatible' | 'copilot'>('llm.provider', 'openai-compatible'),
        baseUrl: config.get<string>('llm.baseUrl', 'https://api.deepseek.com'),
        model: config.get<string>('llm.model', 'deepseek-chat'),
        temperature: config.get<number>('llm.temperature', 0.1)
      },
      ui: {
        maxToolRounds: config.get<number>('ui.maxToolRounds', 4),
        showFetchDataCharts: config.get<boolean>('ui.showFetchDataCharts', true)
      },
      oem: {
        baseUrl: config.get<string>('oem.baseUrl', ''),
        username: config.get<string>('oem.username', '')
      },
      rag: {
        searchTopK: config.get<number>('rag.searchTopK', 8),
        snippetMaxChars: config.get<number>('rag.snippetMaxChars', 6000),
        fetchSnippetPages: config.get<number>('rag.fetchSnippetPages', 3)
      }
    };
  }
}
