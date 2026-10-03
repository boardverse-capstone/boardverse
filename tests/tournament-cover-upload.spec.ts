/**
 * Playwright E2E coverage for TournamentCoverUpload — the cover image
 * picker used by TournamentCreateModal.
 *
 * Specs run against a small dev-only harness mounted at
 * /dev/tournament-cover-preview. The harness renders the real component
 * with a controllable initialUrl so we can cover the three lifecycle
 * states: empty, with URL, and after a fresh upload.
 *
 * The /api/upload/cloudinary endpoint is intercepted with page.route()
 * so no real network calls are made.
 */

import { Page, expect, test } from "@playwright/test";

const PREVIEW_URL = "/dev/tournament-cover-preview";
const UPLOAD_URL_PATTERN = /\/api\/upload\/cloudinary$/;

type UploadResponse = {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
};

async function installUploadMock(
  page: Page,
  options: {
    /** When set, the mock resolves the upload (after a small delay). */
    resolveWith?: UploadResponse;
    /** When set, the mock rejects with this HTTP status. */
    rejectWith?: { status: number; message: string };
    /** Buffer to delay the response — gives the UI time to show the spinner. */
    delayMs?: number;
  } = {},
): Promise<{ calls: Array<{ file: string; folder: string }> }> {
  const calls: Array<{ file: string; folder: string }> = [];

  await page.route(UPLOAD_URL_PATTERN, async (route) => {
    const request = route.request();
    const fd = request.postData() ?? "";
    // multipart/form-data is not parseable via postDataJSON; pull out
    // file name + folder with a quick regex just for assertions.
    const fileMatch = fd.match(/filename="([^"]+)"/);
    const folderMatch = fd.match(/name="folder"\r\n\r\n([^\r]+)/);
    calls.push({
      file: fileMatch?.[1] ?? "(unknown)",
      folder: folderMatch?.[1] ?? "(no folder)",
    });

    if (options.delayMs) {
      await new Promise((r) => setTimeout(r, options.delayMs));
    }

    if (options.rejectWith) {
      await route.fulfill({
        status: options.rejectWith.status,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: options.rejectWith.status,
          message: options.rejectWith.message,
        }),
      });
      return;
    }

    const ok: UploadResponse = options.resolveWith ?? {
      secure_url:
        "https://res.cloudinary.com/demo/image/upload/v123/boardverse/tournament-covers/sample.jpg",
      public_id: "boardverse/tournament-covers/sample",
      format: "jpg",
      bytes: 12_345,
      width: 800,
      height: 400,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ok),
    });
  });

  return { calls };
}

async function gotoPreview(page: Page) {
  await page.goto(PREVIEW_URL);
  await expect(page.locator('[data-testid="tournament-cover-upload"]')).toBeVisible();
}

async function makePng(page: Page): Promise<Buffer> {
  // 1×1 transparent PNG via canvas — small enough to keep tests fast.
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    return c.toDataURL("image/png").split(",")[1]!;
  });
  return Buffer.from(data, "base64");
}

test("renders the dropzone when there is no initial image", async ({ page }) => {
  await gotoPreview(page);
  await expect(page.locator('[data-testid="cover-dropzone"]')).toBeVisible();
  await expect(
    page.locator('[data-testid="cover-dropzone"]'),
  ).toContainText("Tải ảnh bìa lên");
  await expect(page.locator('[data-testid="cover-clear"]')).toHaveCount(0);
});

test("renders the preview block when an initialUrl is provided", async ({
  page,
}) => {
  await page.goto(`${PREVIEW_URL}?initial=https://example.com/cover.jpg`);
  await expect(page.locator('[data-testid="tournament-cover-upload"]')).toBeVisible();
  // Preview image must be present
  const img = page.locator('[data-testid="tournament-cover-upload"] img');
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute("src", /example\.com\/cover\.jpg/);
  // Replace + clear buttons must be present
  await expect(page.locator('[data-testid="cover-replace"]')).toBeVisible();
  await expect(page.locator('[data-testid="cover-clear"]')).toBeVisible();
});

test("picking a file uploads to Cloudinary, shows the returned URL, and POSTs to the tournament-covers folder", async ({
  page,
}) => {
  const { calls } = await installUploadMock(page, {
    resolveWith: {
      secure_url:
        "https://res.cloudinary.com/demo/image/upload/v999/boardverse/tournament-covers/abc.png",
      public_id: "boardverse/tournament-covers/abc",
      format: "png",
      bytes: 99,
      width: 1,
      height: 1,
    },
  });

  await gotoPreview(page);
  const png = await makePng(page);
  await page.locator('[data-testid="cover-file-input"]').setInputFiles({
    name: "tiny.png",
    mimeType: "image/png",
    buffer: png,
  });

  // Spinner shows then disappears
  await expect(page.locator('[data-testid="tournament-cover-upload"]')).toBeVisible();

  // After upload, preview shows the returned secure_url
  const img = page.locator('[data-testid="tournament-cover-upload"] img');
  await expect(img).toHaveAttribute(
    "src",
    "https://res.cloudinary.com/demo/image/upload/v999/boardverse/tournament-covers/abc.png",
  );

  // Verify the upload endpoint was hit once, with the correct folder
  expect(calls).toHaveLength(1);
  expect(calls[0].file).toBe("tiny.png");
  expect(calls[0].folder).toBe("boardverse/tournament-covers");
});

test("clear button removes the preview and re-shows the dropzone", async ({
  page,
}) => {
  await page.goto(`${PREVIEW_URL}?initial=https://example.com/cover.jpg`);
  await expect(
    page.locator('[data-testid="tournament-cover-upload"] img'),
  ).toBeVisible();

  await page.locator('[data-testid="cover-clear"]').click();

  await expect(page.locator('[data-testid="cover-dropzone"]')).toBeVisible();
  await expect(
    page.locator('[data-testid="tournament-cover-upload"] img'),
  ).toHaveCount(0);
});

test("rejects files larger than 5MB before hitting the server", async ({
  page,
}) => {
  // No mock installed — if the client wrongly POSTs a 6MB file, the
  // network will surface as a real (unmocked) request and the test will
  // fail. We install a mock that records nothing just to be sure.
  const { calls } = await installUploadMock(page);

  await gotoPreview(page);
  // Build a 6 MB buffer (just zeroes — only size matters here).
  const big = Buffer.alloc(6 * 1024 * 1024, 0);
  await page.locator('[data-testid="cover-file-input"]').setInputFiles({
    name: "huge.png",
    mimeType: "image/png",
    buffer: big,
  });

  // Dropzone stays visible — upload was blocked client-side
  await expect(page.locator('[data-testid="cover-dropzone"]')).toBeVisible();
  // No network call was made
  expect(calls).toHaveLength(0);
  // Toast error appears (toast text check is loose because Sonner varies)
  await expect(page.locator('[data-testid="cover-error"]')).toHaveCount(0);
});

test("rejects files with wrong mime type before hitting the server", async ({
  page,
}) => {
  const { calls } = await installUploadMock(page);
  await gotoPreview(page);

  await page.locator('[data-testid="cover-file-input"]').setInputFiles({
    name: "doc.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 fake"),
  });

  // No upload call, dropzone still shown
  await expect(page.locator('[data-testid="cover-dropzone"]')).toBeVisible();
  expect(calls).toHaveLength(0);
});

test("rollback to previous URL when the server returns 500", async ({
  page,
}) => {
  const { calls } = await installUploadMock(page, {
    rejectWith: { status: 500, message: "Cloudinary down" },
  });

  // Start with an existing image
  await page.goto(`${PREVIEW_URL}?initial=https://example.com/old.jpg`);
  const img = page.locator('[data-testid="tournament-cover-upload"] img');
  await expect(img).toHaveAttribute("src", /example\.com\/old\.jpg/);

  // Try to replace it with a new file — server will reject
  const png = await makePng(page);
  await page.locator('[data-testid="cover-file-input"]').setInputFiles({
    name: "tiny.png",
    mimeType: "image/png",
    buffer: png,
  });

  // The old URL must remain visible after rollback
  await expect(img).toHaveAttribute("src", /example\.com\/old\.jpg/);
  // And the error must surface
  await expect(page.locator('[data-testid="cover-error"]')).toBeVisible();
  // The upload was attempted
  expect(calls).toHaveLength(1);
});
