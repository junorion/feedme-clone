import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 결과 카드 안에서는 카드 제목(h2) 아래에 본문 제목이 오도록 한 단계씩 낮춘다.
const heading = (Tag: "h3" | "h4" | "h5" | "h6") =>
  function Heading({ children }: { children?: React.ReactNode }) {
    return <Tag>{children}</Tag>;
  };

export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div
      className={[
        "text-[0.9375rem] leading-7 wrap-anywhere",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold",
        "[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold",
        "[&_h5]:mt-4 [&_h5]:mb-1 [&_h5]:text-sm [&_h5]:font-semibold",
        "[&_h6]:mt-4 [&_h6]:mb-1 [&_h6]:text-sm [&_h6]:font-medium",
        "[&>:first-child]:mt-0",
        "[&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1",
        "[&_a]:underline [&_a]:underline-offset-4",
        "[&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.875em]",
        "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
        "[&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:border-b [&_td]:px-2 [&_td]:py-2",
        "[&_img]:max-w-full",
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: heading("h3"),
          h2: heading("h4"),
          h3: heading("h5"),
          h4: heading("h6"),
          h5: heading("h6"),
          h6: heading("h6"),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
