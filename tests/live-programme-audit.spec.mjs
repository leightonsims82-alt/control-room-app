import { test, expect } from '@playwright/test';

const BASE = process.env.DIAGNOSTIC_BASE_URL || 'http://127.0.0.1:8084';

const setup = {
  siteName: 'Live Programme QA',
  defaultProgrammeWeeks: 1,
  stageCount: 9,
  workingWeek: '5 days - Monday to Friday',
  includeSaturday: false,
  includeSunday: false,
  programmeStartDate: '05/01/2026',
};

const liveTemplate = {
  id: 'live-audit-house',
  name: 'Live Audit House',
  houseTypeCode: 'Live Audit House',
  bedrooms: 3,
  floors: 2,
  isHouseType: true,
  isSystemTemplate: false,
  description: 'Live programme audit fixture',
  programmeWeeks: 1,
  stageCount: 9,
  activities: [
    { order: 1, code: 'Activity A', trade: 'Carpenter', displayText: 'Activity A', durationDays: 1, relativeWeek: 1, relativeDay: 1, stage: 9 },
    { order: 2, code: 'Activity B', trade: 'Plumber', displayText: 'Activity B', durationDays: 1, relativeWeek: 1, relativeDay: 2, stage: 9 },
    { order: 3, code: 'Activity C', trade: 'Electrician', displayText: 'Activity C', durationDays: 1, relativeWeek: 1, relativeDay: 3, stage: 9 },
  ],
};

const plots = [
  {
    id: 'live-plot-153',
    plotNo: '153',
    buildOrder: 1,
    stage9CompleteWeek: 40,
    plotCompletionDate: '09/10/2026',
    templateId: liveTemplate.id,
    houseTypeId: liveTemplate.id,
    constructionMethod: 'traditional',
  },
  {
    id: 'live-plot-154',
    plotNo: '154',
    buildOrder: 2,
    stage9CompleteWeek: 40,
    plotCompletionDate: '09/10/2026',
    templateId: liveTemplate.id,
    houseTypeId: liveTemplate.id,
    constructionMethod: 'traditional',
  },
];

async function seed(page, extra = {}) {
  await page.addInitScript(({ setup, liveTemplate, plots, extra }) => {
    localStorage.setItem('programme-buddy:programme-setup:v1', JSON.stringify(setup));
    localStorage.setItem('programme-buddy:house-types-reset:v2', 'done');
    localStorage.setItem('programme-buddy:plot-templates:v1', JSON.stringify([liveTemplate]));
    localStorage.setItem('programme-buddy:plots:v1', JSON.stringify(plots));
    localStorage.setItem('programme-buddy:activity-moves:v1', JSON.stringify(extra.moves || []));
    localStorage.setItem('programme-buddy:delays:v1', JSON.stringify(extra.delays || []));
    localStorage.setItem('programme-buddy:programme-notes:v1', JSON.stringify([]));
    localStorage.setItem('programme-buddy:stage-configuration:v1', JSON.stringify([
      { stage: 1, label: 'Foundations', startWeek: 1, finishWeek: 1 },
      { stage: 2, label: 'Slab / oversite', startWeek: 1, finishWeek: 1 },
      { stage: 3, label: 'Superstructure', startWeek: 1, finishWeek: 1 },
      { stage: 4, label: 'Roof covering', startWeek: 1, finishWeek: 1 },
      { stage: 5, label: 'Pre-plaster', startWeek: 1, finishWeek: 1 },
      { stage: 6, label: 'Drylinings', startWeek: 1, finishWeek: 1 },
      { stage: 7, label: '2nd fix', startWeek: 1, finishWeek: 1 },
      { stage: 8, label: 'Patching', startWeek: 1, finishWeek: 1 },
      { stage: 9, label: 'Finals', startWeek: 1, finishWeek: 1 },
    ]));
    localStorage.setItem('programme-buddy:existing-plots-cleared:2026-10-01-v1', new Date().toISOString());
  }, { setup, liveTemplate, plots, extra });
}

async function goto(page, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(900);
  await expect(page.locator('body')).not.toContainText('Uncaught Error');
}

async function xOf(locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box.x;
}

test('live programme: right arrow moves selected fix and downstream work later without changing another plot', async ({ page }) => {
  await seed(page);
  await goto(page, '/two-week');

  const row153 = page.getByText('153', { exact: true }).locator('xpath=..');
  const row154 = page.getByText('154', { exact: true }).locator('xpath=..');
  const a153 = row153.getByText('ACTIVITY A', { exact: true });
  const a154 = row154.getByText('ACTIVITY A', { exact: true });
  const before153 = await xOf(a153);
  const before154 = await xOf(a154);
  expect(Math.abs(before153 - before154)).toBeLessThan(3);

  await page.getByRole('button', { name: 'Move Activity A and following work later 1 working day' }).first().click();
  await page.waitForTimeout(250);

  const after153 = await xOf(row153.getByText('ACTIVITY A', { exact: true }));
  const after154 = await xOf(row154.getByText('ACTIVITY A', { exact: true }));
  expect(after153).toBeGreaterThan(before153 + 50);
  expect(Math.abs(after154 - before154)).toBeLessThan(3);

  const moves = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:activity-moves:v1') || '[]'));
  expect(moves).toEqual(expect.arrayContaining([
    expect.objectContaining({ plotId: 'live-plot-153', activityCode: 'Activity A', deltaDays: 1 }),
  ]));
});

test('live programme: multi-day controls accumulate and persist after reload', async ({ page }) => {
  await seed(page);
  await goto(page, '/two-week');

  await page.getByRole('button', { name: 'Move Activity A and following work later 5 working days' }).first().click();
  await page.getByRole('button', { name: 'Move Activity A and following work later 1 working day' }).first().click();

  let moves = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:activity-moves:v1') || '[]'));
  expect(moves.find((move) => move.plotId === 'live-plot-153' && move.activityCode === 'Activity A')?.deltaDays).toBe(6);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  moves = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:activity-moves:v1') || '[]'));
  expect(moves.find((move) => move.plotId === 'live-plot-153' && move.activityCode === 'Activity A')?.deltaDays).toBe(6);

  await page.getByRole('button', { name: 'Move Activity A and following work earlier 5 working days' }).first().click();
  moves = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:activity-moves:v1') || '[]'));
  expect(moves.find((move) => move.plotId === 'live-plot-153' && move.activityCode === 'Activity A')?.deltaDays).toBe(1);
});

test('actual progress: anchoring a real site activity moves all downstream work and reset restores planned programme', async ({ page }) => {
  await seed(page);
  await goto(page, '/two-week');

  const row153 = page.getByText('153', { exact: true }).locator('xpath=..');
  const beforeA = await xOf(row153.getByText('ACTIVITY A', { exact: true }));
  const beforeB = await xOf(row153.getByText('ACTIVITY B', { exact: true }));

  await page.getByRole('button', { name: 'Select Plot 153 actual progress' }).click();
  await page.getByRole('button', { name: 'Select actual activity Activity A' }).click();

  const dateButton = page.getByRole('button', { name: /Choose date\. Current value/ });
  await dateButton.click();
  // Planned A is Wed 07/10/2026. Anchor actual A to Thu 08/10/2026.
  await page.getByRole('button', { name: '08/10/2026' }).click();
  await page.getByRole('button', { name: 'Set selected plot actual progress' }).click();
  await expect(page.getByText(/all following work has been recalculated/i)).toBeVisible();

  const afterA = await xOf(row153.getByText('ACTIVITY A', { exact: true }));
  const afterB = await xOf(row153.getByText('ACTIVITY B', { exact: true }));
  expect(afterA).toBeGreaterThan(beforeA + 50);
  expect(afterB).toBeGreaterThan(beforeB + 50);

  const moves = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:activity-moves:v1') || '[]'));
  expect(moves.find((move) => move.plotId === 'live-plot-153' && move.activityCode === 'Activity A')?.deltaDays).toBe(1);

  await page.getByText('Reset selected plot', { exact: true }).click();
  await page.waitForTimeout(250);
  const resetMoves = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:activity-moves:v1') || '[]'));
  expect(resetMoves.filter((move) => move.plotId === 'live-plot-153')).toHaveLength(0);
});

test('cross-screen: live shift is shared by 2-week, trades, supervisor and exact completion stays unchanged', async ({ page }) => {
  await seed(page, {
    moves: [{ id: 'm1', plotId: 'live-plot-153', activityCode: 'Activity A', deltaDays: 1, updatedAt: new Date().toISOString() }],
  });

  await goto(page, '/two-week');
  await expect(page.getByText('ACTIVITY A', { exact: true }).first()).toBeVisible();

  await goto(page, '/trades');
  await page.getByText('2-Week Trade Programme', { exact: true }).click();
  await expect(page.getByText('Activity A', { exact: true }).first()).toBeVisible();

  await goto(page, '/supervisor?trade=carpenter');
  await expect(page.getByText('ACTIVITY A', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('09/10/2026', { exact: true }).first()).toBeVisible();

  await goto(page, '/master');
  await expect(page.getByText('09/10/2026', { exact: true })).toHaveCount(2);
});

test('plot deletion removes matching legacy QA records but preserves unrelated legacy records', async ({ page }) => {
  await seed(page);
  await page.addInitScript(() => {
    localStorage.setItem('siteprog:plot-programmes:v1', JSON.stringify([
      { id: 'legacy-153', plotName: 'Plot 153' },
      { id: 'legacy-999', plotName: 'Plot 999' },
    ]));
    localStorage.setItem('siteprog:plot-stages:v1', JSON.stringify([
      { id: 's153', plotProgrammeId: 'legacy-153' },
      { id: 's999', plotProgrammeId: 'legacy-999' },
    ]));
    localStorage.setItem('siteprog:inspections:v1', JSON.stringify([
      { id: 'i153', plotProgrammeId: 'legacy-153' },
      { id: 'i999', plotProgrammeId: 'legacy-999' },
    ]));
    localStorage.setItem('siteprog:defects:v1', JSON.stringify([
      { id: 'd153', plotProgrammeId: 'legacy-153' },
      { id: 'd999', plotProgrammeId: 'legacy-999' },
    ]));
    localStorage.setItem('siteprog:dabs-briefings:v1', JSON.stringify([
      { id: 'b153', plotProgrammeId: 'legacy-153' },
      { id: 'b999', plotProgrammeId: 'legacy-999' },
    ]));
  });

  await goto(page, '/master');
  await page.getByRole('button', { name: 'Delete a plot from the master programme' }).click();
  await page.getByText('Plot 153', { exact: true }).last().click();
  await page.getByText('Delete Plot 153', { exact: true }).click();
  await page.getByText('Confirm Delete Plot 153', { exact: true }).click();
  await page.waitForTimeout(250);

  const legacy = await page.evaluate(() => ({
    plots: JSON.parse(localStorage.getItem('siteprog:plot-programmes:v1') || '[]'),
    stages: JSON.parse(localStorage.getItem('siteprog:plot-stages:v1') || '[]'),
    inspections: JSON.parse(localStorage.getItem('siteprog:inspections:v1') || '[]'),
    defects: JSON.parse(localStorage.getItem('siteprog:defects:v1') || '[]'),
    dabs: JSON.parse(localStorage.getItem('siteprog:dabs-briefings:v1') || '[]'),
  }));
  for (const records of Object.values(legacy)) {
    expect(records.some((record) => record.id?.includes('153') || record.plotProgrammeId === 'legacy-153')).toBeFalsy();
    expect(records.some((record) => record.id?.includes('999') || record.plotProgrammeId === 'legacy-999')).toBeTruthy();
  }
});

test('year boundary: programme weeks stay linear rather than wrapping to prior-year work', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('programme-buddy:programme-setup:v1', JSON.stringify({
      siteName: 'Year Boundary QA',
      defaultProgrammeWeeks: 1,
      stageCount: 9,
      workingWeek: '5 days - Monday to Friday',
      includeSaturday: false,
      includeSunday: false,
      programmeStartDate: '28/12/2026',
    }));
    localStorage.setItem('programme-buddy:house-types-reset:v2', 'done');
  });
  await goto(page, '/two-week');
  await expect(page.locator('body')).toContainText('28/12/2026');
  await page.getByText('Next week', { exact: true }).click();
  await expect(page.locator('body')).toContainText('04/01/2027');
});
