# Dependency security status — 7 October 2026

The lockfile audit is reduced from 26 high / 17 moderate to 24 high / 5 moderate, with zero critical. Counts include dependent packages, not just distinct vulnerabilities. This is not a clean security audit.

Pinned patched versions: shell-quote 1.11.0, decode-uri-component 0.5.0, image-size 2.0.4, postcss 8.5.29 and uuid 11.1.1.

`npm install` / `npm ci` runs `scripts/patch-dependency-compat.cjs`. It normalizes the decoder's default export for query-string 7 and gives image-size 2 byte buffers from Metro 0.83. The script checks upstream versions and fails if source expectations change. These adaptations retain the actual security-fixed dependencies and their audit identities. Do not skip install scripts. Use the supported Expo Node runtime (Node 22 in CI).

Three upstream advisories remain without published patched versions at verification time:

- braces 3.0.3: deeply nested patterns can exhaust the stack. https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- node-forge 1.4.0: malformed RSA DigestAlgorithm elements can bypass strict signature validation. https://github.com/advisories/GHSA-86w9-cpqp-85rv
- sprintf-js: unbounded precision specifiers can cause denial of service. https://github.com/advisories/GHSA-hp3w-g68c-fv3c

These enter through Metro file matching, Expo code-signing tooling and React Native's coverage/Babel tooling respectively. An SDK migration is a separate compatibility project and would still require verifying its complete dependency tree. No audit suppressions or invented package versions were used.

Verification: final-stage scheduling and module compatibility checks in `tests/final-stage.cjs`; full browser regression and production export in `.github/workflows/full-app-diagnostic.yml`.
