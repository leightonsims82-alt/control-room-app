const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const engine = require('../utils/templateProgramme.ts');
const template = { id: 'qa', activities: [
  { order: 1, code: 'earlier', durationDays: 5, stage: 8 },
  { order: 2, code: 'final1', durationDays: 4, stage: 9 },
  { order: 3, code: 'final2', durationDays: 5, stage: 9 },
] };
const plot = { id: 'plot', templateId: 'qa', plotNo: '101', plotStartDate: '05/01/2026' };
for (const days of [5, 6, 7]) {
  const setup = { programmeStartDate: '05/01/2026', includeSaturday: days >= 6, includeSunday: days === 7 };
  const range = (p, index) => engine.getActivityProgrammeRange(p, template, template.activities[index], [], [], setup);
  for (const adjustment of [-1, 1]) {
    assert.equal(engine.canAdjustFinalStageWeek(plot, adjustment, [template], [], setup), true);
    const revised = { ...plot, finalStageAdjustmentWeeks: adjustment };
    assert.deepEqual(range(revised, 0), range(plot, 0), 'Earlier work must stay fixed');
    assert.equal(range(revised, 2).finish - range(plot, 2).finish, adjustment * days);
    for (const index of [1, 2]) assert.ok(range(revised, index).finish >= range(revised, index).start);
  }
  assert.equal(engine.canAdjustFinalStageWeek({ ...plot, finalStageAdjustmentWeeks: -1 }, -1, [template], [], setup), false);
  assert.equal(engine.canAdjustFinalStageWeek({ ...plot, holdStage: 9 }, 1, [template], [], setup), false);
}
const qs = require('query-string');
assert.equal(qs.parse('name=Roof%20framing').name, 'Roof framing');
assert.equal(qs.parse('name=%E2%82%AC').name, '€');
assert.equal(qs.parse('bad=' + '%FF'.repeat(10000)).bad.length, 30000);
assert.match(require('uuid').v4(), /^[\da-f-]{36}$/);
console.log('Final-stage duration, working calendars, minimum durations and dependency compatibility passed');
