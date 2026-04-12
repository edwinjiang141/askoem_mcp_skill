import * as vscode from 'vscode';
import { promptAndStoreLlmApiKey, promptAndStoreMcpToken } from './commands/commandHelpers';
import { AssistantOrchestrator } from './orchestration/assistantOrchestrator';
import { ConversationStore, messagesToChatTurns, RAG_CONVERSATIONS_STORAGE_KEY } from './services/conversationStore';
import { SecretStorageService } from './services/secretStorageService';
import { SettingsService } from './services/settingsService';
import { McpClientService } from './services/mcp/mcpClientService';
import { RagOrchestrator } from './orchestration/ragOrchestrator';
import { ChatPanel } from './views/chatPanel';
import { RagChatPanel } from './views/ragChatPanel';
import { OpsSidebarProvider } from './views/opsSidebarProvider';
import { SettingsPanel } from './views/settingsPanel';
import type { ChatTurn } from './types/appTypes';

interface AskMessagePayload {
  question: string;
  preferredTools?: string[];
}

const MAX_SESSION_CONTEXT_CHARS = 128 * 1024;

function trimSessionContext(turns: ChatTurn[]): void {
  let total = turns.reduce((sum, turn) => sum + turn.content.length, 0);
  while (total > MAX_SESSION_CONTEXT_CHARS && turns.length > 2) {
    const removed = turns.shift();
    total -= removed?.content.length ?? 0;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('OEM Assistant');
  const settingsService = new SettingsService();
  const secrets = new SecretStorageService(context);
  const mcpService = new McpClientService(output, secrets);
  const sidebar = new OpsSidebarProvider(mcpService, settingsService);
  const treeView = vscode.window.createTreeView('alertMcp.sidebar', {
    treeDataProvider: sidebar
  });

  const conversationStore = new ConversationStore(context);
  conversationStore.ensureAtLeastOneConversation();

  const ragConversationStore = new ConversationStore(context, RAG_CONVERSATIONS_STORAGE_KEY);
  ragConversationStore.ensureAtLeastOneConversation();

  const sessionContextMap = new Map<string, ChatTurn[]>();
  const oemSessionIdByConvId = new Map<string, string>();
  const ragSessionContextMap = new Map<string, ChatTurn[]>();

  const syncSessionContextFromStore = (convId: string): void => {
    const msgs = conversationStore.getMessagesForConversation(convId);
    sessionContextMap.set(convId, messagesToChatTurns(msgs));
  };

  const syncRagSessionContextFromStore = (convId: string): void => {
    const msgs = ragConversationStore.getMessagesForConversation(convId);
    ragSessionContextMap.set(convId, messagesToChatTurns(msgs));
  };

  syncSessionContextFromStore(conversationStore.getActiveId());
  syncRagSessionContextFromStore(ragConversationStore.getActiveId());

  context.subscriptions.push(output, treeView);

  let panel: ChatPanel | undefined;
  let panelMessageDisposable: vscode.Disposable | undefined;
  let ragPanel: RagChatPanel | undefined;
  let ragPanelMessageDisposable: vscode.Disposable | undefined;
  context.subscriptions.push(
    new vscode.Disposable(() => {
      panelMessageDisposable?.dispose();
      ragPanelMessageDisposable?.dispose();
    })
  );

  const pushSessionTurn = (convId: string, turn: ChatTurn): void => {
    const arr = sessionContextMap.get(convId) ?? [];
    arr.push(turn);
    trimSessionContext(arr);
    sessionContextMap.set(convId, arr);
  };

  const getContextForAsk = (convId: string): ChatTurn[] => {
    let ctx = sessionContextMap.get(convId);
    if (!ctx) {
      ctx = messagesToChatTurns(conversationStore.getMessagesForConversation(convId));
      sessionContextMap.set(convId, ctx);
    }
    return ctx;
  };

  const pushRagSessionTurn = (convId: string, turn: ChatTurn): void => {
    const arr = ragSessionContextMap.get(convId) ?? [];
    arr.push(turn);
    trimSessionContext(arr);
    ragSessionContextMap.set(convId, arr);
  };

  const getRagContextForAsk = (convId: string): ChatTurn[] => {
    let ctx = ragSessionContextMap.get(convId);
    if (!ctx) {
      ctx = messagesToChatTurns(ragConversationStore.getMessagesForConversation(convId));
      ragSessionContextMap.set(convId, ctx);
    }
    return ctx;
  };

  const refreshPanelTitle = (p: ChatPanel): void => {
    const id = conversationStore.getActiveId();
    const c = conversationStore.getConversation(id);
    p.setPanelTitle(c?.meta.title ?? '');
  };

  const refreshRagPanelTitle = (p: RagChatPanel): void => {
    const id = ragConversationStore.getActiveId();
    const c = ragConversationStore.getConversation(id);
    p.setPanelTitle(c?.meta.title ?? '');
  };

  const pushConversationListUpdate = (p: ChatPanel): void => {
    const boot = conversationStore.getBootstrapPayload();
    p.postConversationListUpdate(boot.items, boot.activeId);
  };

  const pushRagConversationListUpdate = (p: RagChatPanel): void => {
    const boot = ragConversationStore.getBootstrapPayload();
    p.postConversationListUpdate(boot.items, boot.activeId);
  };

  const syncPanelToolCatalog = (): void => {
    if (!panel) {
      return;
    }
    panel.postToolCatalog(
      mcpService.getCachedTools().map(tool => ({
        name: tool.name,
        description: tool.description ?? 'No description from MCP server.'
      }))
    );
  };

  const connectMcp = async (): Promise<void> => {
    const settings = settingsService.get();
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Connecting MCP server...'
      },
      async () => {
        await mcpService.connect(settings);
      }
    );

    sidebar.refresh();
    syncPanelToolCatalog();
    const p = openPanel();
    p.postInfo(`MCP connected: ${mcpService.getConnectedUrl() ?? settings.mcp.serverUrl}`);
    vscode.window.showInformationMessage('MCP server connected.');
  };

  const runAsk = async (
    userQuestion: string,
    preferredTools: string[],
    parsedPayload: AskMessagePayload | undefined
  ): Promise<void> => {
    const currentPanel = openPanel();
    const askConvId = conversationStore.getActiveId();
    const ctx = getContextForAsk(askConvId);

    const settings = settingsService.get();
    const orchestrator = new AssistantOrchestrator(settings, secrets, mcpService, output);

    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Running alert assistant...'
        },
        async () =>
          orchestrator.ask(userQuestion, ctx, {
            preferredTools: parsedPayload?.preferredTools ?? preferredTools,
            oemSessionId: oemSessionIdByConvId.get(askConvId)
          })
      );

      conversationStore.appendUserMessage(askConvId, userQuestion, preferredTools);
      conversationStore.appendAssistantMessage(askConvId, result);
      pushSessionTurn(askConvId, { role: 'user', content: userQuestion });
      pushSessionTurn(askConvId, { role: 'assistant', content: result.finalText });

      const sid =
        extractSessionId(result.finalText) ??
        extractSessionId(result.steps.map(step => step.detail).join('\n'));
      if (sid) {
        oemSessionIdByConvId.set(askConvId, sid);
      }

      currentPanel.postAssistantResult(
        askConvId,
        userQuestion,
        result,
        settingsService.get().ui.showFetchDataCharts
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`[ERROR] ${message}`);
      conversationStore.appendUserMessage(askConvId, userQuestion, preferredTools);
      conversationStore.appendInfoMessage(askConvId, message);
      pushSessionTurn(askConvId, { role: 'user', content: userQuestion });
      currentPanel.postInfo(message);
      vscode.window.showErrorMessage(message);
    }
  };

  const runRagAsk = async (userQuestion: string): Promise<void> => {
    const currentPanel = openRagPanel();
    const askConvId = ragConversationStore.getActiveId();
    const ctx = getRagContextForAsk(askConvId);
    const settings = settingsService.get();
    const orchestrator = new RagOrchestrator(settings, secrets, output);

    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Running Oracle docs RAG...'
        },
        async () => orchestrator.ask(userQuestion, ctx)
      );

      ragConversationStore.appendUserMessage(askConvId, userQuestion, []);
      ragConversationStore.appendAssistantMessage(askConvId, result);
      pushRagSessionTurn(askConvId, { role: 'user', content: userQuestion });
      pushRagSessionTurn(askConvId, { role: 'assistant', content: result.finalText });

      currentPanel.postAssistantResult(askConvId, userQuestion, result, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`[RAG ERROR] ${message}`);
      ragConversationStore.appendUserMessage(askConvId, userQuestion, []);
      ragConversationStore.appendInfoMessage(askConvId, message);
      pushRagSessionTurn(askConvId, { role: 'user', content: userQuestion });
      currentPanel.postInfo(message);
      vscode.window.showErrorMessage(message);
    }
  };

  const askAssistant = async (payload?: string | AskMessagePayload): Promise<void> => {
    const parsedPayload: AskMessagePayload | undefined =
      typeof payload === 'string' ? { question: payload } : payload;

    const userQuestion =
      parsedPayload?.question ??
      (await vscode.window.showInputBox({
        prompt: 'Ask the alert assistant',
        placeHolder: '例如：@fetch_data_from_oem 查询最近2小时所有P1告警，并给出处置建议'
      }));

    if (!userQuestion) {
      return;
    }

    const preferredTools = parsedPayload?.preferredTools ?? [];
    await runAsk(userQuestion, preferredTools, parsedPayload);
  };

  const openPanel = (): ChatPanel => {
    panel = ChatPanel.createOrShow(context);

    panelMessageDisposable?.dispose();
    panelMessageDisposable = panel.onDidReceiveMessage(async (message: Record<string, unknown>) => {
      if (message.type === 'webview-ready') {
        panel!.postBootstrap(conversationStore.getBootstrapPayload());
        panel!.postChartSettings(settingsService.get().ui.showFetchDataCharts);
        syncPanelToolCatalog();
        refreshPanelTitle(panel!);
        return;
      }
      if (message.type === 'connect') {
        await connectMcp();
        return;
      }
      if (message.type === 'conversation/create') {
        const snap = conversationStore.createConversation();
        sessionContextMap.set(snap.meta.id, []);
        oemSessionIdByConvId.delete(snap.meta.id);
        pushConversationListUpdate(panel!);
        panel!.postConversationActivate(snap.meta.id, []);
        refreshPanelTitle(panel!);
        return;
      }
      if (message.type === 'conversation/select' && typeof message.id === 'string') {
        conversationStore.setActive(message.id);
        syncSessionContextFromStore(message.id);
        const msgs = conversationStore.getMessagesForConversation(message.id);
        panel!.postConversationActivate(message.id, msgs);
        refreshPanelTitle(panel!);
        return;
      }
      if (message.type === 'conversation/rename' && typeof message.id === 'string') {
        const convId = message.id;
        const directTitle = typeof message.title === 'string' ? message.title.trim() : '';
        let titleToApply = directTitle;
        if (!titleToApply) {
          const existing = conversationStore.getConversation(convId);
          const next = await vscode.window.showInputBox({
            prompt: '会话名称',
            value: existing?.meta.title ?? ''
          });
          if (next === undefined) {
            return;
          }
          titleToApply = next;
        }
        conversationStore.renameConversation(convId, titleToApply);
        pushConversationListUpdate(panel!);
        if (convId === conversationStore.getActiveId()) {
          refreshPanelTitle(panel!);
        }
        return;
      }
      if (message.type === 'conversation/delete' && typeof message.id === 'string') {
        const convId = message.id;
        const confirmDelete = await vscode.window.showWarningMessage(
          '确定删除此会话？',
          { modal: true },
          '删除'
        );
        if (confirmDelete !== '删除') {
          return;
        }
        conversationStore.deleteConversation(convId);
        sessionContextMap.delete(convId);
        oemSessionIdByConvId.delete(convId);
        const boot = conversationStore.getBootstrapPayload();
        pushConversationListUpdate(panel!);
        panel!.postConversationActivate(boot.activeId, boot.activeMessages);
        syncSessionContextFromStore(boot.activeId);
        refreshPanelTitle(panel!);
        return;
      }
      if (message.type === 'ask') {
        const p = message.payload as { question?: string; preferredTools?: string[] };
        if (!p?.question?.trim()) {
          return;
        }
        await runAsk(p.question.trim(), Array.isArray(p.preferredTools) ? p.preferredTools : [], {
          question: p.question.trim(),
          preferredTools: p.preferredTools
        });
      }
    });
    syncPanelToolCatalog();

    return panel;
  };

  const openRagPanel = (): RagChatPanel => {
    ragPanel = RagChatPanel.createOrShow(context);

    ragPanelMessageDisposable?.dispose();
    ragPanelMessageDisposable = ragPanel.onDidReceiveMessage(async (message: Record<string, unknown>) => {
      if (message.type === 'webview-ready') {
        ragPanel!.postBootstrap(ragConversationStore.getBootstrapPayload());
        refreshRagPanelTitle(ragPanel!);
        return;
      }
      if (message.type === 'conversation/create') {
        const snap = ragConversationStore.createConversation();
        ragSessionContextMap.set(snap.meta.id, []);
        pushRagConversationListUpdate(ragPanel!);
        ragPanel!.postConversationActivate(snap.meta.id, []);
        refreshRagPanelTitle(ragPanel!);
        return;
      }
      if (message.type === 'conversation/select' && typeof message.id === 'string') {
        ragConversationStore.setActive(message.id);
        syncRagSessionContextFromStore(message.id);
        const msgs = ragConversationStore.getMessagesForConversation(message.id);
        ragPanel!.postConversationActivate(message.id, msgs);
        refreshRagPanelTitle(ragPanel!);
        return;
      }
      if (message.type === 'conversation/rename' && typeof message.id === 'string') {
        const convId = message.id;
        const directTitle = typeof message.title === 'string' ? message.title.trim() : '';
        let titleToApply = directTitle;
        if (!titleToApply) {
          const existing = ragConversationStore.getConversation(convId);
          const next = await vscode.window.showInputBox({
            prompt: '会话名称',
            value: existing?.meta.title ?? ''
          });
          if (next === undefined) {
            return;
          }
          titleToApply = next;
        }
        ragConversationStore.renameConversation(convId, titleToApply);
        pushRagConversationListUpdate(ragPanel!);
        if (convId === ragConversationStore.getActiveId()) {
          refreshRagPanelTitle(ragPanel!);
        }
        return;
      }
      if (message.type === 'conversation/delete' && typeof message.id === 'string') {
        const convId = message.id;
        const confirmDelete = await vscode.window.showWarningMessage(
          '确定删除此会话？',
          { modal: true },
          '删除'
        );
        if (confirmDelete !== '删除') {
          return;
        }
        ragConversationStore.deleteConversation(convId);
        ragSessionContextMap.delete(convId);
        const boot = ragConversationStore.getBootstrapPayload();
        pushRagConversationListUpdate(ragPanel!);
        ragPanel!.postConversationActivate(boot.activeId, boot.activeMessages);
        syncRagSessionContextFromStore(boot.activeId);
        refreshRagPanelTitle(ragPanel!);
        return;
      }
      if (message.type === 'rag-ask') {
        const p = message.payload as { question?: string };
        if (!p?.question?.trim()) {
          return;
        }
        await runRagAsk(p.question.trim());
      }
    });

    return ragPanel;
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('alertMcp.openConsole', () => {
      openPanel();
    }),
    vscode.commands.registerCommand('alertMcp.openRagConsole', () => {
      openRagPanel();
    }),
    vscode.commands.registerCommand('alertMcp.connectMcp', connectMcp),
    vscode.commands.registerCommand('alertMcp.disconnectMcp', async () => {
      await mcpService.disconnect();
      oemSessionIdByConvId.clear();
      sidebar.refresh();
      syncPanelToolCatalog();
      vscode.window.showInformationMessage('MCP server disconnected.');
    }),
    vscode.commands.registerCommand('alertMcp.askAssistant', askAssistant),
    vscode.commands.registerCommand('alertMcp.showToolDescription', async (toolName: string, toolDescription: string) => {
      const safeDescription = toolDescription || 'No description from MCP server.';
      vscode.window.showInformationMessage(`${toolName}: ${safeDescription}`);
      const currentPanel = openPanel();
      currentPanel.postInfo(`Tool: ${toolName}\n${safeDescription}`);
    }),
    vscode.commands.registerCommand('alertMcp.openSettings', async () => {
      await SettingsPanel.createOrShow(context, settingsService, secrets);
    }),
    vscode.commands.registerCommand('alertMcp.setLlmApiKey', async () => {
      await promptAndStoreLlmApiKey(secrets);
    }),
    vscode.commands.registerCommand('alertMcp.setMcpBearerToken', async () => {
      await promptAndStoreMcpToken(secrets);
    }),
    vscode.commands.registerCommand('alertMcp.refreshSidebar', async () => {
      if (mcpService.isConnected()) {
        await mcpService.refreshTools();
      }
      sidebar.refresh();
      syncPanelToolCatalog();
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('alertMcp')) {
        sidebar.refresh();
        if (panel) {
          panel.postChartSettings(settingsService.get().ui.showFetchDataCharts);
        }
      }
    }),
    {
      dispose: () => {
        void mcpService.disconnect();
      }
    }
  );
}

function extractSessionId(text: string): string | undefined {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const direct = parsed.session_id ?? parsed.sessionId;
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }
  } catch {
    // ignore parse errors and fallback to regex
  }

  const match = /"session_id"\s*:\s*"([^"]+)"/i.exec(text);
  return match?.[1];
}
