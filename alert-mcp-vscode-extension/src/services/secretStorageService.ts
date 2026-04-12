import * as vscode from 'vscode';

export class SecretStorageService {
  private static readonly LLM_API_KEY = 'alertMcp.llm.apiKey';
  private static readonly MCP_BEARER_TOKEN = 'alertMcp.mcp.bearerToken';
  private static readonly OEM_PASSWORD = 'alertMcp.oem.password';
  private static readonly TAVILY_API_KEY = 'alertMcp.rag.tavilyApiKey';

  constructor(private readonly context: vscode.ExtensionContext) {}

  async getLlmApiKey(): Promise<string | undefined> {
    return this.context.secrets.get(SecretStorageService.LLM_API_KEY);
  }

  async setLlmApiKey(value: string): Promise<void> {
    await this.context.secrets.store(SecretStorageService.LLM_API_KEY, value);
  }

  async getMcpBearerToken(): Promise<string | undefined> {
    return this.context.secrets.get(SecretStorageService.MCP_BEARER_TOKEN);
  }

  async setMcpBearerToken(value: string): Promise<void> {
    await this.context.secrets.store(SecretStorageService.MCP_BEARER_TOKEN, value);
  }
  async getOemPassword(): Promise<string | undefined> {
    return this.context.secrets.get(SecretStorageService.OEM_PASSWORD);
  }

  async setOemPassword(value: string): Promise<void> {
    await this.context.secrets.store(SecretStorageService.OEM_PASSWORD, value);
  }

  async getTavilyApiKey(): Promise<string | undefined> {
    return this.context.secrets.get(SecretStorageService.TAVILY_API_KEY);
  }

  async setTavilyApiKey(value: string): Promise<void> {
    await this.context.secrets.store(SecretStorageService.TAVILY_API_KEY, value);
  }
}

