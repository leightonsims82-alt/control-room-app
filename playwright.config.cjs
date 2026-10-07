// CI can reuse the runner's Chrome; local runs use Playwright's Chromium by default.
module.exports = { use: { channel: process.env.PLAYWRIGHT_CHANNEL || undefined } };
