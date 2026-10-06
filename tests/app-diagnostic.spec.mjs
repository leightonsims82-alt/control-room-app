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

async function inputWithValue(page, value) {
  const inputs = page.locator('input');
  const index = await inputs.evaluateAll((nodes, expected) => {
    let found = -1;
    nodes.forEach((node, itemIndex) => {
      if (node.value === expected) found = itemIndex;
    });
    return found;
  }, value);
  expect(index, `Input with value "${value}" was not found`).toBeGreaterThanOrEqual(0);
  return inputs.nth(index);
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

test('site setup: removes previously saved legacy house types', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('programme-buddy:plot-templates:v1', JSON.stringify([
      {
        id: 'custom-cambridge',
        name: 'Cambridge',
        houseTypeCode: 'Cambridge',
        isHouseType: true,
        isSystemTemplate: false,
        programmeWeeks: 23,
        stageCount: 9,
        description: 'legacy',
        activities: [],
      },
      {
        id: 'custom-ashford',
        name: 'Ashford',
        houseTypeCode: 'Ashford',
        isHouseType: true,
        isSystemTemplate: false,
        programmeWeeks: 23,
        stageCount: 9,
        description: 'legacy',
        activities: [],
      },
    ]));
    localStorage.removeItem('programme-buddy:house-types-reset:v2');
  });

  await goto(page, '/site/setup');
  await expect(page.getByText('Cambridge', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Ashford', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/No house types have been created yet/i)).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:plot-templates:v1') || '[]'));
  expect(stored.some((template) => template?.name === 'Cambridge' || template?.name === 'Ashford')).toBeFalsy();
  expect(await page.evaluate(() => localStorage.getItem('programme-buddy:house-types-reset:v2'))).toBe('done');
});

test('site setup: create a named 3-storey house type and add the automatic structure activities', async ({ page }) => {
  await goto(page, '/site/setup');

  await expect(page.getByText('3 Bedroom', { exact: true })).toHaveCount(0);
  await expect(page.getByText('4 Bedroom', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Standard programmes protected/i)).toBeVisible();

  const name = page.getByPlaceholder('e.g. Warrley or Linngate');
  await expect(name).toBeVisible();
  await name.fill('Warrley QA');

  const storeysLabel = page.getByText('Storeys', { exact: true }).first();
  await expect(storeysLabel).toBeVisible();
  const createSection = storeysLabel.locator('xpath=..');
  await createSection.getByText('3', { exact: true }).click();

  await page.getByText('Save New House Type', { exact: true }).click();
  await expect(page.getByText('Warrley QA', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('2nd floor joists and flooring', { exact: true })).toBeVisible();
  await expect(page.getByText('5th lift brickwork', { exact: true })).toBeVisible();
  await expect(page.getByText('5th lift scaffold', { exact: true })).toBeVisible();
});

test('site setup: four bedroom house type uses the agreed four bedroom programme', async ({ page }) => {
  await goto(page, '/site/setup');
  await page.getByPlaceholder('e.g. Warrley or Linngate').fill('Four Bed QA');

  const bedroomsLabel = page.getByText('Bedrooms', { exact: true }).first();
  const bedroomPicker = bedroomsLabel.locator('xpath=..');
  await bedroomPicker.getByText('4', { exact: true }).click();

  await page.getByText('Save New House Type', { exact: true }).click();
  await expect(page.getByText('Four Bed QA', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Substructure', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('QA Drainage', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('NHBC Drainage', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Groundwork Externals', { exact: true }).first()).toBeVisible();

  await page.getByText('Edit House Type', { exact: true }).click();
  const foundationRow = (await inputWithValue(page, 'Foundations')).locator('xpath=..');
  const substructureRow = (await inputWithValue(page, 'Substructure')).locator('xpath=..');
  const decorationRow = (await inputWithValue(page, 'Decoration')).locator('xpath=..');
  expect(await foundationRow.locator('input').last().inputValue()).toBe('5');
  expect(await substructureRow.locator('input').last().inputValue()).toBe('5');
  expect(await decorationRow.locator('input').last().inputValue()).toBe('7');
});

test('site setup: three storey four bed adds extra structure and fix days', async ({ page }) => {
  await goto(page, '/site/setup');
  await page.getByPlaceholder('e.g. Warrley or Linngate').fill('Three Storey QA');

  const bedroomsLabel = page.getByText('Bedrooms', { exact: true }).first();
  await bedroomsLabel.locator('xpath=..').getByText('4', { exact: true }).click();
  const storeysLabel = page.getByText('Storeys', { exact: true }).first();
  await storeysLabel.locator('xpath=..').getByText('3', { exact: true }).click();

  await page.getByText('Save New House Type', { exact: true }).click();
  await expect(page.getByText('2nd floor joists and flooring', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('4th lift brickwork', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('4th lift scaffold', { exact: true }).first()).toBeVisible();

  await page.getByText('Edit House Type', { exact: true }).click();
  const firstCarpRow = (await inputWithValue(page, '1st Fix Carp')).locator('xpath=..');
  const firstPlumbRow = (await inputWithValue(page, '1st fix plumbing')).locator('xpath=..');
  const firstElecRow = (await inputWithValue(page, '1st fix electrics')).locator('xpath=..');
  const secondCarpRow = (await inputWithValue(page, '2nd fix carpentry')).locator('xpath=..');
  const carpFinalRow = (await inputWithValue(page, 'Carpentry finals')).locator('xpath=..');
  const plumbFinalRow = (await inputWithValue(page, 'Plumbing Finals')).locator('xpath=..');
  const elecFinalRow = (await inputWithValue(page, 'Electrical finals inc PV')).locator('xpath=..');
  expect(await firstCarpRow.locator('input').last().inputValue()).toBe('4');
  expect(await firstPlumbRow.locator('input').last().inputValue()).toBe('3');
  expect(await firstElecRow.locator('input').last().inputValue()).toBe('3');
  expect(await secondCarpRow.locator('input').last().inputValue()).toBe('4');
  expect(await carpFinalRow.locator('input').last().inputValue()).toBe('1');
  expect(await plumbFinalRow.locator('input').last().inputValue()).toBe('2');
  expect(await elecFinalRow.locator('input').last().inputValue()).toBe('1');
});

test('feedback: accepts pasted screenshots and offers file attachment', async ({ page }) => {
  await goto(page, '/site/setup');
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await expect(page.getByText(/Paste a screen grab with Ctrl\+V/i)).toBeVisible();
  await expect(page.getByText('Add screenshot', { exact: true })).toBeVisible();

  await page.evaluate(() => {
    const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n6sAAAAASUVORK5CYII='), (char) => char.charCodeAt(0));
    const file = new File([bytes], 'clipboard.png', { type: 'image/png' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true }));
  });

  await expect(page.getByText('Screenshot attached.', { exact: true })).toBeVisible();
  await expect(page.getByText('Remove', { exact: true })).toBeVisible();
});

test('site setup: changing a house type to four bedrooms loads the agreed four bedroom standard', async ({ page }) => {
  await goto(page, '/site/setup');
  await page.getByPlaceholder('e.g. Warrley or Linngate').fill('Legacy Conversion QA');
  await page.getByText('Save New House Type', { exact: true }).click();
  await page.getByText('Edit House Type', { exact: true }).click();

  const editBedroomsLabel = page.getByText('Bedrooms', { exact: true }).last();
  await editBedroomsLabel.locator('xpath=..').getByText('4', { exact: true }).click();

  await expect(await inputWithValue(page, 'Substructure')).toBeVisible();
  await expect(await inputWithValue(page, 'QA Drainage')).toBeVisible();
  await expect(await inputWithValue(page, 'NHBC Drainage')).toBeVisible();
  await expect(await inputWithValue(page, 'Groundwork Externals')).toBeVisible();
  await page.getByText('Save House Type', { exact: true }).first().click();

  await expect(page.getByText('4', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Reset Programme to 4 Bedroom Standard', { exact: true })).toBeVisible();
});

test('site setup: activity text inputs keep focus and cursor while typing', async ({ page }) => {
  await goto(page, '/site/setup');
  await page.getByPlaceholder('e.g. Warrley or Linngate').fill('Cursor QA');
  await page.getByText('Save New House Type', { exact: true }).click();
  await page.getByText('Edit House Type', { exact: true }).click();

  const taskInput = await inputWithValue(page, 'Foundation');
  await taskInput.click();
  await taskInput.press('End');
  await taskInput.type(' revised', { delay: 35 });
  await expect(taskInput).toHaveValue('Foundation revised');
  expect(await taskInput.evaluate((node) => document.activeElement === node)).toBeTruthy();

  const taskRow = taskInput.locator('xpath=..');
  const rowInputs = taskRow.locator('input');
  const tradeInput = rowInputs.nth(1);
  await tradeInput.click();
  await tradeInput.press('End');
  await tradeInput.type(' team', { delay: 35 });
  await expect(tradeInput).toHaveValue('Groundworker team');
  expect(await tradeInput.evaluate((node) => document.activeElement === node)).toBeTruthy();

  const displayInput = rowInputs.nth(2);
  await displayInput.click();
  await displayInput.press('End');
  await displayInput.type(' revised', { delay: 35 });
  await expect(displayInput).toHaveValue('Foundation revised');
  expect(await displayInput.evaluate((node) => document.activeElement === node)).toBeTruthy();
});

test('site setup: explicit save actions persist house type details', async ({ page }) => {
  await goto(page, '/site/setup');
  await page.getByPlaceholder('e.g. Warrley or Linngate').fill('Save Action QA');
  await page.getByText('Save New House Type', { exact: true }).click();
  await expect(page.getByText('Save Action QA', { exact: true }).first()).toBeVisible();

  await page.getByText('Edit House Type', { exact: true }).click();
  await expect(page.getByText('Save house type changes', { exact: true })).toBeVisible();
  await expect(page.getByText(/not stored until you press Save House Type/i)).toBeVisible();

  const nameInput = await inputWithValue(page, 'Save Action QA');
  await nameInput.fill('Save Action QA Updated');
  const saveButtons = page.getByText('Save House Type', { exact: true });
  await saveButtons.last().click();
  await expect(page.getByText('Save Action QA Updated', { exact: true }).first()).toBeVisible();
});

test('site setup: named house type uses explicit edit and save workflow', async ({ page }) => {
  await goto(page, '/site/setup');
  await page.getByPlaceholder('e.g. Warrley or Linngate').fill('Linngate QA');
  await page.getByText('Save New House Type', { exact: true }).click();
  await expect(page.getByText('Linngate QA', { exact: true }).first()).toBeVisible();

  const edit = page.getByText('Edit House Type', { exact: true });
  await expect(edit).toBeVisible();
  await edit.click();
  await expect(page.getByText('Save House Type', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Cancel', { exact: true })).toBeVisible();
  await page.getByText('Cancel', { exact: true }).click();
  await expect(page.getByText('Edit House Type', { exact: true })).toBeVisible();
});

test('site setup: activity up and down arrows really reorder fixes', async ({ page }) => {
  await goto(page, '/site/setup');
  await page.getByPlaceholder('e.g. Warrley or Linngate').fill('Arrow QA');
  await page.getByText('Save New House Type', { exact: true }).click();
  await page.getByText('Edit House Type', { exact: true }).click();

  const foundation = await inputWithValue(page, 'Foundation');
  await expect(foundation).toBeVisible();

  const beforeFoundation = await foundation.boundingBox();
  expect(beforeFoundation).not.toBeNull();

  const foundationRow = foundation.locator('xpath=..');
  await foundationRow.getByText('↓', { exact: true }).click();

  const movedFoundation = await (await inputWithValue(page, 'Foundation')).boundingBox();
  expect(movedFoundation?.y ?? 0).toBeGreaterThan(beforeFoundation?.y ?? 0);

  const movedFoundationRow = (await inputWithValue(page, 'Foundation')).locator('xpath=..');
  await movedFoundationRow.getByText('↑', { exact: true }).click();

  const restoredFoundation = await (await inputWithValue(page, 'Foundation')).boundingBox();
  expect(restoredFoundation?.y ?? 0).toBeLessThan(movedFoundation?.y ?? 0);
});

test('master: named house type and construction route are separate selections', async ({ page }) => {
  await goto(page, '/site/setup');
  await page.getByPlaceholder('e.g. Warrley or Linngate').fill('Warrley QA');
  await page.getByText('Save New House Type', { exact: true }).click();

  await goto(page, '/master');
  await expect(page.getByText('Warrley QA', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Traditional', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Timber Frame', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Property Size', { exact: true })).toHaveCount(0);
});

test('calendar weeks: Master uses ISO week numbers and Site Setup can override Week 1', async ({ page }) => {
  const calendar = await page.evaluate(() => {
    const now = new Date();
    const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = utc.getUTCDay() || 7;
    const monday = new Date(utc.getTime() - (day - 1) * 86400000);
    const dd = String(monday.getUTCDate()).padStart(2, '0');
    const mm = String(monday.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = monday.getUTCFullYear();

    const working = new Date(monday.getTime());
    const workingDay = working.getUTCDay() || 7;
    working.setUTCDate(working.getUTCDate() + 4 - workingDay);
    const yearStart = new Date(Date.UTC(working.getUTCFullYear(), 0, 1));
    const isoWeek = Math.ceil((((working.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { startDate: `${dd}/${mm}/${yyyy}`, isoWeek };
  });

  await page.addInitScript(({ startDate }) => {
    localStorage.setItem('programme-buddy:programme-setup:v1', JSON.stringify({
      siteName: 'Calendar QA',
      defaultProgrammeWeeks: 25,
      stageCount: 9,
      workingWeek: '5 days - Monday to Friday',
      includeSaturday: false,
      includeSunday: false,
      programmeStartDate: startDate,
    }));
  }, calendar);

  await goto(page, '/master');
  await expect(page.getByText(`WK${String(calendar.isoWeek).padStart(2, '0')}`, { exact: false }).first()).toBeVisible();

  await goto(page, '/site/setup');
  const calendarWeekField = page.getByText('Calendar week for Week 1', { exact: true }).locator('xpath=..').locator('input');
  await expect(calendarWeekField).toHaveValue(String(calendar.isoWeek));
  await calendarWeekField.fill('7');
  await page.getByText('Save Site Settings', { exact: true }).click();

  const storedWeek = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:programme-setup:v1') || '{}').calendarWeekOne);
  expect(storedWeek).toBe(7);

  await goto(page, '/master');
  await expect(page.getByText('WK07', { exact: false }).first()).toBeVisible();
});

test('master: legacy 11-stage data is migrated and only 9 stages are shown', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('programme-buddy:programme-setup:v1', JSON.stringify({
      siteName: 'QA Site',
      defaultProgrammeWeeks: 25,
      stageCount: 11,
      workingWeek: '5 days - Monday to Friday',
      includeSaturday: false,
      includeSunday: false,
      programmeStartDate: '05/01/2026',
    }));
    localStorage.setItem('programme-buddy:stage-configuration:v1', JSON.stringify(
      Array.from({ length: 11 }, (_, index) => ({
        stage: index + 1,
        label: `Legacy Stage ${index + 1}`,
        startWeek: index + 1,
        finishWeek: index + 1,
      })),
    ));
  });

  await goto(page, '/master');
  await expect(page.getByText(/This programme uses 9 stages/i)).toBeVisible();
  await expect(page.getByText(/Showing the 9 stages configured in Site Setup/i)).toBeVisible();
  await expect(page.getByText('Stage 10', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Stage 11', { exact: true })).toHaveCount(0);

  const storedSetup = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:programme-setup:v1') || '{}'));
  const storedStages = await page.evaluate(() => JSON.parse(localStorage.getItem('programme-buddy:stage-configuration:v1') || '[]'));
  expect(storedSetup.stageCount).toBe(9);
  expect(storedStages).toHaveLength(9);
});

test('site setup: Save Site Settings gives visible confirmation', async ({ page }) => {
  await goto(page, '/site/setup');
  const save = page.getByText('Save Site Settings', { exact: true });
  await expect(save).toBeVisible();
  await save.click();
  await expect(page.getByText(/Site programme settings saved/i)).toBeVisible({ timeout: 10000 });
});

test('master: exact plot completion date is preserved instead of the week Monday', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('programme-buddy:existing-plots-cleared:2026-10-01-v1', new Date().toISOString());
    localStorage.setItem('programme-buddy:house-types-reset:v2', 'done');
    localStorage.setItem('programme-buddy:programme-setup:v1', JSON.stringify({
      siteName: 'Exact Date QA',
      defaultProgrammeWeeks: 25,
      stageCount: 9,
      workingWeek: '5 days - Monday to Friday',
      includeSaturday: false,
      includeSunday: false,
      programmeStartDate: '05/01/2026'
    }));
    localStorage.setItem('programme-buddy:plots:v1', JSON.stringify([
      {
        id: 'plot-exact-154',
        plotNo: '154',
        buildOrder: 1,
        stage9CompleteWeek: 49,
        templateId: 'threeBed',
        houseTypeId: 'threeBed',
        constructionMethod: 'traditional'
      }
    ]));
    localStorage.setItem('programme-buddy:plot-metadata:v1', JSON.stringify({
      '154': {
        plotNo: '154',
        houseTypeName: 'QA House',
        houseTypeId: 'threeBed',
        buildRoute: 'Traditional',
        programmeGenerationBasis: 'completion',
        plotCompletionDate: '11/12/2026'
      }
    }));
    localStorage.setItem('programme-buddy:stage-configuration:v1', JSON.stringify([
      { stage: 1, label: 'Foundations', startWeek: 1, finishWeek: 2 },
      { stage: 2, label: 'Slab / oversite', startWeek: 3, finishWeek: 8 },
      { stage: 3, label: 'Superstructure', startWeek: 9, finishWeek: 12 },
      { stage: 4, label: 'Roof covering', startWeek: 13, finishWeek: 14 },
      { stage: 5, label: 'Pre-plaster', startWeek: 15, finishWeek: 16 },
      { stage: 6, label: 'Drylinings', startWeek: 17, finishWeek: 18 },
      { stage: 7, label: '2nd fix', startWeek: 19, finishWeek: 20 },
      { stage: 8, label: 'Patching', startWeek: 21, finishWeek: 21 },
      { stage: 9, label: 'Finals', startWeek: 22, finishWeek: 22 }
    ]));
  });

  await goto(page, '/master');
  const completion = page.getByText('11/12/2026', { exact: true });
  await expect(completion).toBeVisible();
  await expect(page.getByText('07/12/2026', { exact: true })).toHaveCount(0);
  const row = completion.locator('xpath=..');
  await expect(row.getByText('WK29', { exact: true })).toBeVisible();
  await expect(row.getByText('9', { exact: true })).toBeVisible();
});

test('master: matrix Manage button opens the selected plot editor', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('programme-buddy:existing-plots-cleared:2026-10-01-v1', new Date().toISOString());
    localStorage.setItem('programme-buddy:house-types-reset:v2', 'done');
    localStorage.setItem('programme-buddy:plots:v1', JSON.stringify([
      {
        id: 'plot-manage-153',
        plotNo: '153',
        buildOrder: 1,
        stage9CompleteWeek: 12,
        templateId: 'threeBed',
        houseTypeId: 'threeBed',
        constructionMethod: 'traditional'
      }
    ]));
  });

  await goto(page, '/master');
  const manage = page.getByRole('button', { name: 'Manage Plot 153' });
  await expect(manage).toBeVisible();
  await manage.click();

  await expect(page.getByText('Manage plots', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('153', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Save Plot Changes', { exact: true })).toBeVisible();
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
    const directLink = page.locator(`a[href="${path}"], a[href$="${path}"]`);
    expect(await directLink.count(), `${label} navigation link is missing`).toBeGreaterThan(0);
    await directLink.last().click();
    await page.waitForTimeout(350);
    expect(new URL(page.url()).pathname, `${label} did not navigate to ${path}`).toBe(path);
  }
});
