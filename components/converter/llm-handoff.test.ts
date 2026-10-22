import { expect, test } from "vitest";

import { buildLlmHandoff } from "./llm-handoff";

test("합친 글이 6,000자 이하이면 ChatGPT 질문란을 채우는 URL로 넘긴다", () => {
  const handoff = buildLlmHandoff({
    service: "chatgpt",
    prompt: "요약해줘",
    markdown: "# 제목\n\n본문입니다.",
  });

  expect(handoff.mode).toBe("url");
  const url = new URL(handoff.url);
  expect(url.origin + url.pathname).toBe("https://chatgpt.com/");
  expect(url.searchParams.get("q")).toBe("요약해줘\n\n# 제목\n\n본문입니다.");
});

test("Claude는 새 채팅 주소의 q 파라미터로 넘긴다", () => {
  const handoff = buildLlmHandoff({
    service: "claude",
    prompt: "",
    markdown: "본문",
  });

  expect(handoff.mode).toBe("url");
  const url = new URL(handoff.url);
  expect(url.origin + url.pathname).toBe("https://claude.ai/new");
  expect(url.searchParams.get("q")).toBe("본문");
});

test("프롬프트와 구분 줄바꿈을 포함해 정확히 6,000자이면 아직 URL로 넘긴다", () => {
  const prompt = "요약해줘";
  const markdown = "가".repeat(6000 - prompt.length - 2);

  const handoff = buildLlmHandoff({ service: "chatgpt", prompt, markdown });

  expect(handoff.mode).toBe("url");
});

test("합친 글이 6,000자를 넘으면 합친 텍스트를 클립보드로 넘기고 빈 새 채팅을 연다", () => {
  const prompt = "요약해줘";
  const markdown = "가".repeat(6000 - prompt.length - 2 + 1);

  const handoff = buildLlmHandoff({ service: "claude", prompt, markdown });

  expect(handoff.mode).toBe("clipboard");
  if (handoff.mode !== "clipboard") return;
  expect(handoff.text).toBe(`${prompt}\n\n${markdown}`);
  expect(handoff.url).toBe("https://claude.ai/new");
});

test("프롬프트가 없으면 본문 길이만으로 판단하고 본문만 넘긴다", () => {
  const markdown = "가".repeat(6000);

  const atLimit = buildLlmHandoff({ service: "chatgpt", prompt: "", markdown });
  const overLimit = buildLlmHandoff({
    service: "chatgpt",
    prompt: "",
    markdown: markdown + "나",
  });

  expect(atLimit.mode).toBe("url");
  expect(overLimit.mode).toBe("clipboard");
  if (overLimit.mode !== "clipboard") return;
  expect(overLimit.text).toBe(markdown + "나");
});
