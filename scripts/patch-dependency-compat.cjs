// query-string 7 uses CommonJS; the security-fixed decoder exports an ESM default.
// Keep the upstream decoder intact and normalize its export at the consumer.
const fs = require('node:fs');
const path = require('node:path');
const target = require.resolve('query-string');
const version = JSON.parse(fs.readFileSync(path.join(path.dirname(target), 'package.json'))).version;
if (version !== '7.1.3') throw new Error('Review the query-string compatibility patch for version ' + version);
const original = "const decodeComponent = require('decode-uri-component');";
const replacement = "const decoderModule = require('decode-uri-component');\nconst decodeComponent = decoderModule.default || decoderModule;";
const source = fs.readFileSync(target, 'utf8');
if (source.includes(original)) fs.writeFileSync(target, source.replace(original, replacement));
else if (!source.includes(replacement)) throw new Error('Unexpected query-string source; compatibility patch was not applied.');

// image-size 2 accepts bytes, whereas Metro 0.83 also supplies file paths.
const metroPackages = new Set([
  require.resolve('metro/package.json'),
  require.resolve('metro/package.json', { paths: [path.dirname(require.resolve('@react-native/community-cli-plugin/package.json'))] }),
]);
for (const manifest of metroPackages) {
  const metroVersion = JSON.parse(fs.readFileSync(manifest)).version;
  if (!['0.83.3', '0.83.7'].includes(metroVersion)) throw new Error('Review image-size compatibility for Metro ' + metroVersion);
  const assets = path.join(path.dirname(manifest), 'src/Assets.js');
  const source = fs.readFileSync(assets, 'utf8');
  const original = 'const dimensions = isImage ? (0, _imageSize.default)(isImageInput) : null;';
  const replacement = 'const dimensions = isImage ? (0, _imageSize.default)(typeof isImageInput === "string" ? _fs.default.readFileSync(isImageInput) : isImageInput) : null;';
  if (source.includes(original)) fs.writeFileSync(assets, source.replace(original, replacement));
  else if (!source.includes(replacement)) throw new Error('Unexpected Metro source; image-size compatibility patch was not applied.');
}
