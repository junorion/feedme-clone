import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

function parseHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

async function fetchHtml(url: URL) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; url-to-markdown)" },
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const url = parseHttpUrl(body?.url);
  if (!url) {
    return errorResponse(
      400,
      "invalid-url",
      "http:// 또는 https://로 시작하는 올바른 주소를 입력해 주세요."
    );
  }

  const html = await fetchHtml(url);
  if (html === null) {
    return errorResponse(
      502,
      "fetch-failed",
      "사이트가 접근을 막았거나 응답하지 않았습니다. 주소를 확인하고 다시 시도해 주세요."
    );
  }

  const { document } = parseHTML(html);
  const result = await Defuddle(document, url.href, { markdown: true });

  if (!result.content.trim()) {
    return errorResponse(
      422,
      "empty-content",
      "본문을 추출하지 못했습니다. 자바스크립트로 그려지는 페이지이거나 로그인이 필요한 페이지일 수 있습니다."
    );
  }

  return Response.json({
    title: result.title,
    author: result.author,
    markdown: result.content,
  });
}
