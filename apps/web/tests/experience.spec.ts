import { expect, test } from "@playwright/test";

test("landing routes to a functioning local workspace without invented metrics", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Good decisions grow from good evidence/i })).toBeVisible();
  await expect(page.getByText("50,000+", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Scenarios" }).click();
  await expect(page.getByText("Illustrative end-of-day water").first()).toBeVisible();
  await page.getByRole("button", { name: "Passport", exact: true }).click();
  await expect(page.getByText("Evidence snapshot", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Explore the prototype/i }).click();
  await expect(page).toHaveURL(/\/workspace/);
  await expect(page.getByRole("heading", { name: /Every decision begins with a better question/i })).toBeVisible();
  await page.getByRole("link", { name: /Set up a demo farm/i }).click();
  await expect(page).toHaveURL(/\/workspace\/farms/);
  await expect(page.getByRole("heading", { name: /Your farm, in context/i })).toBeVisible();
});

test("small-screen navigation stays usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await toggle.click();
  await expect(page.getByRole("link", { name: "How it works", exact: true }).first()).toBeVisible();
  await page.locator("#lp-nav-links").getByRole("link", { name: "How it works" }).click();
  await expect(page.getByRole("heading", { name: /A little more context/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Open workspace menu" }).click();
  await page.getByRole("link", { name: "Weather evidence" }).click();
  await expect(page).toHaveURL(/\/workspace\/weather/);
  await expect(page.getByRole("button", { name: "Open workspace menu" })).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
});

test("farm → observation → passport → self-reported follow-up persists through API across separate pages", async ({ page }) => {
  await page.goto("/workspace/farms");
  await expect(page.getByRole("button", { name: /API connected/i })).toBeVisible({ timeout: 25_000 });
  const farm = "Automated sample farm " + Date.now();
  const form = page.locator(".farm-create-card");
  await form.getByRole("textbox", { name: "Farm name" }).fill(farm);
  await form.getByRole("textbox", { name: "Crop" }).fill("Cotton");
  await form.getByRole("textbox", { name: "General region" }).fill("Example region");
  await form.getByRole("spinbutton", { name: "Area · hectares" }).fill("1.2");
  await form.getByRole("button", { name: /Create & select farm/i }).click();
  await expect(page.locator(".farm-active-banner")).toContainText(farm);
  await expect(page.getByRole("heading", { name: farm })).toBeVisible();

  const observations = page.locator(".farm-observation-form");
  await observations.getByRole("spinbutton", { name: "Soil moisture (%)" }).fill("31");
  await observations.getByRole("textbox", { name: /Observation note/i }).fill("Manual sample only");
  await observations.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.locator(".observation-entry").first()).toContainText("31% soil moisture");

  await page.getByRole("link", { name: /Continue to Decision Lab/i }).click();
  await expect(page).toHaveURL(/\/workspace\/decisions/);
  await page.getByRole("button", { name: /Compare & save passport/i }).click();
  await expect(page.getByText("Saved to selected demo farm")).toBeVisible();
  await page.getByRole("link", { name: /Open evidence passports/i }).click();
  await expect(page).toHaveURL(/\/workspace\/passports/);
  await expect(page.locator(".passport-choice")).toHaveCount(1);
  await page.locator(".passport-choice").first().click();
  await expect(page.getByRole("heading", { name: "Frozen evidence snapshot" })).toBeVisible();
  await expect(page.locator(".passport-provenance")).toContainText("manual unverified");
  await expect(page.getByText("31% manual, unverified", { exact: false })).toBeVisible();

  await page.getByRole("combobox", { name: "Action reported" }).selectOption("waited");
  await page.getByRole("textbox", { name: "Optional note" }).fill("Demo only: delayed a decision");
  await page.getByRole("button", { name: "Save follow-up" }).click();
  await expect(page.locator(".followup-entry").first()).toContainText("waited · self-reported");
  await expect(page.locator(".followup-entry").first()).toContainText("Demo only: delayed a decision");
});

test("weather panel distinguishes external forecast from user-entered scenario values", async ({ page }) => {
  await page.route("**/v1/weather/forecast?**", async (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({
      source: "Open-Meteo", source_url: "https://open-meteo.com/en/docs",
      retrieved_at_utc: "2026-09-25T00:00:00+00:00", forecast_start_utc: "2026-09-25T00:00:00+00:00",
      forecast_end_utc: "2026-09-26T00:00:00+00:00", requested_latitude: 21.2, requested_longitude: 81.3,
      grid_latitude: 21.2, grid_longitude: 81.3, temperature_c: 27,
      relative_humidity_pct: 63, expected_precipitation_next_24h_mm: 4,
      warning: "Modeled forecast for a geographic grid cell, not a field observation.",
    }),
  }));
  await page.goto("/workspace/weather");
  await page.getByRole("spinbutton", { name: "Approximate latitude" }).fill("21.2");
  await page.getByRole("spinbutton", { name: "Approximate longitude" }).fill("81.3");
  await page.getByRole("button", { name: /Fetch forecast/i }).click();
  await expect(page.getByRole("heading", { name: "Regional forecast" })).toBeVisible();
  await expect(page.locator(".weather-metrics")).toContainText("27°C");
  await page.getByText("Source, coverage & limitations").click();
  await expect(page.getByRole("link", { name: /Read Open-Meteo source documentation/i })).toBeVisible();
  await expect(page.getByText(/not automatically used in the Decision Lab/)).toBeVisible();
});
