const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const cache = new Map();

function resolveModule(fromFile, request) {
  if (!request.startsWith('.')) return require(request);
  const base = path.resolve(path.dirname(fromFile), request);
  const candidates = [
    base,
    base + '.ts',
    base + '.tsx',
    base + '.js',
    base + '.cjs',
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Cannot resolve ${request} from ${fromFile}`);
  return found;
}

function loadTs(file) {
  const resolved = path.resolve(file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  if (!/\.tsx?$/.test(resolved)) return require(resolved);

  const source = fs.readFileSync(resolved, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: resolved,
  }).outputText;

  const module = { exports: {} };
  cache.set(resolved, module);
  const wrapper = new vm.Script(`(function(require,module,exports,__filename,__dirname){${transpiled}\n})`, { filename: resolved });
  const fn = wrapper.runInThisContext();
  const localRequire = (request) => {
    const target = resolveModule(resolved, request);
    return typeof target === 'string' ? loadTs(target) : target;
  };
  fn(localRequire, module, module.exports, resolved, path.dirname(resolved));
  return module.exports;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, got ${actual}`);
}

const truth = loadTs(path.join(root, 'core/programme/activityTruth.ts'));
const engine = loadTs(path.join(root, 'core/programme/scheduleEngine.ts'));
const houseTypes = loadTs(path.join(root, 'core/programme/houseTypes.ts'));
const dates = loadTs(path.join(root, 'utils/programmeDates.ts'));

const expectedStages = {
  'Foundations': 1,
  'Band Course': 2,
  '1st lift Brickwork': 3,
  'Wall Plate': 3,
  'Truss': 4,
  'Roof tile': 4,
  'Strip Scaffold': 5,
  '1st Fix Carp': 6,
  'Windows': 6,
  '2nd fix carpentry': 7,
  'Kitchen Installation': 7,
  'Patch': 8,
  'Decoration': 8,
  'Plumbing Finals': 9,
  'Electrical finals inc PV': 9,
  'Mastic': 9,
};

for (const [code, stage] of Object.entries(expectedStages)) {
  assertEqual(truth.getCanonicalActivity(code)?.stage, stage, `${code} stage truth`);
}

const deliberatelyWrong = {
  order: 1,
  code: '2nd fix carpentry',
  trade: 'Wrong trade',
  displayText: 'Wrong label',
  durationDays: 3,
  stage: 2,
};
const corrected = truth.canonicaliseActivity(deliberatelyWrong);
assertEqual(corrected.stage, 7, '2nd fix carpentry must always be Stage 7');
assertEqual(corrected.trade, 'Carpenter', '2nd fix carpentry trade truth');

// Shared-week rule: Stage 6 occupies Mon-Wed and Stage 7 Thu-Fri. Master must show 6.
const sharedWeekTemplate = {
  id: 'shared-week',
  programmeWeeks: 1,
  activities: [
    { order: 1, code: '1st Fix Carp', trade: 'Carpenter', displayText: '1st Fix Carp', durationDays: 3, stage: 6 },
    { order: 2, code: '2nd fix carpentry', trade: 'Carpenter', displayText: '2nd Fix Carp', durationDays: 2, stage: 7 },
  ],
};
const sharedWeekPlot = { id: 'p1', stage9CompleteWeek: 1, plotStartDate: '05/01/2026' };
const setup = { programmeStartDate: '05/01/2026', includeSaturday: false, includeSunday: false };
assertEqual(engine.getV2StageDisplayForWeek(sharedWeekPlot, sharedWeekTemplate, 1, [], [], setup), '6', 'lowest stage must win when a week is shared');

// Week-ending dates must follow the configured working week.
assertEqual(dates.formatProgrammeWeekEndingDate('05/01/2026', 1, false, false), '09/01/2026', 'Mon-Fri week ending');
assertEqual(dates.formatProgrammeWeekEndingDate('05/01/2026', 1, true, false), '10/01/2026', 'Mon-Sat week ending');
assertEqual(dates.formatProgrammeWeekEndingDate('05/01/2026', 1, true, true), '11/01/2026', 'Mon-Sun week ending');

// Final-stage +1 week must extend only the last stage.
const finalTemplate = {
  id: 'final',
  programmeWeeks: 2,
  activities: [
    { order: 1, code: 'Decoration', trade: 'Decorator', displayText: 'Decoration', durationDays: 5, stage: 8 },
    { order: 2, code: 'Mastic', trade: 'Mastic applicator', displayText: 'Mastic', durationDays: 5, stage: 9 },
  ],
};
const finalPlot = { id: 'p2', stage9CompleteWeek: 2, plotStartDate: '05/01/2026' };
const before = engine.getV2LiveFinishWorkingDay(finalPlot, finalTemplate, [], [], setup);
const after = engine.getV2LiveFinishWorkingDay({ ...finalPlot, finalStageAdjustmentWeeks: 1 }, finalTemplate, [], [], setup);
assertEqual(after - before, 5, 'final-stage +1 must add one configured working week');

// Three-storey extras stay in Stage 3 and known activities retain their truth.
const baseHouse = {
  id: 'house-test',
  name: 'Test',
  bedrooms: 4,
  floors: 2,
  programmeWeeks: 25,
  activities: [
    { order: 1, code: '4th lift Brickwork', trade: 'Bricklayer', displayText: '4th Bwk', durationDays: 1, stage: 9 },
    { order: 2, code: 'Wall Plate', trade: 'Carpenter', displayText: 'Wall Plate', durationDays: 2, stage: 9 },
    { order: 3, code: 'Truss', trade: 'Carpenter', displayText: 'Truss', durationDays: 2, stage: 9 },
    { order: 4, code: 'Roof tile', trade: 'Roofer', displayText: 'Roof Tile', durationDays: 2, stage: 9 },
    { order: 5, code: '1st Fix Carp', trade: 'Carpenter', displayText: '1st Fix Carp', durationDays: 3, stage: 9 },
    { order: 6, code: '2nd fix carpentry', trade: 'Carpenter', displayText: '2nd Fix Carp', durationDays: 3, stage: 1 },
  ],
};
const threeStorey = houseTypes.applyV2FloorRules(baseHouse, 3);
assertEqual(threeStorey.activities.find((a) => a.code === '2nd Floor Joist')?.stage, 3, '3-storey second-floor joist stage');
assertEqual(threeStorey.activities.find((a) => a.code === '5th lift Brickwork')?.stage, 3, '3-storey extra brickwork stage');
assertEqual(threeStorey.activities.find((a) => a.code === '5th Lift Scaffold')?.stage, 3, '3-storey extra scaffold stage');
assertEqual(threeStorey.activities.find((a) => a.code === '2nd fix carpentry')?.stage, 7, 'house type canonical second-fix stage');

console.log('Programme V2 regression checks passed.');
