import * as vscode from 'vscode';
import type {
  AssistantResult,
  ConversationMeta,
  ConversationsBootstrapPayload,
  StoredChatMessage
} from '../types/appTypes';

interface AskPayload {
  question: string;
  preferredTools: string[];
}

interface ToolMeta {
  name: string;
  description: string;
}

export class ChatPanel {
  private static current: ChatPanel | undefined;
  private readonly panel: vscode.WebviewPanel;

  static createOrShow(context: vscode.ExtensionContext): ChatPanel {
    if (ChatPanel.current) {
      ChatPanel.current.panel.reveal(vscode.ViewColumn.One);
      return ChatPanel.current;
    }

    const panel = vscode.window.createWebviewPanel(
      'alertMcpConsole',
      'OEM Assistant Console',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    ChatPanel.current = new ChatPanel(panel, context);
    return ChatPanel.current;
  }

  private constructor(panel: vscode.WebviewPanel, _context: vscode.ExtensionContext) {
    this.panel = panel;
    this.panel.onDidDispose(() => {
      ChatPanel.current = undefined;
    });
    this.panel.webview.html = this.renderHtml();
  }

  onDidReceiveMessage(handler: (message: any) => void): vscode.Disposable {
    return this.panel.webview.onDidReceiveMessage(handler);
  }

  setPanelTitle(title: string): void {
    const t = title.trim();
    this.panel.title = t.length > 0 ? `OEM: ${t.length > 40 ? `${t.slice(0, 37)}...` : t}` : 'OEM Assistant Console';
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

  postAssistantResult(conversationId: string, question: string, result: AssistantResult): void {
    this.panel.webview.postMessage({
      type: 'assistant-result',
      payload: { conversationId, question, result }
    });
  }

  postInfo(text: string): void {
    this.panel.webview.postMessage({ type: 'info', payload: text });
  }

  postToolCatalog(tools: ToolMeta[]): void {
    this.panel.webview.postMessage({ type: 'tools-catalog', payload: tools });
  }

  private renderHtml(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OEM Assistant Console</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      margin: 0;
      padding: 0;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .layout {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .conv-sidebar {
      width: 200px;
      min-width: 160px;
      border-right: 1px solid var(--vscode-panel-border);
      display: flex;
      flex-direction: column;
      background: color-mix(in srgb, var(--vscode-sideBar-background) 90%, transparent);
    }
    .conv-toolbar {
      padding: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .conv-toolbar button {
      width: 100%;
      padding: 6px 8px;
      font-size: 12px;
      cursor: pointer;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
    }
    .conv-toolbar button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .conv-list {
      list-style: none;
      margin: 0;
      padding: 4px;
      overflow-y: auto;
      flex: 1;
    }
    .conv-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 6px;
      margin-bottom: 2px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      border: 1px solid transparent;
    }
    .conv-item:hover {
      background: color-mix(in srgb, var(--vscode-list-hoverBackground) 80%, transparent);
    }
    .conv-item.active {
      background: color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 35%, transparent);
      border-color: var(--vscode-focusBorder);
    }
    .conv-title-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .conv-item button.icon {
      flex: 0 0 22px;
      height: 22px;
      padding: 0;
      font-size: 11px;
      line-height: 1;
      cursor: pointer;
      border: none;
      border-radius: 3px;
      background: transparent;
      color: var(--vscode-foreground);
      opacity: 0.85;
    }
    .conv-item button.icon:hover {
      background: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 90%, transparent);
    }
    .conv-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: 12px;
    }
    .chat-log {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 12px;
      min-height: 200px;
      flex: 1;
      overflow-y: auto;
    }
    .bubble {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 10px;
      padding: 10px;
      max-width: 92%;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .bubble.user {
      align-self: flex-end;
      background: color-mix(in srgb, var(--vscode-button-background) 15%, transparent);
    }
    .bubble.assistant {
      align-self: flex-start;
      background: color-mix(in srgb, var(--vscode-editorWidget-background) 75%, transparent);
    }
    .bubble.info {
      align-self: center;
      background: color-mix(in srgb, var(--vscode-textCodeBlock-background) 65%, transparent);
      opacity: 0.95;
      font-size: 12px;
    }
    .bubble-title {
      font-weight: 600;
      margin-bottom: 6px;
      font-size: 12px;
      opacity: 0.9;
    }
    details {
      margin-top: 8px;
      border-top: 1px dashed var(--vscode-panel-border);
      padding-top: 8px;
    }
    details summary {
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
    }
    .step {
      margin-top: 8px;
      padding: 8px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      background: color-mix(in srgb, var(--vscode-textCodeBlock-background) 55%, transparent);
    }
    .step-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .composer {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: end;
      position: relative;
    }
    textarea {
      width: 100%;
      min-height: 96px;
      resize: vertical;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 8px;
      padding: 8px;
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
    }
    .submit-btn {
      height: 38px;
      width: 38px;
      border-radius: 8px;
      border: 1px solid var(--vscode-button-border);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
    }
    .submit-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .tool-picker {
      position: absolute;
      left: 0;
      right: 46px;
      bottom: 110px;
      max-height: 220px;
      overflow-y: auto;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      background: var(--vscode-editorWidget-background);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
      z-index: 10;
      display: none;
    }
    .tool-picker.visible {
      display: block;
    }
    .tool-option {
      padding: 8px 10px;
      cursor: pointer;
      border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 40%, transparent);
    }
    .tool-option:last-child {
      border-bottom: none;
    }
    .tool-option:hover,
    .tool-option.active {
      background: color-mix(in srgb, var(--vscode-list-hoverBackground) 80%, transparent);
    }
    .tool-option .name {
      font-weight: 600;
      font-size: 12px;
    }
    .tool-option .desc {
      font-size: 11px;
      opacity: 0.9;
      margin-top: 4px;
    }
    .hint {
      margin-top: 6px;
      font-size: 11px;
      opacity: 0.8;
    }
    .mention-pill {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--vscode-badge-background);
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 11px;
      margin-right: 6px;
      margin-bottom: 6px;
      background: color-mix(in srgb, var(--vscode-badge-background) 22%, transparent);
    }
    .mention-wrap {
      min-height: 20px;
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="conv-sidebar">
      <div class="conv-toolbar">
        <button type="button" id="newConvBtn">+ 新建会话</button>
      </div>
      <ul id="convList" class="conv-list" role="list"></ul>
    </aside>
    <div class="conv-main">
      <div id="log" class="chat-log"></div>
      <div class="mention-wrap" id="mentions"></div>
      <div class="composer">
        <div id="toolPicker" class="tool-picker" role="listbox" aria-label="MCP tools"></div>
        <textarea id="input" placeholder="输入 @ 可快速选择 tool，例如：@fetch_data_from_oem 查询xx主机CPU告警。"></textarea>
        <button id="askBtn" class="submit-btn" title="Submit">➤</button>
      </div>
      <div class="hint">提示：输入 @tool_name 可指定优先调用工具；Ctrl/Cmd+Enter 发送。</div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const input = document.getElementById('input');
    const log = document.getElementById('log');
    const picker = document.getElementById('toolPicker');
    const mentions = document.getElementById('mentions');
    const convList = document.getElementById('convList');
    const newConvBtn = document.getElementById('newConvBtn');
    let toolsCatalog = [];
    let currentOptions = [];
    let activeOptionIndex = 0;
    let currentActiveId = '';
    let convItems = [];

    function redrawMentions() {
      const used = extractToolMentions(input.value);
      if (!used.length) {
        mentions.innerHTML = '';
        return;
      }
      mentions.innerHTML = used.map(name => '<span class="mention-pill">@' + escapeHtml(name) + '</span>').join('');
    }

    function redactSensitiveText(raw) {
      let text = String(raw || '');
      text = text.replace(/(password\\s*[=:]\\s*)([^\\s,\\n]+)/gi, '$1***');
      text = text.replace(/(密码\\s*[：:\\=]\\s*)([^\\s,\\n]+)/g, '$1***');
      text = text.replace(/(username\\s*[=:]\\s*)([^\\s,\\n]+)/gi, '$1***');
      text = text.replace(/(用户名\\s*[：:\\=]\\s*)([^\\s,\\n]+)/g, '$1***');
      text = text.replace(/(https?:\\/\\/[^\\s]*\\/em\\/api)/gi, '[OEM_API_REDACTED]');
      return text;
    }

    function appendBubble(type, title, bodyHtml) {
      const div = document.createElement('div');
      div.className = 'bubble ' + type;
      div.innerHTML = '<div class="bubble-title">' + escapeHtml(title) + '</div>' + bodyHtml;
      log.appendChild(div);
      div.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return div;
    }

    function clearLog() {
      log.innerHTML = '';
    }

    function renderConvList(items, activeId) {
      convItems = items || [];
      currentActiveId = activeId || '';
      convList.innerHTML = (convItems || []).map(meta => {
        const active = meta.id === activeId ? ' conv-item active' : ' conv-item';
        return '<li class="' + active.trim() + '" data-id="' + escapeHtml(meta.id) + '">'
          + '<span class="conv-title-text" title="' + escapeHtml(meta.title) + '">' + escapeHtml(meta.title) + '</span>'
          + '<button type="button" class="icon conv-rename" title="重命名" data-id="' + escapeHtml(meta.id) + '">✎</button>'
          + '<button type="button" class="icon conv-del" title="删除" data-id="' + escapeHtml(meta.id) + '">×</button>'
          + '</li>';
      }).join('');
    }

    function renderAssistantBubble(result, skipTypewriter) {
      const wrapper = appendBubble('assistant', 'Assistant', '<div class="answer-body"></div>');
      const answerBody = wrapper.querySelector('.answer-body');
      if (!answerBody) return;

      const runSteps = () => {
        const stepsHtml = result.steps.map(step => {
          return '<div class="step">'
            + '<div class="step-title">' + escapeHtml(step.title) + '</div>'
            + '<div>' + escapeHtml(redactSensitiveText(step.detail)) + '</div>'
            + '</div>';
        }).join('');
        if (stepsHtml) {
          const details = document.createElement('details');
          details.innerHTML = '<summary>Tool Execution Trace</summary>' + stepsHtml;
          wrapper.appendChild(details);
        }
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
      };

      if (skipTypewriter) {
        answerBody.textContent = redactSensitiveText(result.finalText);
        runSteps();
        return;
      }

      const text = redactSensitiveText(result.finalText);
      const batchSize = 3;
      const frameDelay = 12;
      let index = 0;
      const timer = setInterval(() => {
        const next = Math.min(index + batchSize, text.length);
        answerBody.textContent = text.slice(0, next);
        index = next;
        if (index >= text.length) {
          clearInterval(timer);
          runSteps();
        }
      }, frameDelay);
    }

    function renderMessages(messages) {
      clearLog();
      if (!messages || !messages.length) return;
      for (const m of messages) {
        if (m.kind === 'user') {
          appendBubble('user', 'You', '<div>' + escapeHtml(redactSensitiveText(m.text)) + '</div>');
        } else if (m.kind === 'assistant') {
          renderAssistantBubble(m.result, true);
        } else if (m.kind === 'info') {
          appendBubble('info', 'Info', '<div>' + escapeHtml(redactSensitiveText(m.text)) + '</div>');
        }
      }
    }

    function extractToolMentions(text) {
      const names = new Set();
      for (const match of String(text).matchAll(/@([a-zA-Z0-9_:-]+)/g)) {
        const name = match[1];
        if (name) names.add(name);
      }
      return Array.from(names);
    }

    function getCurrentMentionQuery() {
      const value = input.value;
      const caret = input.selectionStart || 0;
      const beforeCaret = value.slice(0, caret);
      const match = beforeCaret.match(/(?:^|\\s)@([a-zA-Z0-9_:-]*)$/);
      if (!match) return undefined;
      const atPos = beforeCaret.lastIndexOf('@');
      return { query: (match[1] || '').toLowerCase(), atPos };
    }

    function rankTools(query) {
      if (!query) return toolsCatalog.slice(0, 20);
      return toolsCatalog
        .map(tool => {
          const name = tool.name.toLowerCase();
          const desc = (tool.description || '').toLowerCase();
          let score = 0;
          if (name.startsWith(query)) score += 6;
          if (name.includes(query)) score += 4;
          if (desc.includes(query)) score += 1;
          return { tool, score };
        })
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
        .slice(0, 20)
        .map(entry => entry.tool);
    }

    function renderPicker(options) {
      currentOptions = options;
      if (!options.length) {
        picker.classList.remove('visible');
        picker.innerHTML = '';
        return;
      }
      picker.classList.add('visible');
      activeOptionIndex = Math.min(activeOptionIndex, options.length - 1);
      picker.innerHTML = options.map((tool, idx) => {
        const cls = idx === activeOptionIndex ? 'tool-option active' : 'tool-option';
        return '<div class="' + cls + '" data-tool-name="' + escapeHtml(tool.name) + '">'
          + '<div class="name">' + escapeHtml(tool.name) + '</div>'
          + '<div class="desc">' + escapeHtml(tool.description || 'No description') + '</div>'
          + '</div>';
      }).join('');
    }

    function applyToolMention(toolName) {
      const mention = getCurrentMentionQuery();
      if (!mention) return;
      const caret = input.selectionStart || 0;
      const before = input.value.slice(0, mention.atPos);
      const after = input.value.slice(caret);
      const spaceAfter = after.startsWith(' ') ? '' : ' ';
      input.value = before + '@' + toolName + ' ' + spaceAfter + after;
      const nextPos = (before + '@' + toolName + ' ').length;
      input.focus();
      input.selectionStart = nextPos;
      input.selectionEnd = nextPos;
      picker.classList.remove('visible');
      picker.innerHTML = '';
      redrawMentions();
    }

    function maybeShowPicker() {
      const mention = getCurrentMentionQuery();
      if (!mention) {
        picker.classList.remove('visible');
        picker.innerHTML = '';
        return;
      }
      activeOptionIndex = 0;
      renderPicker(rankTools(mention.query));
    }

    function submitAsk() {
      const question = input.value.trim();
      if (!question) return;
      const preferredTools = extractToolMentions(question);
      appendBubble('user', 'You', '<div>' + escapeHtml(redactSensitiveText(question)) + '</div>');
      vscode.postMessage({ type: 'ask', payload: { question, preferredTools } });
      input.value = '';
      mentions.innerHTML = '';
      picker.classList.remove('visible');
      picker.innerHTML = '';
    }

    newConvBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'conversation/create' });
    });

    convList.addEventListener('click', e => {
      const del = e.target.closest('.conv-del');
      if (del) {
        const id = del.getAttribute('data-id');
        if (id && confirm('删除此会话？')) {
          vscode.postMessage({ type: 'conversation/delete', id });
        }
        return;
      }
      const ren = e.target.closest('.conv-rename');
      if (ren) {
        const id = ren.getAttribute('data-id');
        const item = convItems.find(x => x.id === id);
        const next = prompt('会话名称', item ? item.title : '');
        if (next !== null && id) {
          vscode.postMessage({ type: 'conversation/rename', id, title: next });
        }
        return;
      }
      const row = e.target.closest('.conv-item');
      if (row && !e.target.closest('button')) {
        const id = row.getAttribute('data-id');
        if (id) vscode.postMessage({ type: 'conversation/select', id });
      }
    });

    document.getElementById('askBtn').addEventListener('click', submitAsk);

    input.addEventListener('input', () => {
      redrawMentions();
      maybeShowPicker();
    });

    input.addEventListener('keydown', event => {
      if (picker.classList.contains('visible') && currentOptions.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          activeOptionIndex = (activeOptionIndex + 1) % currentOptions.length;
          renderPicker(currentOptions);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          activeOptionIndex = (activeOptionIndex - 1 + currentOptions.length) % currentOptions.length;
          renderPicker(currentOptions);
          return;
        }
        if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
          event.preventDefault();
          applyToolMention(currentOptions[activeOptionIndex].name);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          picker.classList.remove('visible');
          return;
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        submitAsk();
      }
    });

    picker.addEventListener('mousedown', event => {
      const row = event.target.closest('[data-tool-name]');
      if (!row) return;
      const name = row.getAttribute('data-tool-name');
      if (name) applyToolMention(name);
    });

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'tools-catalog') {
        toolsCatalog = Array.isArray(message.payload) ? message.payload : [];
        maybeShowPicker();
        return;
      }
      if (message.type === 'conversations-bootstrap') {
        const p = message.payload;
        if (p && p.items) renderConvList(p.items, p.activeId);
        if (p && p.activeMessages) renderMessages(p.activeMessages);
        return;
      }
      if (message.type === 'conversations-list') {
        const p = message.payload;
        if (p && p.items) renderConvList(p.items, p.activeId);
        return;
      }
      if (message.type === 'conversation-activate') {
        const p = message.payload;
        if (p && p.activeId) currentActiveId = p.activeId;
        if (p && p.messages) renderMessages(p.messages);
        return;
      }
      if (message.type === 'info') {
        appendBubble('info', 'Info', '<div>' + escapeHtml(redactSensitiveText(message.payload)) + '</div>');
        return;
      }
      if (message.type === 'assistant-result') {
        const payload = message.payload;
        if (payload.conversationId && payload.conversationId !== currentActiveId) {
          return;
        }
        const result = payload.result;
        renderAssistantBubble(result, false);
        return;
      }
    });

    function escapeHtml(str) {
      return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
    }

    vscode.postMessage({ type: 'webview-ready' });
  </script>
</body>
</html>`;
  }
}
