import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const BASE = process.env.DIAGNOSTIC_BASE_URL || 'http://127.0.0.1:8084';

async function seed(page, count) {
  await page.addInitScript((count) => {
    if (localStorage.getItem('printqa:seeded')) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 300);
    const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    localStorage.setItem('programme-buddy:programme-setup:v1', JSON.stringify({ siteName: 'Print QA', programmeStartDate: fmt(start), defaultProgrammeWeeks: 3, stageCount: 9, includeSaturday: false, includeSunday: false, workingWeek: '5 days - Monday to Friday' }));
    localStorage.setItem('programme-buddy:plot-templates:v1', JSON.stringify([{ id: 'printHouse', name: 'Print House', bedrooms: 3, floors: 2, isHouseType: true, programmeWeeks: 3, stageCount: 9, activities: [{ order: 1, code: 'Roof framing', trade: 'Carpenter', displayText: 'ROOF', durationDays: 2, relativeWeek: 1, relativeDay: 1, stage: 5 }, { order: 2, code: 'Windows', trade: 'Window Fitter', displayText: 'WINDOWS', durationDays: 2, relativeWeek: 1, relativeDay: 1, stage: 6 }] }]));
    localStorage.setItem('programme-buddy:plots:v1', JSON.stringify(Array.from({ length: count }, (_, i) => ({ id: `print-${i}`, plotNo: String(100 + i), buildOrder: i + 1, templateId: 'printHouse', houseTypeId: 'printHouse', constructionMethod: 'traditional', plotCompletionDate: fmt(end), stage9CompleteWeek: 43 }))));
    localStorage.setItem('programme-buddy:activity-moves:v1', '[]');
    localStorage.setItem('printqa:seeded', '1');
  }, count);
}

async function preview(page, size) {
  await page.getByRole('radio', { name: `${size} landscape` }).click();
  const next = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Print all live pages' }).click();
  const popup = await next;
  await popup.waitForLoadState('domcontentloaded');
  return popup;
}

for (const paper of ['A3', 'A4']) {
  test(`Master ${paper}: 61 plots, all date sections, 30-row limit and physical PDF pages`, async ({ page }) => {
    await seed(page, 61);
    await page.goto(BASE + '/master');
    await expect(page.getByText(/61 plots · 6 pages/)).toBeVisible();
    const popup = await preview(page, paper);
    await expect(popup.locator('.sheet')).toHaveCount(6);
    const counts = await popup.locator('tbody').evaluateAll((nodes) => nodes.map((n) => n.rows.length));
    expect(counts).toEqual([30, 30, 30, 30, 1, 1]);
    await expect(popup.locator('th').filter({ hasText: /^(Beds|Bedrooms|Storeys|Hold|Action)$/ })).toHaveCount(0);
    for (let i = 0; i < 6; i++) {
      await expect(popup.locator('.sheet').nth(i)).toContainText(`Page ${i + 1} of 6`);
    }
    await popup.emulateMedia({ media: 'print' });
    const heights = await popup.locator('.sheet').evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().height));
    const maxHeight = ((paper === 'A4' ? 210 : 297) - 16) * 96 / 25.4;
    expect(Math.max(...heights)).toBeLessThan(maxHeight);
    fs.mkdirSync('diagnostics', { recursive: true });
    const pdf = await popup.pdf({ preferCSSPageSize: true, printBackground: true, path: `diagnostics/master-${paper}.pdf` });
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length).toBe(6);
    await popup.screenshot({ path: `diagnostics/master-${paper}.png`, fullPage: false });
  });
}

test('Master stage cells and printout move with live progress across date sections', async ({ page }) => {
  await seed(page, 1);
  await page.goto(BASE + '/master');
  await expect(page.getByText(/1 plots · 2 pages/)).toBeVisible();
  const before = await preview(page, 'A3');
  const stageCells = (popup) => popup.locator('tbody tr').evaluateAll((rows) => rows.flatMap((r) => [...r.cells].slice(6).map((c) => c.textContent)));
  const original = await stageCells(before);
  const first = original.findIndex((s) => s.includes('5'));
  expect(first).toBeGreaterThanOrEqual(0);
  await before.close();
  await page.evaluate(() => localStorage.setItem('programme-buddy:activity-moves:v1', JSON.stringify([{ plotId: 'print-0', activityCode: 'Roof framing', deltaDays: 10 }])));
  await page.reload();
  await expect(page.getByText(/1 plots · 2 pages/)).toBeVisible();
  const after = await preview(page, 'A3');
  const moved = await stageCells(after);
  expect(moved.findIndex((s) => s.includes('5'))).toBe(first + 2);
});

test('Final-stage controls extend one week, persist and restore without moving earlier stages', async ({ page }) => {
  await seed(page, 1);
  await page.goto(BASE + '/master');
  const extend = page.getByRole('button', { name: 'Extend final stage by one week for Plot 100' });
  const shorten = page.getByRole('button', { name: 'Shorten final stage by one week for Plot 100' });
  await expect(extend).toBeEnabled();
  await expect(shorten).toBeDisabled();
  const before = await preview(page, 'A3');
  const cells = (popup) => popup.locator('tbody tr').evaluateAll((rows) => rows.flatMap((r) => [...r.cells].slice(6).map((c) => c.textContent)));
  const original = await cells(before);
  await before.close();
  const controlPosition = () => extend.evaluate((element) => element.getBoundingClientRect().left - element.parentElement.parentElement.getBoundingClientRect().left);
  const position = await controlPosition();
  await extend.click();
  await expect(page.getByText('Plot 100: final stage extended by one working week.')).toBeVisible();
  expect(await controlPosition() - position).toBeCloseTo(92, 0);
  await page.reload();
  await expect(shorten).toBeEnabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:plots:v1'))[0].finalStageAdjustmentWeeks)).toBe(1);
  const after = await preview(page, 'A3');
  const revised = await cells(after);
  expect(revised.findIndex((value) => value.includes('5'))).toBe(original.findIndex((value) => value.includes('5')));
  expect(revised.filter((value) => value.includes('6')).length).toBe(original.filter((value) => value.includes('6')).length + 1);
  await expect(after.getByRole('button', { name: /final stage/ })).toHaveCount(0);
  await after.close();
  await shorten.click();
  await expect(page.getByText('Plot 100: final stage shortened by one working week.')).toBeVisible();
  await expect(shorten).toBeDisabled();
  const restored = await preview(page, 'A3');
  expect(await cells(restored)).toEqual(original);
});
