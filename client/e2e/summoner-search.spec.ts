import { expect, test } from "@playwright/test";

test.describe("summoner search", () => {
  test("searches for a summoner and renders match history", async ({ page }) => {
    await page.goto("/?mswScenario=default");

    await page.getByLabel("Summoner Name").fill("Khoji");
    await page.getByLabel("Tag Line").fill("777");
    await page.getByLabel("Region").selectOption("euw1");
    await page.getByRole("button", { name: /search matches/i }).click();

    await expect(page.getByRole("heading", { name: "Khoji#777" })).toBeVisible();
    await expect(page.getByText("Recent Matches (2)")).toBeVisible();
    await expect(page.getByTestId("match-card-EUW1_100001")).toContainText("Victory");
    await expect(page.getByTestId("match-card-EUW1_100002")).toContainText("Defeat");
    await expect(page.getByTestId("match-card-EUW1_100002")).toContainText("196");
    await expect(page.getByText("Match Summary")).toBeVisible();
  });

  test("shows an error when the summoner lookup fails", async ({ page }) => {
    await page.goto("/?mswScenario=summoner-not-found");

    await page.getByLabel("Summoner Name").fill("MissingPlayer");
    await page.getByLabel("Tag Line").fill("404");
    await page.getByRole("button", { name: /search matches/i }).click();

    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(page.getByText("Summoner not found")).toBeVisible();
  });
});