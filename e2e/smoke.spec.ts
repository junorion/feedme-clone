import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 URL 입력란과 변환하기 버튼이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("URL을 Markdown으로");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Markdown");
  await expect(page.getByLabel("웹 페이지 URL")).toBeVisible();
  await expect(page.getByRole("button", { name: "변환하기" })).toBeVisible();
});
