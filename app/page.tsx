import { Converter } from "@/components/converter";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            URL을 Markdown으로
          </h1>
          <p className="text-sm text-muted-foreground">
            웹 페이지 주소를 붙여넣으면 본문만 Markdown으로 뽑아 LLM에 바로 넘깁니다.
          </p>
        </div>
        <ThemeToggle />
      </header>
      <Converter />
    </main>
  );
}
