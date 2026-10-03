import fs from 'node:fs';
import path from 'node:path';

const roots = ['app', 'components', 'data', 'utils'];
const codeFiles = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) codeFiles.push(full);
  }
}
for (const root of roots) walk(root);

const findings = [];
const stats = { files: codeFiles.length, pressables: 0, textInputs: 0, numericInputs: 0 };

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

for (const file of codeFiles) {
  const text = fs.readFileSync(file, 'utf8');
  stats.pressables += (text.match(/<Pressable\b/g) || []).length;
  stats.textInputs += (text.match(/<TextInput\b/g) || []).length;
  stats.numericInputs += (text.match(/keyboardType=["'](?:number-pad|numeric|decimal-pad)["']/g) || []).length;

  const rules = [
    {
      id: 'numeric-coercion-during-typing',
      severity: 'high',
      re: /onChangeText\s*=\s*\{[\s\S]{0,300}?(?:toPositiveInt|parseInt|parseFloat|Number|Math\.max)\s*\(/g,
      message: 'Numeric TextInput appears to coerce text to a number inside onChangeText. This can turn an empty edit into 1 or otherwise fight the user while typing. Keep a string draft and validate/convert on blur or save.'
    },
    {
      id: 'fallback-to-one',
      severity: 'high',
      re: /(?:Number|parseInt|parseFloat)\([^\n;]{0,120}\)\s*(?:\|\||\?\?)\s*1\b/g,
      message: 'Numeric conversion falls back to 1. This is a common cause of values unexpectedly becoming 1.'
    },
    {
      id: 'empty-onpress',
      severity: 'high',
      re: /onPress\s*=\s*\{\s*\(?(?:[^)]*)\)?\s*=>\s*\{\s*\}\s*\}/g,
      message: 'Button has an empty onPress handler.'
    },
    {
      id: 'undefined-onpress',
      severity: 'high',
      re: /onPress\s*=\s*\{\s*undefined\s*\}/g,
      message: 'Button onPress is explicitly undefined.'
    }
  ];

  for (const rule of rules) {
    for (const match of text.matchAll(rule.re)) {
      findings.push({
        id: rule.id,
        severity: rule.severity,
        file: file.replaceAll('\\', '/'),
        line: lineOf(text, match.index ?? 0),
        message: rule.message,
        excerpt: match[0].replace(/\s+/g, ' ').slice(0, 240)
      });
    }
  }

  // Flag Pressables with no obvious onPress in the opening tag. Some may be intentional,
  // so these are warnings rather than hard failures.
  for (const match of text.matchAll(/<Pressable\b([\s\S]*?)>/g)) {
    const opening = match[0];
    if (!/\bonPress\s*=/.test(opening)) {
      findings.push({
        id: 'pressable-without-onpress',
        severity: 'warning',
        file: file.replaceAll('\\', '/'),
        line: lineOf(text, match.index ?? 0),
        message: 'Pressable has no onPress in its opening tag; verify it is intentionally non-interactive.',
        excerpt: opening.replace(/\s+/g, ' ').slice(0, 240)
      });
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  stats,
  summary: {
    high: findings.filter((f) => f.severity === 'high').length,
    warning: findings.filter((f) => f.severity === 'warning').length
  },
  findings
};

fs.mkdirSync('diagnostics', { recursive: true });
fs.writeFileSync('diagnostics/static-diagnostic.json', JSON.stringify(report, null, 2));

console.log(`Scanned ${stats.files} source files, ${stats.pressables} Pressables, ${stats.textInputs} TextInputs and ${stats.numericInputs} numeric inputs.`);
console.log(`Static diagnostic: ${report.summary.high} high-severity finding(s), ${report.summary.warning} warning(s).`);
for (const finding of findings) {
  console.log(`[${finding.severity.toUpperCase()}] ${finding.id} ${finding.file}:${finding.line} — ${finding.message}`);
}

// Do not abort here: browser diagnostics should still run so we get one complete report.
process.exitCode = 0;
