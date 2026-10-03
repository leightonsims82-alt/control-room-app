import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.DIAGNOSTIC_BASE_URL || 'http://127.0.0.1:8084';
const routes = ['/', '/two-week', '/master', '/trades', '/issue', '/qa', '/exports', '/site/setup'];
const inventory = [];

function watchRuntimeErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

async function goto(page, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(800);
  await expect(page.locator('body')).not.toContainText('Uncaught Error');
}

test.afterAll(async () => {
  fs.mkdirSync('diagnostics', { recursive: true });
  fs.writeFileSync('diagnostics/browser-button-inventory.json', JSON.stringify(inventory, null, 2));
});

for (const route of routes) {
  test(`route smoke: ${route}`, async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await goto(page, route);
    await expect(page.locator('body')).toBeVisible();
    expect(errors, `Runtime errors on ${route}`).toEqual([]);
  });

  test(`button inventory and safe click audit: ${route}`, async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await goto(page, route);
    const buttons = page.locator('button, [role="button"]');
    const count = Math.min(await buttons.count(), 40);
    const routeInventory = { route, totalVisibleCandidates: count, buttons: [] };
    const destructive = /delete|remove|clear|reset|confirm|trash|sign out|logout|post|send|sync|upload|download|export|camera|photo|attach/i;

    for (let i = 0; i < count; i += 1) {
      await goto(page, route);
      const currentButtons = page.locator('button, [role="button"]');
      if (i >= await currentButtons.count()) break;
      const button = currentButtons.nth(i);
      if (!(await button.isVisible().catch(() => false))) continue;
      const name = ((await button.innerText().catch(() => '')) || (await button.getAttribute('aria-label')) || '').trim();
      const disabled = await button.isDisabled().catch(() => false);
      const entry = { index: i, name, disabled, skipped: false, inert: null, error: null };
      if (disabled || destructive.test(name)) {
        entry.skipped = true;
        routeInventory.buttons.push(entry);
        continue;
      }

      const beforeUrl = page.url();
      const beforeText = await page.locator('body').innerText();
      try {
        await button.click({ timeout: 3000 });
        await page.waitForTimeout(250);
        const afterUrl = page.url();
        const afterText = await page.locator('body').innerText();
        entry.inert = beforeUrl === afterUrl && beforeText === afterText;
      } catch (error) {
        entry.error = String(error);
      }
      routeInventory.buttons.push(entry);
    }

    inventory.push(routeInventory);
    expect(errors, `Runtime errors while clicking safe buttons on ${route}`).toEqual([]);
  });
}

test('site setup: number fields must not turn into 1 while typing', async ({ page }) => {
  await goto(page, '/site/setup');
  const numericInputs = page.locator('input[inputmode="numeric"], input[inputmode="decimal"], input[type="number"]');
  const count = await numericInputs.count();
  expect(count, 'Expected numeric inputs on Programme setup').toBeGreaterThan(0);

  // Test each visible stage-week numeric field. A controlled field must be allowed to become
  // temporarily empty while the user edits it; coercion belongs on blur/save, not each keystroke.
  for (let i = 0; i < Math.min(count, 20); i += 1) {
    const input = numericInputs.nth(i);
    if (!(await input.isVisible().catch(() => false))) continue;
    const original = await input.inputValue();
    await input.focus();
    await input.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await input.press('Backspace');
    await page.waitForTimeout(100);
    expect(await input.inputValue(), `Numeric field ${i} forced a value while being cleared`).toBe('');
    await input.type('2');
    await page.waitForTimeout(100);
    expect(await input.inputValue(), `Numeric field ${i} did not retain typed value 2`).toBe('2');
    // Restore without blurring into an accidental save.
    await input.fill(original);
  }
});

test('site setup: template edit buttons change mode correctly', async ({ page }) => {
  await goto(page, '/site/setup');
  const fourBed = page.getByText('4 Bedroom', { exact: true });
  if (await fourBed.count()) {
    await fourBed.first().click();
    const edit = page.getByText('Edit Template', { exact: true });
    await expect(edit).toBeVisible();
    await edit.click();
    await expect(page.getByText('Save Template', { exact: true })).toBeVisible();
    await expect(page.getByText('Cancel', { exact: true })).toBeVisible();
    await page.getByText('Cancel', { exact: true }).click();
    await expect(page.getByText('Edit Template', { exact: true })).toBeVisible();
  }
});

test('site setup: locked 3 Bedroom standard is visibly protected', async ({ page }) => {
  await goto(page, '/site/setup');
  const threeBed = page.getByText('3 Bedroom', { exact: true });
  if (await threeBed.count()) await threeBed.first().click();
  await expect(page.getByText(/Standard 3 Bedroom.*locked/i)).toBeVisible();
  await expect(page.getByText('Edit Template', { exact: true })).toHaveCount(0);
});

test('site setup: Save Site Settings gives visible confirmation', async ({ page }) => {
  await goto(page, '/site/setup');
  const save = page.getByText('Save Site Settings', { exact: true });
  await expect(save).toBeVisible();
  await save.click();
  await expect(page.getByText(/Site programme settings saved/i)).toBeVisible({ timeout: 10000 });
});

test('master: Manage plots button opens and closes its modal', async ({ page }) => {
  await goto(page, '/master');
  const manage = page.getByText('Manage plots', { exact: true });
  await expect(manage).toBeVisible();
  await manage.click();
  await expect(page.getByText('Manage plots', { exact: true }).last()).toBeVisible();
  const close = page.getByText('×', { exact: true });
  if (await close.count()) {
    await close.last().click();
    await page.waitForTimeout(200);
  } else {
    await page.keyboard.press('Escape');
  }
});

test('main navigation reaches key programme screens', async ({ page }) => {
  await goto(page, '/');
  const targets = [
    ['2 Week', '/two-week'],
    ['Master', '/master'],
    ['Trades', '/trades'],
    ['Issue', '/issue'],
    ['QA', '/qa'],
    ['Exports', '/exports']
  ];
  for (const [label, path] of targets) {
    await goto(page, '/');
    const control = page.getByText(label, { exact: true });
    if (!(await control.count())) continue;
    await control.last().click();
    await page.waitForTimeout(250);
    expect(new URL(page.url()).pathname, `${label} did not navigate to ${path}`).toBe(path);
  }
});
