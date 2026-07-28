module.exports = {
  preset: 'jest-expo',
  // RTL Native v13+ registers its matchers automatically — no extend-expect.
  // pnpm nests real packages under node_modules/.pnpm/<name>@<ver>/node_modules/,
  // which the conventional transformIgnorePatterns regex does not match — so RN's
  // own ESM setup files were left untransformed. Transform everything except the
  // few packages that genuinely ship CJS.
  transformIgnorePatterns: [],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}', '!src/app/**'],
}
