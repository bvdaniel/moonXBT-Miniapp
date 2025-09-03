import { test, expect } from "@playwright/test";

test.describe("Airdrop smoke flows", () => {
  test("renders, leaderboard tab, claim without wallet, impersonation, twitter input, claim missing list", async ({
    page,
    baseURL,
  }) => {
    // 1) Load home
    await page.goto(baseURL!);
    await expect(page.getByRole("heading", { name: "AIRDROP" })).toBeVisible();

    // 2) Leaderboard tab
    await page.getByRole("button", { name: "LEADERBOARD" }).click();
    await expect(
      page.getByRole("heading", { name: "LEADERBOARD" })
    ).toBeVisible();

    // 3) Back to tasks and claim without wallet
    await page.getByRole("button", { name: "TASKS" }).click();
    await page.getByRole("button", { name: "Claim Airdrop" }).click();
    await expect(
      page.getByText(/Please connect your wallet to continue/i)
    ).toBeVisible();

    // 4) Impersonation
    const impersonate = "0x1111111111111111111111111111111111111111";
    await page.goto(`${baseURL}/?impersonate=${impersonate}`);
    await expect(page.getByText("Your $A0X Balance")).toBeVisible();
    await expect(page.getByText(/0M \/ 10M A0X/)).toBeVisible();

    // 5) Twitter input open and submit
    await page.getByTitle("Add manually").click();
    const input = page.getByRole("textbox", { name: "@username" });
    await expect(input).toBeVisible();
    await input.fill("moonxbt_user123");
    await page.getByRole("button", { name: "Submit" }).click();

    // 6) Claim shows missing required list
    await page.getByRole("button", { name: "Claim Airdrop" }).click();
    const claimMessage = page.getByTestId("claim-message");
    await expect(claimMessage).toBeVisible();
    await expect(claimMessage).toContainText(
      /Please complete the required tasks/i
    );
    const missingList = page.getByTestId("missing-task-list");
    await expect(missingList).toBeVisible();
    await expect(page.getByTestId("missing-task-item-hold-a0x")).toBeVisible();
    await expect(
      page.getByTestId("missing-task-item-follow-twitter")
    ).toBeVisible();
    await expect(
      page.getByTestId("missing-task-item-share-social")
    ).toBeVisible();
  });
});
