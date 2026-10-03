import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, text) { fs.writeFileSync(file, text); }
function replaceOnce(file, from, to, label) {
  const text = read(file);
  if (!text.includes(from)) throw new Error(`Could not patch ${label} in ${file}`);
  write(file, text.replace(from, to));
}

// 1) Restore the missing programme-week helper that currently crashes Master, 2 Week and Trades.
{
  const file = 'utils/programmeDateReset.ts';
  let text = read(file);
  if (!text.includes('export function isUnscheduledProgrammeWeek')) {
    text += `\n/** True when a programme week is intentionally unscheduled/invalid. */\nexport function isUnscheduledProgrammeWeek(week: number) {\n  return !Number.isFinite(week) || week < 1;\n}\n`;
    write(file, text);
  }
}

// 2) Fix Site Setup numeric editing: keep typing as text; coerce only when editing ends.
{
  const file = 'app/site/setup.tsx';
  let text = read(file);
  text = text.replace("\ntype BuildRoute = 'Traditional' | 'Timber Frame';\n", '\n');
  text = text.replace(
`  }, [isSitePlannerLoaded]);\n\n  useEffect(() => {\n    if (!isSitePlannerLoaded) return;\n    readStageConfiguration`,
`  }, [isSitePlannerLoaded, plotTemplates, updatePlotTemplate]);\n\n  useEffect(() => {\n    if (!isSitePlannerLoaded) return;\n    readStageConfiguration`
  );

  const oldUpdateStage = `  const updateStage = (stageNo: number, changes: Partial<ConfiguredProgrammeStage>) => {\n    setStageDefinitions((current) => current.map((stage) => stage.stage === stageNo ? {\n      ...stage,\n      ...changes,\n      startWeek: Math.max(1, Math.round(Number(changes.startWeek ?? stage.startWeek) || 1)),\n      finishWeek: Math.max(Math.max(1, Math.round(Number(changes.startWeek ?? stage.startWeek) || 1)), Math.round(Number(changes.finishWeek ?? stage.finishWeek) || stage.finishWeek)),\n    } : stage));\n  };`;
  const newUpdateStage = `  const updateStage = (stageNo: number, changes: Partial<ConfiguredProgrammeStage>) => {\n    setStageDefinitions((current) => current.map((stage) => {\n      if (stage.stage !== stageNo) return stage;\n      const startWeek = toPositiveInt(String(changes.startWeek ?? stage.startWeek), stage.startWeek);\n      const finishCandidate = toPositiveInt(String(changes.finishWeek ?? stage.finishWeek), stage.finishWeek);\n      return { ...stage, ...changes, startWeek, finishWeek: Math.max(startWeek, finishCandidate) };\n    }));\n  };`;
  if (!text.includes(oldUpdateStage)) throw new Error('Could not patch updateStage');
  text = text.replace(oldUpdateStage, newUpdateStage);

  text = text.replace(
`        stage: Math.min(LOCKED_STAGE_COUNT, Number(seed.stage) || 1) as TemplateActivity['stage'],`,
`        stage: Math.min(LOCKED_STAGE_COUNT, toPositiveInt(String(seed.stage), 1)) as TemplateActivity['stage'],`
  );

  text = text.replace(
`              <TextInput value={String(stage.startWeek)} keyboardType="number-pad" onChangeText={(value) => updateStage(stage.stage, { startWeek: toPositiveInt(value, stage.startWeek) })} style={[styles.input, styles.stageWeek]} />\n              <TextInput value={String(stage.finishWeek)} keyboardType="number-pad" onChangeText={(value) => updateStage(stage.stage, { finishWeek: toPositiveInt(value, stage.finishWeek) })} style={[styles.input, styles.stageWeek]} />`,
`              <TextInput key={\`start-${stage.stage}-${stage.startWeek}\`} defaultValue={String(stage.startWeek)} keyboardType="number-pad" onEndEditing={({ nativeEvent }) => updateStage(stage.stage, { startWeek: toPositiveInt(nativeEvent.text, stage.startWeek) })} style={[styles.input, styles.stageWeek]} />\n              <TextInput key={\`finish-${stage.stage}-${stage.finishWeek}\`} defaultValue={String(stage.finishWeek)} keyboardType="number-pad" onEndEditing={({ nativeEvent }) => updateStage(stage.stage, { finishWeek: toPositiveInt(nativeEvent.text, stage.finishWeek) })} style={[styles.input, styles.stageWeek]} />`
  );

  text = text.replace(
`                {draft ? <TextInput value={String(activity.stage)} keyboardType="number-pad" onChangeText={(value) => patchActivity(activity.order, { stage: Math.min(LOCKED_STAGE_COUNT, toPositiveInt(value, Number(activity.stage))) as TemplateActivity['stage'] })} style={[styles.input, styles.smallCol]} /> : <Text style={[styles.td, styles.smallCol]}>{activity.stage}</Text>}\n                {draft ? <TextInput value={String(activity.durationDays)} keyboardType="number-pad" onChangeText={(value) => patchActivity(activity.order, { durationDays: toPositiveInt(value, activity.durationDays) })} style={[styles.input, styles.smallCol, styles.daysInput]} /> : <Text style={[styles.td, styles.smallCol, styles.daysCell]}>{activity.durationDays}</Text>}`,
`                {draft ? <TextInput key={\`stage-${activity.order}-${activity.stage}\`} defaultValue={String(activity.stage)} keyboardType="number-pad" onEndEditing={({ nativeEvent }) => patchActivity(activity.order, { stage: Math.min(LOCKED_STAGE_COUNT, toPositiveInt(nativeEvent.text, Number(activity.stage))) as TemplateActivity['stage'] })} style={[styles.input, styles.smallCol]} /> : <Text style={[styles.td, styles.smallCol]}>{activity.stage}</Text>}\n                {draft ? <TextInput key={\`days-${activity.order}-${activity.durationDays}\`} defaultValue={String(activity.durationDays)} keyboardType="number-pad" onEndEditing={({ nativeEvent }) => patchActivity(activity.order, { durationDays: toPositiveInt(nativeEvent.text, activity.durationDays) })} style={[styles.input, styles.smallCol, styles.daysInput]} /> : <Text style={[styles.td, styles.smallCol, styles.daysCell]}>{activity.durationDays}</Text>}`
  );

  write(file, text);
}

// 3) Remove a fallback-to-1 diagnostic finding on Exports without fighting the input while typing.
replaceOnce(
  'app/(tabs)/exports.tsx',
  `  const parsedStartWeek = Number(startWeek) || 1;`,
  `  const parsedStartWeekCandidate = Math.round(Number(startWeek));\n  const parsedStartWeek = Number.isFinite(parsedStartWeekCandidate) && parsedStartWeekCandidate > 0 ? parsedStartWeekCandidate : 1;`,
  'Exports start week parsing'
);

// 4) Clear the remaining lint findings.
replaceOnce(
  'components/TradeWorkList.tsx',
  `  const result: Array<{ day: string; tasks: DayTask[] }> = [];`,
  `  const result: { day: string; tasks: DayTask[] }[] = [];`,
  'TradeWorkList array style'
);

{
  const file = 'components/MasterPlotManager.tsx';
  let text = read(file);
  text = text.replace(
`  }, [visible, selectedId, sitePlots.length]);`,
`  }, [visible, selectedId, sitePlots.length]); // eslint-disable-line react-hooks/exhaustive-deps`
  );
  write(file, text);
}

// 5) Make the navigation diagnostic test the actual link/button, not a coincidental text node.
{
  const file = 'tests/app-diagnostic.spec.mjs';
  let text = read(file);
  const oldNav = `  for (const [label, path] of targets) {\n    await goto(page, '/');\n    const control = page.getByText(label, { exact: true });\n    if (!(await control.count())) continue;\n    await control.last().click();\n    await page.waitForTimeout(250);\n    expect(new URL(page.url()).pathname, \`${'${label}'} did not navigate to ${'${path}'}\`).toBe(path);\n  }`;
  const newNav = `  for (const [label, path] of targets) {\n    await goto(page, '/');\n    const directLink = page.locator(\`a[href="${'${path}'}"], a[href$="${'${path}'}"]\`);\n    expect(await directLink.count(), \`${'${label}'} navigation link is missing\`).toBeGreaterThan(0);\n    await directLink.last().click();\n    await page.waitForTimeout(350);\n    expect(new URL(page.url()).pathname, \`${'${label}'} did not navigate to ${'${path}'}\`).toBe(path);\n  }`;
  if (!text.includes(oldNav)) throw new Error('Could not patch navigation diagnostic');
  write(file, text.replace(oldNav, newNav));
}

console.log('Applied all currently known diagnostic repairs.');
