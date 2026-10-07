import { test, expect } from '@playwright/test';

const BASE = process.env.DIAGNOSTIC_BASE_URL || 'http://127.0.0.1:8084';

function gb(date) {
  return String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0') + '/' + date.getFullYear();
}

function mondayThisWeek() {
  const now = new Date();
  const day = now.getDay() || 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1));
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

async function open(page, route) {
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(700);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Uncaught Error');
  expect(runtimeErrors, `Runtime errors on ${route}`).toEqual([]);
}

test('all Programme V2 core routes render without a runtime failure', async ({ page }) => {
  for (const route of ['/', '/master', '/two-week', '/trades', '/issue', '/qa', '/exports', '/plots', '/site/setup', '/handover', '/walk', '/dabs', '/cloud']) {
    await open(page, route);
  }
});

test('legacy house type is migrated once to the canonical activity-stage truth and fully backed up', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('programme-buddy:plot-templates:v1', JSON.stringify([{
      id: 'house-warrley-test',
      name: 'Warrley Test',
      houseTypeCode: 'Warrley Test',
      bedrooms: 4,
      floors: 2,
      isHouseType: true,
      isSystemTemplate: false,
      description: 'migration test',
      programmeWeeks: 25,
      stageCount: 9,
      activities: [
        { order: 1, code: 'Foundations', trade: 'Wrong', displayText: 'Foundations', durationDays: 5, stage: 9 },
        { order: 2, code: '2nd fix carpentry', trade: 'Wrong', displayText: '2nd Fix Carp', durationDays: 3, stage: 2 },
        { order: 3, code: 'Mastic', trade: 'Wrong', displayText: 'Mastic', durationDays: 1, stage: 1 },
      ],
    }]));
    localStorage.removeItem('programme-buddy:v2-migration:2026-10-07');
    localStorage.removeItem('programme-buddy:v2-legacy-snapshot:2026-10-07');
  });

  await open(page, '/site/setup');
  await expect(page.getByText('Warrley Test', { exact: true }).first()).toBeVisible();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:plot-templates:v1') || '[]'));
  const template = saved.find((item) => item.id === 'house-warrley-test');
  expect(template.activities.find((item) => item.code === 'Foundations').stage).toBe(1);
  expect(template.activities.find((item) => item.code === 'Foundations').trade).toBe('Groundworker');
  expect(template.activities.find((item) => item.code === '2nd fix carpentry').stage).toBe(7);
  expect(template.activities.find((item) => item.code === '2nd fix carpentry').trade).toBe('Carpenter');
  expect(template.activities.find((item) => item.code === 'Mastic').stage).toBe(9);

  expect(await page.evaluate(() => localStorage.getItem('programme-buddy:v2-migration:2026-10-07'))).toBe('done');
  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:v2-legacy-snapshot:2026-10-07') || '{}'));
  expect(snapshot.rawStorage['programme-buddy:plot-templates:v1']).toContain('"stage":9');
});

test('house type save persists duration changes without changing canonical stage ownership', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('programme-buddy:v2-migration:2026-10-07', 'done');
    localStorage.setItem('programme-buddy:plot-templates:v1', JSON.stringify([{
      id: 'house-save-test',
      name: 'Save Test',
      houseTypeCode: 'Save Test',
      bedrooms: 4,
      floors: 2,
      isHouseType: true,
      isSystemTemplate: false,
      description: 'save test',
      programmeWeeks: 25,
      stageCount: 9,
      activities: [
        { order: 1, code: '2nd fix carpentry', trade: 'Carpenter', displayText: '2nd Fix Carp', durationDays: 3, stage: 7 },
      ],
    }]));
  });

  await open(page, '/site/setup');
  await page.getByText('Save Test', { exact: true }).first().click();
  await page.getByText('Edit House Type', { exact: true }).click();

  const activity = page.getByText('2nd fix carpentry', { exact: true }).first();
  const row = activity.locator('xpath=..');
  await expect(row).toContainText('7');
  const duration = row.locator('input').last();
  await duration.fill('4');
  await duration.blur();

  await page.getByText('Save House Type', { exact: true }).last().click();
  await expect(page.getByText(/saved successfully/i)).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:plot-templates:v1') || '[]'));
  const activitySaved = saved.find((item) => item.id === 'house-save-test').activities.find((item) => item.code === '2nd fix carpentry');
  expect(activitySaved.durationDays).toBe(4);
  expect(activitySaved.stage).toBe(7);
  expect(activitySaved.trade).toBe('Carpenter');
});

test('three-storey house type keeps the extra structure activities in Stage 3', async ({ page }) => {
  await open(page, '/site/setup');
  const name = page.getByPlaceholder('e.g. Warrley or Linngate');
  await name.fill('V2 Three Storey QA');

  const bedrooms = page.getByText('Bedrooms', { exact: true }).first().locator('xpath=..');
  await bedrooms.getByText('4', { exact: true }).click();
  const storeys = page.getByText('Storeys', { exact: true }).first().locator('xpath=..');
  await storeys.getByText('3', { exact: true }).click();
  await page.getByText('Save New House Type', { exact: true }).click();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:plot-templates:v1') || '[]'));
  const template = saved.find((item) => item.name === 'V2 Three Storey QA');
  expect(template).toBeTruthy();
  expect(template.activities.find((item) => item.code === '2nd Floor Joist')?.stage).toBe(3);
  const extraBrickwork = template.activities.find((item) => /4th lift brickwork|5th lift brickwork/i.test(item.code));
  const extraScaffold = template.activities.find((item) => /4th lift scaffold|5th lift scaffold/i.test(item.code));
  expect(extraBrickwork?.stage).toBe(3);
  expect(extraScaffold?.stage).toBe(3);
});

test('Master uses week-ending dates and the lowest stage when a week is shared', async ({ page }) => {
  const monday = mondayThisWeek();
  const friday = addDays(monday, 4);
  const completion = addDays(monday, 4);

  await page.addInitScript(({ start, finish }) => {
    localStorage.setItem('programme-buddy:v2-migration:2026-10-07', 'done');
    localStorage.setItem('programme-buddy:programme-setup:v1', JSON.stringify({
      siteName: 'V2 Master QA',
      defaultProgrammeWeeks: 1,
      stageCount: 9,
      workingWeek: '5 days - Monday to Friday',
      includeSaturday: false,
      includeSunday: false,
      programmeStartDate: start,
    }));
    localStorage.setItem('programme-buddy:plot-templates:v1', JSON.stringify([{
      id: 'house-master-v2',
      name: 'Master V2 House',
      houseTypeCode: 'Master V2 House',
      bedrooms: 3,
      floors: 2,
      isHouseType: true,
      isSystemTemplate: false,
      description: 'shared week',
      programmeWeeks: 1,
      stageCount: 9,
      activities: [
        { order: 1, code: '1st Fix Carp', trade: 'Carpenter', displayText: '1st Fix Carp', durationDays: 3, stage: 6 },
        { order: 2, code: '2nd fix carpentry', trade: 'Carpenter', displayText: '2nd Fix Carp', durationDays: 2, stage: 7 },
      ],
    }]));
    localStorage.setItem('programme-buddy:plots:v1', JSON.stringify([{
      id: 'plot-master-v2',
      plotNo: '900',
      buildOrder: 1,
      stage9CompleteWeek: 1,
      plotStartDate: start,
      plotCompletionDate: finish,
      templateId: 'house-master-v2',
      houseTypeId: 'house-master-v2',
      constructionMethod: 'traditional',
    }]));
    localStorage.setItem('programme-buddy:activity-moves:v1', '[]');
    localStorage.setItem('programme-buddy:delays:v1', '[]');
  }, { start: gb(monday), finish: gb(completion) });

  await open(page, '/master');
  await expect(page.getByText(gb(friday), { exact: true }).first()).toBeVisible();

  const plotCell = page.getByText('900', { exact: true }).first();
  const row = plotCell.locator('xpath=..');
  const text = await row.innerText();
  expect(text).toContain('6');
  expect(text).not.toContain('6/7');
});

test('V2 plot, trade, supervisor and QA routes share the same seeded plot', async ({ page }) => {
  const monday = mondayThisWeek();
  const finish = addDays(monday, 20);
  await page.addInitScript(({ start, finish }) => {
    localStorage.setItem('programme-buddy:v2-migration:2026-10-07', 'done');
    localStorage.setItem('programme-buddy:programme-setup:v1', JSON.stringify({
      siteName: 'Cross View QA', defaultProgrammeWeeks: 5, stageCount: 9,
      workingWeek: '5 days - Monday to Friday', includeSaturday: false, includeSunday: false,
      programmeStartDate: start,
    }));
    localStorage.setItem('programme-buddy:plot-templates:v1', JSON.stringify([{
      id: 'cross-house', name: 'Cross House', houseTypeCode: 'Cross House',
      bedrooms: 3, floors: 2, isHouseType: true, isSystemTemplate: false,
      description: 'cross view', programmeWeeks: 5, stageCount: 9,
      activities: [
        { order: 1, code: 'Truss', trade: 'Carpenter', displayText: 'Truss', durationDays: 2, stage: 4 },
        { order: 2, code: 'Windows', trade: 'Window Fitter', displayText: 'Windows', durationDays: 1, stage: 6 },
        { order: 3, code: '2nd fix carpentry', trade: 'Carpenter', displayText: '2nd Fix Carp', durationDays: 3, stage: 7 },
      ],
    }]));
    localStorage.setItem('programme-buddy:plots:v1', JSON.stringify([{
      id: 'cross-901', plotNo: '901', buildOrder: 1, stage9CompleteWeek: 4,
      plotStartDate: start, plotCompletionDate: finish,
      templateId: 'cross-house', houseTypeId: 'cross-house', constructionMethod: 'traditional',
    }]));
    localStorage.setItem('programme-buddy:activity-moves:v1', '[]');
    localStorage.setItem('programme-buddy:delays:v1', '[]');
  }, { start: gb(monday), finish: gb(finish) });

  for (const route of ['/plots', '/master', '/two-week', '/trades', '/supervisor?trade=Carpenter', '/qa']) {
    await open(page, route);
    await expect(page.locator('body')).toContainText('901');
  }
});
