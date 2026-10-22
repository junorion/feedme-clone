export type LlmService = "chatgpt" | "claude";

// URL 쿼리에 담아도 잘리지 않을 것으로 보는 프롬프트+본문 글자 수 상한.
export const URL_HANDOFF_LIMIT = 6000;

const SERVICE_URLS: Record<LlmService, string> = {
  chatgpt: "https://chatgpt.com/",
  claude: "https://claude.ai/new",
};

export function buildLlmHandoff({
  service,
  prompt,
  markdown,
}: {
  service: LlmService;
  prompt: string;
  markdown: string;
}) {
  const text = prompt ? `${prompt}\n\n${markdown}` : markdown;
  const url = new URL(SERVICE_URLS[service]);

  if (text.length > URL_HANDOFF_LIMIT) {
    return { mode: "clipboard" as const, text, url: url.href };
  }

  url.searchParams.set("q", text);
  return { mode: "url" as const, url: url.href };
}
