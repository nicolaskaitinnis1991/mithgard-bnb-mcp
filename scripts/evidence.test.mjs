import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateReport, areaEvidence } from './evidence.mjs';
const good = () => ({
  success: true,
  startTime: 1000,
  numPassedTests: 1,
  numFailedTests: 0,
  numFailedTestSuites: 0,
  numTotalTests: 1,
  numPendingTests: 0,
  testResults: [
    { name: '/test.ts', assertionResults: [{ fullName: 'actual case', status: 'passed' }] },
  ],
});
test('accepts current complete actual reports', () =>
  assert.equal(validateReport(good(), 900, 1100, ['/test.ts']), true));
for (const stamp of [undefined, null, NaN, Infinity, 899, 1101])
  test(`rejects invalid/stale/future timestamp ${String(stamp)}`, () => {
    const report = good();
    report.startTime = stamp;
    assert.equal(validateReport(report, 900, 1100, ['/test.ts']), false);
  });
test('rejects malformed reports and partial target runs', () => {
  for (const report of [
    null,
    {},
    { ...good(), testResults: null },
    { ...good(), numPassedTests: 2 },
  ])
    assert.equal(validateReport(report, 900, 1100, ['/test.ts']), false);
  assert.equal(validateReport(good(), 900, 1100, ['/test.ts', '/missing.ts']), false);
});
test('accepts only explicitly external skipped files', () => {
  const report = good();
  report.numPendingTests = 1;
  report.numTotalTests = 2;
  report.testResults.push({
    name: '/live.ts',
    assertionResults: [{ fullName: 'live', status: 'pending' }],
  });
  assert.equal(validateReport(report, 900, 1100, ['/test.ts', '/live.ts']), false);
  assert.equal(validateReport(report, 900, 1100, ['/test.ts', '/live.ts'], ['/live.ts']), true);
});
test('required skipped cases, changed source, failed commands and absent files cannot pass an area', () => {
  const area = { id: 'FLOW', tests: ['one.ts', 'two.ts'] };
  const tests = [
    { file: 'one.ts', name: 'first', status: 'passed' },
    { file: 'two.ts', name: 'second', status: 'passed' },
  ];
  assert.equal(areaEvidence(area, tests, true, true, true).success, true);
  assert.equal(areaEvidence(area, tests.slice(0, 1), true, true, true).success, false);
  assert.equal(
    areaEvidence(
      area,
      [...tests, { file: 'one.ts', name: 'pending required', status: 'pending' }],
      true,
      true,
      true,
    ).success,
    false,
  );
  for (const flags of [
    [false, true, true],
    [true, false, true],
    [true, true, false],
  ])
    assert.equal(areaEvidence(area, tests, ...flags).success, false);
});

test('rejects concealed skip counts and failed suites', () => {
  const report = good();
  report.testResults.push({
    name: '/live.ts',
    assertionResults: [{ fullName: 'external skipped', status: 'pending' }],
  });
  assert.equal(validateReport(report, 900, 1100, ['/test.ts', '/live.ts'], ['/live.ts']), false);
  assert.equal(
    validateReport({ ...good(), numFailedTestSuites: 1 }, 900, 1100, ['/test.ts']),
    false,
  );
});
