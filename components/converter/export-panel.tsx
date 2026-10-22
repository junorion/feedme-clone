"use client";

import { useState } from "react";
import { CopyIcon, DownloadIcon, InfoIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { buildLlmHandoff, type LlmService } from "./llm-handoff";

const PRESETS = ["요약해줘", "한국어로 번역해줘", "쉽게 설명해줘"] as const;
const CUSTOM = "직접 입력";

const COPY_FAILED = "클립보드에 복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.";

type Article = { title: string; markdown: string };

function fileNameFor(title: string) {
  const safe = title.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  return `${safe || "page"}.md`;
}

export function ExportPanel({ article }: { article: Article }) {
  const [feedback, setFeedback] = useState("");
  const [longNotice, setLongNotice] = useState(false);
  // 프리셋 문구, CUSTOM, 또는 선택 없음(null). 저장하지 않고 이 화면에만 둔다.
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");

  const prompt = selected === CUSTOM ? customText.trim() : (selected ?? "");

  function toggle(name: string) {
    setSelected(selected === name ? null : name);
    setLongNotice(false);
  }

  async function openInLlm(service: LlmService) {
    const handoff = buildLlmHandoff({
      service,
      prompt,
      markdown: article.markdown,
    });
    if (handoff.mode === "clipboard") {
      try {
        await navigator.clipboard.writeText(handoff.text);
      } catch {
        setLongNotice(false);
        setFeedback(COPY_FAILED);
        return;
      }
    }
    setLongNotice(handoff.mode === "clipboard");
    window.open(handoff.url, "_blank", "noopener,noreferrer");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(article.markdown);
      setFeedback("Markdown을 복사했습니다");
    } catch {
      setFeedback(COPY_FAILED);
    }
  }

  function download() {
    const blob = new Blob([article.markdown], { type: "text/markdown" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileNameFor(article.title);
    link.click();
    URL.revokeObjectURL(href);
    setFeedback(`${link.download} 파일을 내려받았습니다`);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">
        프롬프트 선택{" "}
        <span className="font-normal text-muted-foreground">
          (선택 사항, 본문 앞에 붙습니다)
        </span>
      </h2>
      <div role="group" aria-label="프롬프트 프리셋" className="flex flex-wrap gap-2">
        {[...PRESETS, CUSTOM].map((name) => (
          <Button
            key={name}
            size="sm"
            variant={selected === name ? "default" : "outline"}
            className="rounded-full"
            aria-pressed={selected === name}
            onClick={() => toggle(name)}
          >
            {name}
          </Button>
        ))}
      </div>
      {selected === CUSTOM && (
        <Input
          aria-label="직접 입력 프롬프트"
          placeholder="LLM에게 요청할 내용을 입력하세요 (저장되지 않습니다)"
          value={customText}
          onChange={(e) => {
            setCustomText(e.target.value);
            setLongNotice(false);
          }}
        />
      )}

      <h2 className="mt-2 text-sm font-semibold">내보내기</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={copy}>
          <CopyIcon data-icon="inline-start" />
          복사하기
        </Button>
        <Button variant="outline" onClick={download}>
          <DownloadIcon data-icon="inline-start" />
          .md 다운로드
        </Button>
        <Button onClick={() => openInLlm("chatgpt")}>ChatGPT로 열기</Button>
        <Button onClick={() => openInLlm("claude")}>Claude로 열기</Button>
      </div>
      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        {feedback}
      </p>
      {longNotice && (
        <Alert>
          <InfoIcon />
          <AlertDescription>
            내용이 길어 클립보드에 복사했습니다. 새 채팅에 붙여넣기(Ctrl+V)하세요.
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}
