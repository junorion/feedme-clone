import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import Home from "@/app/page";

const ARTICLE = {
  title: "Markdown 문법을 5분 만에 정리하기",
  author: "김서연",
  markdown: "## 왜 Markdown인가\n\n**일반 텍스트**로 서식을 표현합니다.\n\n- 목록 하나\n",
};

function stubConvert(response: { status?: number; body: unknown }) {
  const fetchMock = vi.fn(
    async () => Response.json(response.body, { status: response.status ?? 200 })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function convert(url: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("웹 페이지 URL"), url);
  await user.click(screen.getByRole("button", { name: "변환하기" }));
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("URL을 넣고 변환하면 제목·저자 헤더와 렌더링된 Markdown이 보인다", async () => {
  const fetchMock = stubConvert({ body: ARTICLE });
  render(<Home />);

  await convert("https://velog.io/@seoyeon/md");

  expect(
    await screen.findByRole("heading", { level: 2, name: ARTICLE.title })
  ).toBeInTheDocument();
  expect(screen.getByText("김서연")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { level: 4, name: "왜 Markdown인가" })
  ).toBeInTheDocument();
  expect(screen.getByText("일반 텍스트").tagName).toBe("STRONG");
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/convert",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ url: "https://velog.io/@seoyeon/md" }),
    })
  );
});

test("변환에 실패하면 원인 메시지가 보이고 입력한 URL은 그대로 남는다", async () => {
  stubConvert({
    status: 502,
    body: { error: { code: "fetch-failed", message: "사이트가 접근을 막았습니다." } },
  });
  render(<Home />);

  await convert("https://blocked.example.com/a");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "사이트가 접근을 막았습니다."
  );
  expect(screen.getByLabelText("웹 페이지 URL")).toHaveValue(
    "https://blocked.example.com/a"
  );
  expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
});

test("서버에 연결하지 못해도 오류 메시지를 보여 준다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    })
  );
  render(<Home />);

  await convert("https://example.com/a");

  expect(await screen.findByRole("alert")).toHaveTextContent("다시 시도");
});

test("변환하는 동안 로딩 표시가 보이고 끝나면 사라진다", async () => {
  let finish!: (res: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>((resolve) => (finish = resolve)))
  );
  render(<Home />);

  await convert("https://example.com/a");

  expect(screen.getByRole("status", { name: "변환 중" })).toBeInTheDocument();

  finish(Response.json(ARTICLE));

  expect(
    await screen.findByRole("heading", { level: 2, name: ARTICLE.title })
  ).toBeInTheDocument();
  expect(screen.queryByRole("status", { name: "변환 중" })).not.toBeInTheDocument();
});

test("지우기 버튼은 입력란이 비어 있을 때는 없고, 누르면 입력·결과가 모두 초기화된다", async () => {
  stubConvert({ body: ARTICLE });
  render(<Home />);
  expect(screen.queryByRole("button", { name: "지우기" })).not.toBeInTheDocument();

  const user = await convert("https://velog.io/@seoyeon/md");
  await screen.findByRole("heading", { level: 2, name: ARTICLE.title });
  await user.click(screen.getByRole("button", { name: "지우기" }));

  expect(screen.getByLabelText("웹 페이지 URL")).toHaveValue("");
  expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "지우기" })).not.toBeInTheDocument();
});

test("지우기는 오류 메시지도 함께 지운다", async () => {
  stubConvert({
    status: 400,
    body: { error: { code: "invalid-url", message: "올바른 주소를 입력해 주세요." } },
  });
  render(<Home />);

  const user = await convert("abc");
  await screen.findByRole("alert");
  await user.click(screen.getByRole("button", { name: "지우기" }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("입력란에서 Enter를 눌러도 변환된다", async () => {
  stubConvert({ body: ARTICLE });
  render(<Home />);

  const user = userEvent.setup();
  await user.type(screen.getByLabelText("웹 페이지 URL"), "https://example.com/a{Enter}");

  expect(
    await screen.findByRole("heading", { level: 2, name: ARTICLE.title })
  ).toBeInTheDocument();
});

async function convertDone() {
  stubConvert({ body: ARTICLE });
  render(<Home />);
  const user = await convert("https://velog.io/@seoyeon/md");
  await screen.findByRole("heading", { level: 2, name: ARTICLE.title });
  return user;
}

test("변환 전에는 내보내기 버튼이 보이지 않는다", () => {
  render(<Home />);

  expect(screen.queryByRole("button", { name: "복사하기" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /다운로드/ })).not.toBeInTheDocument();
});

test("복사하기를 누르면 Markdown 본문이 클립보드에 들어가고 복사했다는 피드백이 보인다", async () => {
  const user = await convertDone();
  const writeText = vi.spyOn(navigator.clipboard, "writeText");

  await user.click(screen.getByRole("button", { name: "복사하기" }));

  expect(writeText).toHaveBeenCalledWith(ARTICLE.markdown);
  expect(await screen.findByText("Markdown을 복사했습니다")).toBeInTheDocument();
});

test(".md 다운로드는 제목을 파일명으로 한 Markdown 파일을 내려받는다", async () => {
  const user = await convertDone();
  const createObjectURL = vi.fn(() => "blob:mock");
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
  const clicked: HTMLAnchorElement[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    clicked.push(this);
  });

  await user.click(screen.getByRole("button", { name: ".md 다운로드" }));

  expect(clicked).toHaveLength(1);
  expect(clicked[0].download).toBe("Markdown 문법을 5분 만에 정리하기.md");
  const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
  expect(await blob.text()).toBe(ARTICLE.markdown);
});

function stubOpen() {
  const open = vi.fn();
  vi.stubGlobal("open", open);
  return open;
}

function openedQuery(open: ReturnType<typeof vi.fn>) {
  const url = new URL(open.mock.calls[0][0] as string);
  return { origin: url.origin + url.pathname, q: url.searchParams.get("q") };
}

test("프롬프트를 고르지 않으면 본문만 ChatGPT 새 탭으로 넘긴다", async () => {
  const user = await convertDone();
  const open = stubOpen();

  await user.click(screen.getByRole("button", { name: "ChatGPT로 열기" }));

  expect(open).toHaveBeenCalledWith(expect.any(String), "_blank", "noopener,noreferrer");
  expect(openedQuery(open)).toEqual({ origin: "https://chatgpt.com/", q: ARTICLE.markdown });
});

test("프리셋 프롬프트를 고르면 본문 앞에 붙여 Claude 새 탭으로 넘긴다", async () => {
  const user = await convertDone();
  const open = stubOpen();

  await user.click(screen.getByRole("button", { name: "한국어로 번역해줘" }));
  await user.click(screen.getByRole("button", { name: "Claude로 열기" }));

  expect(openedQuery(open)).toEqual({
    origin: "https://claude.ai/new",
    q: `한국어로 번역해줘\n\n${ARTICLE.markdown}`,
  });
});

test("고른 프리셋을 다시 누르면 선택이 해제되고, 프리셋은 하나만 선택된다", async () => {
  const user = await convertDone();
  const summary = screen.getByRole("button", { name: "요약해줘" });
  const easy = screen.getByRole("button", { name: "쉽게 설명해줘" });

  await user.click(summary);
  expect(summary).toHaveAttribute("aria-pressed", "true");
  await user.click(easy);
  expect(summary).toHaveAttribute("aria-pressed", "false");
  expect(easy).toHaveAttribute("aria-pressed", "true");
  await user.click(easy);
  expect(easy).toHaveAttribute("aria-pressed", "false");
});

test("직접 입력을 고르면 입력란이 나타나고, 입력한 문구가 본문 앞에 붙는다", async () => {
  const user = await convertDone();
  const open = stubOpen();
  expect(screen.queryByLabelText("직접 입력 프롬프트")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "직접 입력" }));
  await user.type(screen.getByLabelText("직접 입력 프롬프트"), "핵심만 3줄로");
  await user.click(screen.getByRole("button", { name: "ChatGPT로 열기" }));

  expect(openedQuery(open).q).toBe(`핵심만 3줄로\n\n${ARTICLE.markdown}`);
});

test("직접 입력을 골랐어도 입력란이 비어 있으면 본문만 넘기고, 프리셋과 동시에 선택되지 않는다", async () => {
  const user = await convertDone();
  const open = stubOpen();

  await user.click(screen.getByRole("button", { name: "요약해줘" }));
  await user.click(screen.getByRole("button", { name: "직접 입력" }));
  expect(screen.getByRole("button", { name: "요약해줘" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  await user.click(screen.getByRole("button", { name: "Claude로 열기" }));

  expect(openedQuery(open).q).toBe(ARTICLE.markdown);
});

test("직접 입력한 문구는 저장되지 않아 지우고 다시 변환하면 비어 있다", async () => {
  const user = await convertDone();
  await user.click(screen.getByRole("button", { name: "직접 입력" }));
  await user.type(screen.getByLabelText("직접 입력 프롬프트"), "임시 문구");

  await user.click(screen.getByRole("button", { name: "지우기" }));
  await user.type(screen.getByLabelText("웹 페이지 URL"), "https://example.com/b");
  await user.click(screen.getByRole("button", { name: "변환하기" }));
  await screen.findByRole("heading", { level: 2, name: ARTICLE.title });

  expect(screen.queryByLabelText("직접 입력 프롬프트")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "직접 입력" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
});

test("합친 글이 6,000자를 넘으면 클립보드에 복사하고 빈 새 채팅을 연 뒤 붙여넣기 안내를 보여 준다", async () => {
  const longMarkdown = "가".repeat(6001);
  stubConvert({ body: { ...ARTICLE, markdown: longMarkdown } });
  render(<Home />);
  const user = await convert("https://example.com/long");
  await screen.findByRole("heading", { level: 2, name: ARTICLE.title });
  const writeText = vi.spyOn(navigator.clipboard, "writeText");
  const open = stubOpen();

  await user.click(screen.getByRole("button", { name: "Claude로 열기" }));

  expect(writeText).toHaveBeenCalledWith(longMarkdown);
  expect(open).toHaveBeenCalledWith(
    "https://claude.ai/new",
    "_blank",
    "noopener,noreferrer"
  );
  expect(
    await screen.findByText(/내용이 길어 클립보드에 복사했습니다/)
  ).toBeInTheDocument();
});

test("6,000자 이하일 때는 클립보드 안내가 나오지 않는다", async () => {
  const user = await convertDone();
  stubOpen();

  await user.click(screen.getByRole("button", { name: "Claude로 열기" }));

  expect(screen.queryByText(/클립보드에 복사했습니다/)).not.toBeInTheDocument();
});

function stubSystemTheme(prefersDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: prefersDark && query.includes("dark"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

test("다크모드 토글을 누르면 어두운 테마가 켜지고 다시 누르면 꺼진다", async () => {
  stubSystemTheme(false);
  render(<Home />);
  const user = userEvent.setup();

  await user.click(screen.getByRole("button", { name: "다크모드 전환" }));
  expect(document.documentElement).toHaveClass("dark");

  await user.click(screen.getByRole("button", { name: "다크모드 전환" }));
  expect(document.documentElement).not.toHaveClass("dark");
});

test("시스템이 다크모드이면 처음부터 어두운 테마로 보인다", async () => {
  stubSystemTheme(true);
  render(<Home />);

  expect(await screen.findByRole("button", { name: "다크모드 전환" })).toBeInTheDocument();
  expect(document.documentElement).toHaveClass("dark");
});

beforeEach(() => {
  stubSystemTheme(false);
});

test("클립보드 쓰기가 거부되면 복사하지 못했다고 알려 준다", async () => {
  const user = await convertDone();
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
    new DOMException("denied", "NotAllowedError")
  );

  await user.click(screen.getByRole("button", { name: "복사하기" }));

  expect(await screen.findByText(/복사하지 못했습니다/)).toBeInTheDocument();
  expect(screen.queryByText("Markdown을 복사했습니다")).not.toBeInTheDocument();
});

test("긴 글을 클립보드에 쓰지 못하면 새 채팅을 열지 않고 복사 실패를 알려 준다", async () => {
  stubConvert({ body: { ...ARTICLE, markdown: "가".repeat(6001) } });
  render(<Home />);
  const user = await convert("https://example.com/long");
  await screen.findByRole("heading", { level: 2, name: ARTICLE.title });
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
    new DOMException("denied", "NotAllowedError")
  );
  const open = stubOpen();

  await user.click(screen.getByRole("button", { name: "ChatGPT로 열기" }));

  expect(await screen.findByText(/복사하지 못했습니다/)).toBeInTheDocument();
  expect(screen.queryByText(/내용이 길어 클립보드에 복사했습니다/)).not.toBeInTheDocument();
  expect(open).not.toHaveBeenCalled();
});

test("변환 중에 지우기를 누르면 늦게 도착한 응답이 결과를 다시 띄우지 않는다", async () => {
  let finish!: (res: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>((resolve) => (finish = resolve)))
  );
  render(<Home />);
  const user = await convert("https://example.com/slow");
  await screen.findByRole("status", { name: "변환 중" });

  await user.click(screen.getByRole("button", { name: "지우기" }));
  finish(Response.json(ARTICLE));
  await new Promise((r) => setTimeout(r, 50));

  expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  expect(screen.getByLabelText("웹 페이지 URL")).toHaveValue("");
});
