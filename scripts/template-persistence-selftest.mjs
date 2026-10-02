import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const storePath = path.join(root, 'data', 'sitePlannerStore.tsx');
const source = fs.readFileSync(storePath, 'utf8');

function blockBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0, `Missing start marker: ${startMarker}`);
  assert.ok(end > start, `Missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

assert.equal(source.includes('storedActivitiesByCode'), false, 'Old duration-only template merge is still present');
assert.ok(source.includes('stored.map(normaliseTemplate)'), 'Saved templates are not being treated as the source of truth');
assert.ok(source.includes('setPlotTemplates((currentTemplates) =>'), 'Template writes are still using stale closure state');

const mergeSource = blockBetween('function mergeDefaultTemplates', 'function cleanPlotInput');
const updateSource = blockBetween('  const updatePlotTemplate = async', '  const value = useMemo');

const harnessTs = `
const DEFAULT_PLOT_TEMPLATES: any[] = [
  {
    id: 'threeBed',
    name: '3 Bedroom',
    activities: [
      { order: 1, code: 'Foundation', trade: 'Groundworker', displayText: 'FND', durationDays: 5, relativeWeek: 1, relativeDay: 1, stage: 1 },
      { order: 2, code: 'Drainage', trade: 'Groundworker', displayText: 'DNG', durationDays: 5, relativeWeek: 2, relativeDay: 1, stage: 1 },
    ],
  },
  {
    id: 'fourBed',
    name: '4 Bedroom',
    activities: [
      { order: 1, code: 'Foundation', trade: 'Groundworker', displayText: 'FND', durationDays: 6, relativeWeek: 1, relativeDay: 1, stage: 1 },
    ],
  },
];

const PLOT_TEMPLATES_KEY = 'programme-buddy:plot-templates:v1';

function normaliseTemplate(template: any) {
  return {
    ...template,
    houseTypeCode: template.houseTypeCode || template.name,
    constructionMethod: template.constructionMethod ?? 'traditional',
  };
}

${mergeSource}

let state: any[] = mergeDefaultTemplates([
  {
    ...DEFAULT_PLOT_TEMPLATES[0],
    activities: [
      DEFAULT_PLOT_TEMPLATES[0].activities[0],
      { order: 2, code: 'Band Course', trade: 'Site Team', displayText: 'Band', durationDays: 3, relativeWeek: 1, relativeDay: 1, stage: 1 },
      { ...DEFAULT_PLOT_TEMPLATES[0].activities[1], order: 3 },
    ],
  },
]);

const initialThreeBed = state.find((template) => template.id === 'threeBed');
assert.ok(initialThreeBed.activities.some((activity: any) => activity.code === 'Band Course'), 'Reload merge dropped the added Band Course row');
assert.ok(state.some((template) => template.id === 'fourBed'), 'Missing default templates are not being appended');

const writes = new Map<string, string>();
const AsyncStorage = {
  setItem: async (key: string, value: string) => {
    writes.set(key, value);
  },
};

const setPlotTemplates = (updater: any) => {
  state = updater(state);
};

${updateSource}

async function run() {
  const threeBed = state.find((template) => template.id === 'threeBed');
  const edited = {
    ...threeBed,
    activities: [
      ...threeBed.activities,
      { order: 4, code: 'Persistence Test Row', trade: 'Site Team', displayText: 'TEST', durationDays: 2, relativeWeek: 2, relativeDay: 1, stage: 1 },
    ],
  };

  await updatePlotTemplate(edited);
  await new Promise((resolve) => setTimeout(resolve, 0));

  let persisted = JSON.parse(writes.get(PLOT_TEMPLATES_KEY) || '[]');
  let persistedThreeBed = persisted.find((template: any) => template.id === 'threeBed');
  assert.ok(persistedThreeBed.activities.some((activity: any) => activity.code === 'Band Course'), 'Existing custom row was lost during update');
  assert.ok(persistedThreeBed.activities.some((activity: any) => activity.code === 'Persistence Test Row'), 'New custom row was not written');

  await updateTemplateActivityDuration('threeBed', 'Band Course', 4);
  await new Promise((resolve) => setTimeout(resolve, 0));

  persisted = JSON.parse(writes.get(PLOT_TEMPLATES_KEY) || '[]');
  persistedThreeBed = persisted.find((template: any) => template.id === 'threeBed');
  assert.equal(persistedThreeBed.activities.find((activity: any) => activity.code === 'Band Course').durationDays, 4, 'Duration update failed');
  assert.ok(persistedThreeBed.activities.some((activity: any) => activity.code === 'Persistence Test Row'), 'Duration update overwrote another recent template edit');

  const reloaded = mergeDefaultTemplates(persisted);
  const reloadedThreeBed = reloaded.find((template: any) => template.id === 'threeBed');
  assert.ok(reloadedThreeBed.activities.some((activity: any) => activity.code === 'Band Course'), 'Band Course disappeared after simulated reload');
  assert.ok(reloadedThreeBed.activities.some((activity: any) => activity.code === 'Persistence Test Row'), 'Added row disappeared after simulated reload');
}
`;

const compiled = ts.transpileModule(harnessTs, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.None,
  },
}).outputText;

const execute = new Function('assert', `${compiled}\nreturn run();`);
await execute(assert);

console.log('PASS: programme template save/reload persistence');
console.log('PASS: added rows survive reload');
console.log('PASS: duration edits do not overwrite other template edits');
