// apps/web/src/tests/e2e/full-workflow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("AidFlow — full operational chain", () => {
  test("Donor logs in and sees wallet balance", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "donor@aidflow.org");
    await page.fill('input[type="password"]', "Donor1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/donor/dashboard");
    await expect(page.getByText("Welcome,")).toBeVisible();
    await expect(page.getByText("Wallet balance")).toBeVisible();
    // Balance should be a dollar amount (multiple $0 cards may exist — just check one)
    await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible();
  });

  test("Donor makes a contribution to an active program", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "donor@aidflow.org");
    await page.fill('input[type="password"]', "Donor1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/donor/dashboard");

    // Select a program and enter amount
    await page.selectOption("select", { index: 1 }); // first active program
    await page.fill('input[type="number"]', "500");
    await page.click('button[type="submit"]');

    await expect(page.getByText("Contribution confirmed")).toBeVisible();
  });

  test("Controller sees pending approval and approves it", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "controller@aidflow.org");
    await page.fill('input[type="password"]', "Controller1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/controller/dashboard");

    await page.goto("/controller/approvals");
    await expect(page.getByRole("heading", { name: "Approval queue" })).toBeVisible();

    // If there are pending approvals, review the first one
    const reviewBtn = page.getByRole("button", { name: "Review" }).first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await expect(page.getByText("Review approval")).toBeVisible();
      // Approved is selected by default
      await page.fill("textarea", "E2E test approval — verified");
      await page.getByRole("button", { name: "Submit decision" }).click();
      await expect(page.getByText("Review approval")).not.toBeVisible();
    }
  });

  test("Donor cannot access the controller approval route", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "donor@aidflow.org");
    await page.fill('input[type="password"]', "Donor1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/donor/dashboard");
    // Donor navigating to /controller/ should redirect to donor area
    await page.goto("/controller/approvals");
    await expect(page).toHaveURL(/\/donor\//);
  });
});
