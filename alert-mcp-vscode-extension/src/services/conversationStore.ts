import * as vscode from 'vscode';
import { randomUUID } from 'node:crypto';
import type {
  AssistantResult,
  ChatTurn,
  ConversationMeta,
  ConversationSnapshot,
  ConversationsBootstrapPayload,
  StoredChatMessage
} from '../types/appTypes';

export const OEM_CONVERSATIONS_STORAGE_KEY = 'oemAssistant.conversations.v1';
export const RAG_CONVERSATIONS_STORAGE_KEY = 'oemAssistant.ragConversations.v1';

interface PersistedShape {
  conversations: ConversationSnapshot[];
  activeId: string | null;
}

function now(): number {
  return Date.now();
}

/** Rebuild LLM conversation slice from stored messages (user + assistant turns only). */
export function messagesToChatTurns(messages: StoredChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of messages) {
    if (m.kind === 'user') {
      turns.push({ role: 'user', content: m.text });
    } else if (m.kind === 'assistant') {
      turns.push({ role: 'assistant', content: m.result.finalText });
    }
  }
  return turns;
}

export class ConversationStore {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly storageKey: string = OEM_CONVERSATIONS_STORAGE_KEY
  ) {}

  private load(): PersistedShape {
    const raw = this.context.globalState.get<PersistedShape | undefined>(this.storageKey);
    if (raw && Array.isArray(raw.conversations)) {
      return {
        conversations: raw.conversations,
        activeId: raw.activeId ?? null
      };
    }
    return { conversations: [], activeId: null };
  }

  private save(state: PersistedShape): void {
    try {
      void this.context.globalState.update(this.storageKey, state);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      void vscode.window.showErrorMessage(
        `OEM Assistant: 会话保存失败（若超过 VS Code globalState 单键上限会出现此错误）。${msg}`
      );
    }
  }

  ensureAtLeastOneConversation(): ConversationSnapshot {
    const state = this.load();
    if (state.conversations.length === 0) {
      const snap = this.createSnapshotNew();
      state.conversations.push(snap);
      state.activeId = snap.meta.id;
      this.save(state);
      return snap;
    }
    if (!state.activeId || !state.conversations.some(c => c.meta.id === state.activeId)) {
      state.activeId = state.conversations[0]?.meta.id ?? null;
      this.save(state);
    }
    return state.conversations.find(c => c.meta.id === state.activeId)!;
  }

  private createSnapshotNew(): ConversationSnapshot {
    const id = randomUUID();
    const t = now();
    return {
      meta: {
        id,
        title: `会话 ${new Date(t).toLocaleString()}`,
        updatedAt: t
      },
      messages: []
    };
  }

  getBootstrapPayload(): ConversationsBootstrapPayload {
    const state = this.load();
    this.ensureActiveValid(state);
    const activeId = state.activeId!;
    const active = state.conversations.find(c => c.meta.id === activeId);
    return {
      items: state.conversations.map(c => ({ ...c.meta })).sort((a, b) => b.updatedAt - a.updatedAt),
      activeId,
      activeMessages: active ? [...active.messages] : []
    };
  }

  private ensureActiveValid(state: PersistedShape): void {
    if (state.conversations.length === 0) {
      const snap = this.createSnapshotNew();
      state.conversations.push(snap);
      state.activeId = snap.meta.id;
      this.save(state);
      return;
    }
    if (!state.activeId || !state.conversations.some(c => c.meta.id === state.activeId)) {
      state.activeId = state.conversations[0].meta.id;
      this.save(state);
    }
  }

  getActiveId(): string {
    const state = this.load();
    this.ensureActiveValid(state);
    return state.activeId!;
  }

  getConversation(id: string): ConversationSnapshot | undefined {
    return this.load().conversations.find(c => c.meta.id === id);
  }

  getMessagesForConversation(id: string): StoredChatMessage[] {
    const c = this.getConversation(id);
    return c ? [...c.messages] : [];
  }

  setActive(id: string): boolean {
    const state = this.load();
    if (!state.conversations.some(c => c.meta.id === id)) {
      return false;
    }
    state.activeId = id;
    this.save(state);
    return true;
  }

  createConversation(): ConversationSnapshot {
    const state = this.load();
    const snap = this.createSnapshotNew();
    state.conversations.push(snap);
    state.activeId = snap.meta.id;
    this.save(state);
    return snap;
  }

  renameConversation(id: string, title: string): boolean {
    const state = this.load();
    const c = state.conversations.find(x => x.meta.id === id);
    if (!c) {
      return false;
    }
    c.meta.title = title.trim() || c.meta.title;
    c.meta.updatedAt = now();
    this.save(state);
    return true;
  }

  deleteConversation(id: string): { newActiveId: string | null } {
    const state = this.load();
    const idx = state.conversations.findIndex(c => c.meta.id === id);
    if (idx < 0) {
      return { newActiveId: state.activeId };
    }
    state.conversations.splice(idx, 1);
    if (state.conversations.length === 0) {
      const snap = this.createSnapshotNew();
      state.conversations.push(snap);
      state.activeId = snap.meta.id;
      this.save(state);
      return { newActiveId: state.activeId };
    }
    if (state.activeId === id) {
      state.activeId = state.conversations[0].meta.id;
    }
    this.save(state);
    return { newActiveId: state.activeId };
  }

  appendUserMessage(conversationId: string, text: string, preferredTools: string[]): void {
    const state = this.load();
    const c = state.conversations.find(x => x.meta.id === conversationId);
    if (!c) {
      return;
    }
    const msg: StoredChatMessage = {
      id: randomUUID(),
      kind: 'user',
      createdAt: now(),
      text,
      preferredTools: preferredTools.length ? preferredTools : undefined
    };
    c.messages.push(msg);
    c.meta.updatedAt = now();
    this.save(state);
  }

  appendAssistantMessage(conversationId: string, result: AssistantResult): void {
    const state = this.load();
    const c = state.conversations.find(x => x.meta.id === conversationId);
    if (!c) {
      return;
    }
    const msg: StoredChatMessage = {
      id: randomUUID(),
      kind: 'assistant',
      createdAt: now(),
      result: JSON.parse(JSON.stringify(result)) as AssistantResult
    };
    c.messages.push(msg);
    c.meta.updatedAt = now();
    this.save(state);
  }

  appendInfoMessage(conversationId: string, text: string): void {
    const state = this.load();
    const c = state.conversations.find(x => x.meta.id === conversationId);
    if (!c) {
      return;
    }
    const msg: StoredChatMessage = {
      id: randomUUID(),
      kind: 'info',
      createdAt: now(),
      text
    };
    c.messages.push(msg);
    c.meta.updatedAt = now();
    this.save(state);
  }
}
