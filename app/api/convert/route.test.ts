// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";

import { POST } from "./route";

const ARTICLE_HTML = `<!doctype html><html lang="ko"><head>
<title>Markdown 문법 정리 - velog</title>
<meta name="author" content="김서연">
</head><body>
<nav>메뉴 홈 인기 구독</nav>
<article>
<h1>Markdown 문법 정리</h1>
<p>Markdown은 <strong>일반 텍스트</strong>로 서식을 표현하는 방법입니다. 문서가 어디로 옮겨 가도 구조가 깨지지 않기 때문에 개발 문서에서 널리 쓰입니다.</p>
<h2>자주 쓰는 문법</h2>
<p>제목은 샵 기호로, 목록은 하이픈으로 시작하며 코드는 백틱으로 감쌉니다. 이 문단은 본문으로 인식될 만큼 충분히 길게 작성했습니다.</p>
</article>
<footer>댓글 0개</footer>
</body></html>`;

function convertRequest(body: unknown) {
  return new Request("http://localhost/api/convert", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function stubPage(html: string, init?: ResponseInit) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(html, { status: 200, ...init }))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("공개된 글 URL을 보내면 제목, 저자, Markdown 본문을 돌려준다", async () => {
  stubPage(ARTICLE_HTML);

  const res = await POST(convertRequest({ url: "https://velog.io/@seoyeon/md" }));
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.title).toBe("Markdown 문법 정리");
  expect(data.author).toBe("김서연");
  expect(data.markdown).toContain("**일반 텍스트**");
  expect(data.markdown).toContain("## 자주 쓰는 문법");
  expect(data.markdown).not.toContain("댓글 0개");
});

test.each(["", "abc", "ftp://example.com/a", "javascript:alert(1)"])(
  "http(s) 주소가 아닌 입력 %j는 400과 invalid-url 오류를 돌려준다",
  async (url) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await POST(convertRequest({ url }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("invalid-url");
    expect(data.error.message).toEqual(expect.any(String));
    expect(fetchSpy).not.toHaveBeenCalled();
  }
);

test("페이지가 4xx·5xx로 응답하면 502와 fetch-failed 오류를 돌려준다", async () => {
  stubPage("Forbidden", { status: 403 });

  const res = await POST(convertRequest({ url: "https://blocked.example.com/a" }));
  const data = await res.json();

  expect(res.status).toBe(502);
  expect(data.error.code).toBe("fetch-failed");
});

test("네트워크 오류로 페이지를 가져오지 못해도 502와 fetch-failed 오류를 돌려준다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("fetch failed");
    })
  );

  const res = await POST(convertRequest({ url: "https://down.example.com/a" }));
  const data = await res.json();

  expect(res.status).toBe(502);
  expect(data.error.code).toBe("fetch-failed");
});

test("본문을 추출하지 못한 페이지는 422와 empty-content 오류를 돌려준다", async () => {
  stubPage(
    `<!doctype html><html><head><title>앱</title></head><body><div id="root"></div><script>render()</script></body></html>`
  );

  const res = await POST(convertRequest({ url: "https://spa.example.com/a" }));
  const data = await res.json();

  expect(res.status).toBe(422);
  expect(data.error.code).toBe("empty-content");
});
