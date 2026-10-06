import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

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

  // Parse JSX rather than regex-matching arrow expressions that contain ">".
  // A Pressable may legitimately delegate its action to an ancestor <Link asChild>.
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const tagName = (node) => node.tagName?.getText(source);
  const hasAttribute = (node, name) => node.attributes?.properties?.some((property) =>
    ts.isJsxAttribute(property) && property.name.getText(source) === name
  );
  const delegatedToLink = (node) => {
    let current = node.parent;
    while (current) {
      if (ts.isJsxElement(current) && tagName(current.openingElement) === 'Link' && hasAttribute(current.openingElement, 'asChild')) return true;
      current = current.parent;
    }
    return false;
  };
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (tagName(node) === 'Pressable' && !hasAttribute(node, 'onPress') && !delegatedToLink(node)) {
        findings.push({
          id: 'pressable-without-onpress',
          severity: 'warning',
          file: file.replaceAll('\\', '/'),
          line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          message: 'Pressable has no onPress and is not delegated through <Link asChild>.',
          excerpt: node.getText(source).replace(/\s+/g, ' ').slice(0, 240)
        });
      }

      if (tagName(node) === 'TextInput') {
        const keyboard = node.attributes.properties.find((property) => ts.isJsxAttribute(property) && property.name.getText(source) === 'keyboardType');
        const keyboardText = keyboard?.getText(source) ?? '';
        const numeric = /number-pad|numeric|decimal-pad/.test(keyboardText);
        if (numeric) {
          const change = node.attributes.properties.find((property) => ts.isJsxAttribute(property) && property.name.getText(source) === 'onChangeText');
          const changeText = change?.getText(source) ?? '';
          if (/(?:toPositiveInt|parseInt|parseFloat|\bNumber|Math\.max)\s*\(/.test(changeText)) {
            findings.push({
              id: 'numeric-coercion-during-typing',
              severity: 'high',
              file: file.replaceAll('\\', '/'),
              line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
              message: 'Numeric TextInput coerces text to a number inside onChangeText. Keep a string draft and convert on blur/save.',
              excerpt: changeText.replace(/\s+/g, ' ').slice(0, 240)
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
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

// High-severity static findings fail the audit gate.
process.exitCode = report.summary.high > 0 ? 1 : 0;