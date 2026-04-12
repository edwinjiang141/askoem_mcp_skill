import * as vscode from 'vscode';
import type {
  AssistantResult,
  ConversationMeta,
  ConversationsBootstrapPayload,
  StoredChatMessage
} from '../types/appTypes';
import { buildChatPanelHtml } from './chatPanelHtml';

export class RagChatPanel {
  private static current: RagChatPanel | undefined;
  private readonly panel: vscode.WebviewPanel;

  static createOrShow(context: vscode.ExtensionContext): RagChatPanel {
    if (RagChatPanel.current) {
      RagChatPanel.current.panel.reveal(vscode.ViewColumn.One);
      return RagChatPanel.current;
    }

    const panel = vscode.window.createWebviewPanel(
      'alertMcpRagConsole',
      'OEM RAG Console',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
      }
    );

    RagChatPanel.current = new RagChatPanel(panel, context);
    return RagChatPanel.current;
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.panel.onDidDispose(() => {
      RagChatPanel.current = undefined;
    });
    const csp = [
      `default-src 'none'`,
      `style-src ${this.panel.webview.cspSource} 'unsafe-inline'`,
      `script-src ${this.panel.webview.cspSource} 'unsafe-inline'`,
      `img-src ${this.panel.webview.cspSource} data:`,
      `font-src ${this.panel.webview.cspSource} data:`
    ].join('; ');
    this.panel.webview.html = this.renderHtml(csp);
  }

  onDidReceiveMessage(handler: (message: Record<string, unknown>) => void): vscode.Disposable {
    return this.panel.webview.onDidReceiveMessage(handler);
  }

  setPanelTitle(title: string): void {
    const t = title.trim();
    this.panel.title =
      t.length > 0 ? `OEM RAG: ${t.length > 40 ? `${t.slice(0, 37)}...` : t}` : 'OEM RAG Console';
  }

  postBootstrap(payload: ConversationsBootstrapPayload): void {
    this.panel.webview.postMessage({ type: 'conversations-bootstrap', payload });
  }

  postConversationActivate(activeId: string, messages: StoredChatMessage[]): void {
    this.panel.webview.postMessage({
      type: 'conversation-activate',
      payload: { activeId, messages }
    });
  }

  postConversationListUpdate(items: ConversationMeta[], activeId: string): void {
    this.panel.webview.postMessage({
      type: 'conversations-list',
      payload: { items, activeId }
    });
  }

  postAssistantResult(
    conversationId: string,
    question: string,
    result: AssistantResult,
    _showFetchDataCharts: boolean
  ): void {
    this.panel.webview.postMessage({
      type: 'assistant-result',
      payload: { conversationId, question, result, showFetchDataCharts: false }
    });
  }

  postInfo(text: string): void {
    this.panel.webview.postMessage({ type: 'info', payload: text });
  }

  private renderHtml(csp: string): string {
    return buildChatPanelHtml({ mode: 'rag', chartSrc: '', csp });
  }
}
