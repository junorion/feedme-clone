"use client";

import { useEffect } from "react";
import { MoonIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

// 저장하지 않는다. 처음에는 시스템 설정을 따르고, 이후에는 토글이 정한다.
export function ThemeToggle() {
  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="다크모드 전환"
      onClick={() => document.documentElement.classList.toggle("dark")}
    >
      <MoonIcon />
    </Button>
  );
}
