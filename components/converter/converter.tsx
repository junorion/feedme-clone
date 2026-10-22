"use client";

import { useRef, useState } from "react";
import { ArrowRightIcon, XIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { ExportPanel } from "./export-panel";
import { MarkdownView } from "./markdown-view";

type Article = { title: string; author: string | null; markdown: string };
type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; article: Article }
  | { kind: "error"; title: string; message: string };

const NETWORK_ERROR = {
  kind: "error",
  title: "서버에 연결하지 못했습니다",
  message: "네트워크 상태를 확인하고 다시 시도해 주세요.",
} as const;

export function Converter() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // 지우기나 새 변환 뒤에 늦게 도착한 이전 응답을 버리기 위한 요청 번호.
  const requestId = useRef(0);

  function clear() {
    requestId.current += 1;
    setUrl("");
    setStatus({ kind: "idle" });
  }

  async function convert() {
    const id = ++requestId.current;
    const isLatest = () => id === requestId.current;
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!isLatest()) return;
      if (!res.ok) {
        setStatus({
          kind: "error",
          title: "변환하지 못했습니다",
          message: data.error.message,
        });
        return;
      }
      setStatus({ kind: "done", article: data });
    } catch {
      if (isLatest()) setStatus(NETWORK_ERROR);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="url" className="text-sm font-medium">
          웹 페이지 URL
        </label>
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            convert();
          }}
        >
          <Input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pr-18"
          />
          {url && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-9 -translate-y-1/2 rounded-full border-2 border-transparent text-muted-foreground hover:border-foreground hover:bg-transparent hover:text-foreground focus-visible:border-foreground focus-visible:text-foreground focus-visible:ring-0"
              aria-label="지우기"
              onClick={clear}
            >
              <XIcon />
            </Button>
          )}
          <Button
            type="submit"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full"
            aria-label="변환하기"
          >
            <ArrowRightIcon />
          </Button>
        </form>
      </div>

      {status.kind === "error" && (
        <Alert variant="destructive">
          <AlertTitle>{status.title}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      {status.kind === "loading" && (
        <Card role="status" aria-label="변환 중" aria-busy="true">
          <CardHeader className="gap-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      )}

      {status.kind === "done" && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">{status.article.title}</h2>
            {status.article.author && (
              <p className="text-sm text-muted-foreground">
                저자 <b className="font-medium text-foreground">{status.article.author}</b>
              </p>
            )}
          </CardHeader>
          <CardContent className="max-h-[60vh] overflow-y-auto">
            <MarkdownView markdown={status.article.markdown} />
          </CardContent>
        </Card>
      )}

      {status.kind === "done" && <ExportPanel article={status.article} />}
    </div>
  );
}
