import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('AskGuru E2E RAG Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('(c) upload an invalid file, expect an error message', async ({ page }) => {
    // Open sidebar on mobile if needed
    const mobileMenu = page.getByRole('button', { name: /toggle sidebar/i });
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
    }

    // Attempt to upload an invalid file type (.json or .exe or unsupported)
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('text=Drop PDF or TXT here').click();
    const fileChooser = await fileChooserPromise;

    // Point to package.json (invalid extension)
    const invalidFilePath = path.join(__dirname, '../package.json');
    await fileChooser.setFiles(invalidFilePath);

    // Expect friendly error message in upload zone
    await expect(page.locator('text=Upload Failed')).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('text=Only PDF and TXT documents are supported.')
    ).toBeVisible({ timeout: 5000 });
  });

  test('(a) explore document, ask grounded question, expect verifiable citation chip', async ({
    page,
  }) => {
    // Select sample document
    await page.getByText('Q3 Financial Performance Report').first().click();

    // Verify document header shows up
    await expect(page.locator('text=Q3 Financial Performance Report')).toBeVisible();

    // Ask a grounded question
    const input = page.getByPlaceholder(/Ask anything about/i);
    await input.fill('What was the total ARR growth rate in Q3?');
    await page.keyboard.press('Enter');

    // Wait for the assistant response to appear
    await expect(page.locator('text=AskGuru').last()).toBeVisible({ timeout: 15000 });

    // Expect citation chip (e.g. Page 3, Page 5, Page 7 or similar)
    const citationChip = page.locator('button:has-text("Page")').last();
    await expect(citationChip).toBeVisible({ timeout: 15000 });

    // Click citation chip to inspect source drawer
    await citationChip.click();

    // Verify Source Passage drawer opens with exact text
    await expect(page.locator('text=Source Passage')).toBeVisible();
    await expect(page.locator('text=Verifiable document ground truth')).toBeVisible();
  });

  test('(b) ask an off-topic question, expect fallback message', async ({ page }) => {
    // Select document
    await page.getByText('Q3 Financial Performance Report').first().click();

    // Ask completely unrelated question not present in financial report
    const input = page.getByPlaceholder(/Ask anything about/i);
    await input.fill('Who won the 1994 FIFA World Cup soccer tournament in the USA?');
    await page.keyboard.press('Enter');

    // Expect the strict fallback message from system prompt
    await expect(
      page.locator('text="I couldn\'t find that in your documents."').or(
        page.locator('text=I couldn\'t find that in your documents.')
      )
    ).toBeVisible({ timeout: 15000 });
  });
});
