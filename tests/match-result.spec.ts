/**
 * Playwright E2E coverage for the MatchResultModal.
 *
 * Specs run against the dev-only preview page mounted at
 * /dev/match-result-preview. The page renders the real component with
 * 4 player names that the user (or the test) types into the form. The
 * preview also exposes a "scenario" toolbar — each button applies a
 * pre-built tiebreaker fixture with one click, so the specs never have
 * to type 4×4 = 16 numeric inputs by hand.
 *
 * The /api/v1/pos/tournaments/matches/{matchId}/result endpoint is
 * intercepted with page.route() so no real network calls are made.
 *
 * Run from project root:
 *
 *   npx playwright test tests/match-result.spec.ts
 *
 * (The dev server is expected to be running at http://localhost:3000.)
 */

import { Page, expect, test } from "@playwright/test";

const PREVIEW_URL = "/dev/match-result-preview";
const RESULT_URL_PATTERN =
  /\/api\/v1\/pos\/tournaments\/matches\/[^/]+\/result$/;
const CANCEL_URL_PATTERN =
  /\/api\/v1\/pos\/tournaments\/matches\/[^/]+\/cancel$/;

type PlayerKey = "p1" | "p2" | "p3" | "p4";
const SLOT_INDEX: Record<PlayerKey, number> = {
  p1: 0,
  p2: 1,
  p3: 2,
  p4: 3,
};

type ResultPayload = {
  matchId: string;
  winnerUserId: string;
  recordedByStaffId?: string;
  notes?: string;
  results: Array<{
    userId: string;
    userName?: string;
    score: number;
    cardsBought: number;
  }>;
};

type CancelPayload = { reason: string };

type CapturedCalls = { result: ResultPayload[]; cancel: CancelPayload[] };

async function installApiMock(page: Page): Promise<{ calls: CapturedCalls }> {
  const calls: CapturedCalls = { result: [], cancel: [] };

  await page.route(RESULT_URL_PATTERN, async (route) => {
    const request = route.request();
    calls.result.push(request.postDataJSON() as ResultPayload);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, id: "match-1d4f" }),
    });
  });

  await page.route(CANCEL_URL_PATTERN, async (route) => {
    const request = route.request();
    calls.cancel.push(request.postDataJSON() as CancelPayload);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  return { calls };
}

async function gotoPreview(page: Page) {
  await page.goto(PREVIEW_URL);
  await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible();
}

async function setRoster(page: Page, names: Record<PlayerKey, string>) {
  for (const [key, name] of Object.entries(names) as [PlayerKey, string][]) {
    const input = page.locator(`[data-testid="roster-name-${SLOT_INDEX[key]}"]`);
    await input.fill(name);
  }
}

async function applyScenario(page: Page, scenarioTestId: string) {
  await page.locator(`[data-testid="${scenarioTestId}"]`).click();
  // The scenario bumps the modal's `key`, which remounts the component
  // and re-initialises internal state. Wait for that round-trip.
  await expect(page.locator('[data-testid="player-card"]').first()).toBeVisible();
}

async function getWinnerId(page: Page): Promise<string | null> {
  return page
    .locator('[data-testid="player-card"][data-is-winner="true"]')
    .getAttribute("data-player-id");
}

async function getWinnerName(page: Page): Promise<string | null> {
  // The name is the only .font-black span that is NOT the winner badge.
  const card = page.locator(
    '[data-testid="player-card"][data-is-winner="true"]',
  );
  return (
    (await card
      .locator('.font-black.text-sm')
      .first()
      .textContent())?.trim() ?? null
  );
}

test.describe("MatchResultModal — E2E", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMock(page);
  });

  test("renders 4 player cards with user-supplied names and picks a default winner when tied", async ({
    page,
  }) => {
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });

    const cards = page.locator('[data-testid="player-card"]');
    await expect(cards).toHaveCount(4);

    // Names must be rendered inside the cards, no "u-alice" anywhere.
    await expect(
      page.locator('[data-testid="player-card"]').first(),
    ).toContainText("Minh");
    await expect(
      page.locator('[data-testid="player-card"][data-player-id="slot-1"]'),
    ).toContainText("Linh");
    await expect(
      page.locator('[data-testid="player-card"][data-player-id="slot-2"]'),
    ).toContainText("Hùng");
    await expect(
      page.locator('[data-testid="player-card"][data-player-id="slot-3"]'),
    ).toContainText("Trang");

    // The card-level data-player-id should be derived from the slot
    // (slot-0..slot-3), not hard-coded "u-alice" etc.
    const winnerId = await getWinnerId(page);
    expect(winnerId).toBe("slot-0");

    const winnerName = await getWinnerName(page);
    expect(winnerName).toBe("Minh");

    await expect(page.locator('[data-testid="winner-badge"]')).toHaveCount(1);
  });

  test("Rule 1 — highest Prestige wins regardless of cards (one click)", async ({
    page,
  }) => {
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });
    await applyScenario(page, "scenario-r1");

    const winnerId = await getWinnerId(page);
    expect(winnerId).toBe("slot-0");
  });

  test("Rule 2 — tied prestige, fewer cards wins (one click)", async ({
    page,
  }) => {
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });
    await applyScenario(page, "scenario-r2");

    const winnerId = await getWinnerId(page);
    expect(winnerId).toBe("slot-1");
  });

  test("Rule 3 — tied prestige & cards, more nobles wins (one click)", async ({
    page,
  }) => {
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });
    await applyScenario(page, "scenario-r3");

    const winnerId = await getWinnerId(page);
    expect(winnerId).toBe("slot-1");
  });

  test("Rule 4 — full chain, more remaining gems decides (one click)", async ({
    page,
  }) => {
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });
    await applyScenario(page, "scenario-r4");

    const winnerId = await getWinnerId(page);
    expect(winnerId).toBe("slot-1");
  });

  test("Rule 5 — all four tied, later turn order loses (one click)", async ({
    page,
  }) => {
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });
    await applyScenario(page, "scenario-r5");

    // All stats tied 20/10/1/1 → tiebreaker chain reaches turn order.
    // slot-1 has the highest turn order (đi sau nhất) → loses.
    const winnerId = await getWinnerId(page);
    expect(winnerId).toBe("slot-0");
  });

  test("Full tie scenario — winner falls back to first listed player", async ({
    page,
  }) => {
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });
    await applyScenario(page, "scenario-tie");

    const winnerId = await getWinnerId(page);
    expect(winnerId).toBe("slot-0");
  });

  test("renders all 4 tiebreaker inputs per player (turn order is implicit)", async ({
    page,
  }) => {
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });

    // 4 players × 4 user-editable inputs = 16 inputs total. Turn order
    // is auto-derived from slot index and is NOT exposed as an input.
    for (const testid of [
      "prestige-score",
      "cards-bought",
      "noble-cards",
      "gems-remaining",
    ]) {
      await expect(page.locator(`[data-testid="${testid}"]`)).toHaveCount(4);
    }

    // There must NOT be any turn-order input — staff shouldn't see it.
    await expect(page.locator('[data-testid="turn-order"]')).toHaveCount(0);
  });

  test("Điểm uy tín is clamped to 0–15 (Splendor endgame)", async ({
    page,
  }) => {
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });

    const score = page.locator(
      '[data-testid="prestige-score"][data-player-id="slot-0"]',
    );

    // Default is 15 — already at the cap. The +1 button should NOT
    // push it over.
    await expect(score).toHaveValue("15");
    await page
      .locator('button[aria-label="Tăng 1 điểm"][data-player-id], button[aria-label="Tăng 1 điểm"]')
      .first()
      .click();
    await expect(score).toHaveValue("15");
  });

  test("Edit mode on individual input — live winner re-evaluation", async ({
    page,
  }) => {
    // No scenario shortcut: the user types directly. This proves the
    // modal re-sorts the table every time a score changes.
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });

    // Default: all 15/10 → slot-0 (Minh) wins by input order.
    expect(await getWinnerId(page)).toBe("slot-0");

    // Boost Lính's prestige to 25 → Lính takes the lead.
    const linhScore = page.locator(
      '[data-testid="prestige-score"][data-player-id="slot-1"]',
    );
    await linhScore.fill("25");
    await linhScore.blur();
    expect(await getWinnerId(page)).toBe("slot-1");
  });

  test("submit — one click applies scenario, then POSTs the full payload", async ({
    page,
  }) => {
    const { calls } = await installApiMock(page);
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });
    await applyScenario(page, "scenario-r1");

    await page.locator('[data-testid="submit-result"]').click();

    await expect(page.locator('[data-testid="last-payload"]')).toBeVisible();
    expect(calls.result).toHaveLength(1);
    expect(calls.cancel).toHaveLength(0);

    const payload = calls.result[0];
    expect(payload.matchId).toBe("match-1d4f");
    expect(payload.winnerUserId).toBe("slot-0"); // Minh (P1) — Rule 1 winner
    expect(payload.recordedByStaffId).toBe("staff-test");
    expect(payload.results).toHaveLength(4);

    // The payload must NOT leak the old hard-coded "u-alice" ids.
    for (const r of payload.results) {
      expect(r.userId).toMatch(/^slot-\d$/);
    }

    const byUser = Object.fromEntries(
      payload.results.map((r) => [r.userId, r] as const),
    );

    // The DTO MatchPlayerResultItem is a thin shape; only check the
    // fields that are actually sent in the payload.
    expect(byUser["slot-0"]).toMatchObject({
      userId: "slot-0",
      score: 15,
      cardsBought: 11,
    });
    expect(byUser["slot-1"]).toMatchObject({
      userId: "slot-1",
      score: 14,
      cardsBought: 9,
    });
    expect(byUser["slot-2"]).toMatchObject({
      userId: "slot-2",
      score: 12,
      cardsBought: 8,
    });
    expect(byUser["slot-3"]).toMatchObject({
      userId: "slot-3",
      score: 13,
      cardsBought: 10,
    });
  });

  test("scenario buttons remount the modal with fresh stats", async ({
    page,
  }) => {
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });

    // R1 → slot-0 wins.
    await applyScenario(page, "scenario-r1");
    expect(await getWinnerId(page)).toBe("slot-0");

    // R2 → slot-1 wins. The modal must have remounted with new defaults.
    await applyScenario(page, "scenario-r2");
    expect(await getWinnerId(page)).toBe("slot-1");

    // Full tie → slot-0 wins again.
    await applyScenario(page, "scenario-tie");
    expect(await getWinnerId(page)).toBe("slot-0");
  });

  test("cancel — footer button opens reason dialog and POSTs to /cancel", async ({
    page,
  }) => {
    const { calls } = await installApiMock(page);
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });

    // Nút "Hủy ván đấu" phải có trong footer
    const cancelBtn = page.locator('[data-testid="cancel-match"]');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Dialog lý do hủy phải mở ra
    const dialog = page.locator('[data-testid="cancel-match-dialog"]');
    await expect(dialog).toBeVisible();
    await expect(page.locator('[data-testid="cancel-match-reason"]')).toBeVisible();

    // Nút xác nhận disabled khi lý do < 5 ký tự
    const confirmBtn = page.locator('[data-testid="confirm-cancel-match"]');
    await expect(confirmBtn).toBeDisabled();

    // Nhập lý do hợp lệ → enable → click
    await page
      .locator('[data-testid="cancel-match-reason"]')
      .fill("Bàn thiếu 1 VĐV, không tìm được người thay.");
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Verify API call
    expect(calls.cancel).toHaveLength(1);
    expect(calls.result).toHaveLength(0); // Không gọi result endpoint
    expect(calls.cancel[0].reason).toBe(
      "Bàn thiếu 1 VĐV, không tìm được người thay.",
    );

    // Modal đóng
    await expect(dialog).not.toBeVisible();
  });

  test("cancel — too-short reason keeps the confirm button disabled", async ({
    page,
  }) => {
    await gotoPreview(page);
    await setRoster(page, { p1: "Minh", p2: "Linh", p3: "Hùng", p4: "Trang" });

    await page.locator('[data-testid="cancel-match"]').click();
    const dialog = page.locator('[data-testid="cancel-match-dialog"]');
    await expect(dialog).toBeVisible();

    const reason = page.locator('[data-testid="cancel-match-reason"]');
    const confirmBtn = page.locator('[data-testid="confirm-cancel-match"]');

    await reason.fill("ngắn"); // 4 ký tự
    await expect(confirmBtn).toBeDisabled();

    // Backdrop click phải đóng dialog (không trong khi submitting)
    await page.locator('[data-testid="cancel-match-reason"]').blur();
    // Click outside dialog (backdrop) — bấm góc trên-trái
    await page.mouse.click(10, 10);
    await expect(dialog).not.toBeVisible();
  });
});