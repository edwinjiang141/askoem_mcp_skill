import type { DocReferenceLink } from '../types/appTypes';

/**
 * Allowed result URLs only:
 * - https://docs.oracle.com/en/... (English docs tree)
 * - https://blogs.oracle.com/...
 */
export function isAllowedOracleRagUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') {
      return false;
    }
    const h = u.hostname.toLowerCase();
    if (h === 'blogs.oracle.com') {
      return true;
    }
    if (h === 'docs.oracle.com') {
      return u.pathname === '/en' || u.pathname.startsWith('/en/');
    }
    return false;
  } catch {
    return false;
  }
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchPageSnippet(
  url: string,
  maxChars: number,
  fetchImpl: typeof fetch
): Promise<string> {
  const res = await fetchImpl(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'OEM-Assistant-RAG/0.1 (VSCode extension)',
      Accept: 'text/html,application/xhtml+xml'
    }
  });
  if (!res.ok) {
    return `[fetch failed: ${res.status}]`;
  }
  const html = await res.text();
  const text = stripHtmlToText(html);
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n…` : text;
}

interface TavilySearchResultItem {
  title?: string;
  url?: string;
  content?: string;
}

interface TavilySearchResponse {
  results?: TavilySearchResultItem[];
  error?: string;
}

/**
 * Tavily Search API: POST https://api.tavily.com/search
 * include_domains limits crawling to docs.oracle.com and blogs.oracle.com only.
 * Results are filtered again with isAllowedOracleRagUrl (docs must be under /en/).
 */
export async function searchOracleRagViaTavily(
  query: string,
  apiKey: string,
  maxResults: number,
  fetchImpl: typeof fetch = fetch
): Promise<DocReferenceLink[]> {
  const n = Math.min(Math.max(1, maxResults), 20);
  const res = await fetchImpl('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: query.trim(),
      search_depth: 'basic',
      max_results: n,
      include_domains: ['docs.oracle.com', 'blogs.oracle.com']
    })
  });

  const rawText = await res.text();
  let json: TavilySearchResponse;
  try {
    json = JSON.parse(rawText) as TavilySearchResponse;
  } catch {
    throw new Error(`Tavily response is not JSON: ${rawText.slice(0, 200)}`);
  }

  if (!res.ok) {
    const detail =
      typeof (json as { message?: string }).message === 'string'
        ? (json as { message: string }).message
        : json.error ?? rawText.slice(0, 300);
    throw new Error(`Tavily search failed: ${res.status} ${detail}`);
  }

  const out: DocReferenceLink[] = [];
  for (const r of json.results ?? []) {
    const link = typeof r.url === 'string' ? r.url.trim() : '';
    const title = typeof r.title === 'string' ? r.title.trim() : link;
    if (!link || !isAllowedOracleRagUrl(link)) {
      continue;
    }
    const sn = typeof r.content === 'string' ? r.content.trim() : '';
    out.push({
      title: title || link,
      url: link,
      ...(sn ? { snippet: sn.length > 12000 ? `${sn.slice(0, 12000)}…` : sn } : {})
    });
  }
  return out;
}
