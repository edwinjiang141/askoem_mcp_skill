import * as vscode from 'vscode';
import type { AssistantResult, ChatTurn, DocReferenceLink, ExtensionSettings } from '../types/appTypes';
import { SecretStorageService } from '../services/secretStorageService';
import { OpenAiCompatibleLlmService } from '../services/llm/openAiCompatibleLlmService';
import { fetchPageSnippet, searchOracleRagViaTavily } from '../services/oracleDocSearchService';

function parseJsonObjectFromLlm(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const raw = fence ? fence[1].trim() : trimmed;
  const parsed = JSON.parse(raw) as unknown;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  throw new Error('LLM output is not a JSON object.');
}

function normalizeReferences(raw: unknown, allowed: DocReferenceLink[]): DocReferenceLink[] {
  const allowSet = new Set(allowed.map(a => a.url));
  const byUrl = new Map(allowed.map(a => [a.url, a] as const));
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: DocReferenceLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const url = typeof rec.url === 'string' ? rec.url.trim() : '';
    if (!url || !allowSet.has(url)) {
      continue;
    }
    const meta = byUrl.get(url);
    const title =
      typeof rec.title === 'string' && rec.title.trim()
        ? rec.title.trim()
        : meta?.title ?? url;
    const sn = meta?.snippet?.trim();
    out.push(sn ? { title, url, snippet: sn } : { title, url });
  }
  return out;
}

export class RagOrchestrator {
  constructor(
    private readonly settings: ExtensionSettings,
    private readonly secrets: SecretStorageService,
    private readonly output: vscode.OutputChannel,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async ask(userText: string, conversationContext: ChatTurn[] = []): Promise<AssistantResult> {
    const apiKey = await this.secrets.getLlmApiKey();
    if (!apiKey) {
      throw new Error('LLM API key is not configured. Run: OEM Assistant: Set LLM API Key');
    }

    if (this.settings.llm.provider === 'copilot') {
      throw new Error('Copilot mode is reserved for a later version. Use openai-compatible.');
    }

    const tavilyKey = (await this.secrets.getTavilyApiKey())?.trim() ?? '';

    if (!tavilyKey) {
      return {
        finalText:
          '未配置 Tavily API Key。请打开 OEM Assistant Settings，在「RAG」中填写 Tavily API Key（SecretStorage 保存）。检索范围仅 https://docs.oracle.com/en/ 与 https://blogs.oracle.com/ 。配置后重试。',
        steps: [
          {
            type: 'info',
            title: 'RAG',
            detail:
              '使用 Tavily Search API（include_domains: docs.oracle.com、blogs.oracle.com），结果再按 URL 规则过滤为仅 docs.oracle.com/en/ 与 blogs.oracle.com。'
          }
        ]
      };
    }

    const topK = this.settings.rag.searchTopK;
    const snippetPages = Math.max(0, Math.min(5, this.settings.rag.fetchSnippetPages));
    const snippetMax = Math.max(500, this.settings.rag.snippetMaxChars);

    let links: DocReferenceLink[];
    try {
      links = await searchOracleRagViaTavily(userText, tavilyKey, topK, this.fetchImpl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.output.appendLine(`[RAG search] ${msg}`);
      return {
        finalText: `Oracle 文档检索失败：${msg}`,
        steps: [{ type: 'error', title: '检索', detail: msg }]
      };
    }

    if (links.length === 0) {
      return {
        finalText:
          '未在允许站点（docs.oracle.com/en/ 与 blogs.oracle.com）检索到匹配页面。请换用英文关键词、产品名或文档中的术语后重试。',
        steps: [{ type: 'info', title: '检索', detail: '0 results after Tavily + URL filter' }]
      };
    }

    const snippetParts: string[] = [];
    const slice = links.slice(0, snippetPages);
    for (let i = 0; i < slice.length; i++) {
      const u = slice[i].url;
      try {
        const sn = await fetchPageSnippet(u, Math.floor(snippetMax / Math.max(1, slice.length)), this.fetchImpl);
        snippetParts.push(`--- Page ${i + 1}: ${u} ---\n${sn}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        snippetParts.push(`--- Page ${i + 1}: ${u} ---\n[snippet fetch failed: ${msg}]`);
      }
    }
    let snippetsJoined = snippetParts.join('\n\n');
    if (!snippetsJoined.trim()) {
      snippetsJoined = links
        .map((l, i) => {
          const sn = l.snippet?.trim() || '';
          return `--- Tavily ${i + 1}: ${l.url} ---\n${sn || '(no snippet from search API)'}`;
        })
        .join('\n\n');
    }

    const llm = new OpenAiCompatibleLlmService(
      this.settings.llm.baseUrl,
      apiKey,
      this.settings.llm.model,
      0.1
    );

    const allowedJson = JSON.stringify(links, null, 0);
    const systemPrompt = [
      'You answer using only the user question and the PROVIDED document excerpts and allowed link list.',
      'Do not invent URLs. The "references" array may only contain objects whose "url" appears in the allowed list.',
      'Respond in Chinese unless the user explicitly asked another language.',
      'Output a single JSON object only, no markdown fence, with keys:',
      '"answer" (string, markdown allowed in plain text only, no HTML tags)',
      '"references" (array of { "title", "url" } subset of allowed links you cited).'
    ].join('\n');

    const userBlock = [
      `User question:\n${userText}`,
      '',
      `Allowed links (title + url):\n${allowedJson}`,
      '',
      `Document excerpts:\n${snippetsJoined}`
    ].join('\n');

    const prior = conversationContext.slice(-12);
    const messages: ChatTurn[] = [
      { role: 'system', content: systemPrompt },
      ...prior,
      { role: 'user', content: userBlock }
    ];

    const choice = await llm.complete(messages, []);
    const content = choice.content?.trim();
    if (!content) {
      throw new Error('LLM returned empty content.');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonObjectFromLlm(content);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.output.appendLine(`[RAG] JSON parse failed: ${msg}\nRaw: ${content.slice(0, 2000)}`);
      return {
        finalText:
          '模型未返回可解析的 JSON。请重试；若持续失败，请降低问题长度或检查模型是否支持指令遵循。',
        steps: [
          { type: 'error', title: 'LLM', detail: msg },
          { type: 'info', title: '检索命中', detail: `${links.length} page(s) (Tavily, allowed URLs only)` }
        ],
        referenceLinks: links
      };
    }

    const answer = typeof parsed.answer === 'string' ? parsed.answer.trim() : '';
    const refs = normalizeReferences(parsed.references, links);

    if (!answer) {
      return {
        finalText: '模型未生成有效回答正文。请重试。',
        steps: [{ type: 'info', title: '检索命中', detail: `${links.length} page(s)` }],
        referenceLinks: links
      };
    }

    return {
      finalText: answer,
      steps: [
        {
          type: 'info',
          title: '检索',
          detail: `Tavily 命中 ${links.length} 条（允许站点内）；用于 HTML 摘录 ${slice.length} 页。`
        }
      ],
      referenceLinks: refs.length > 0 ? refs : links
    };
  }
}
