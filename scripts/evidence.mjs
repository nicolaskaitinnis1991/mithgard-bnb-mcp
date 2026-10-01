export const validateReport = (data, startedAt, now, expectedFiles, allowedSkipped = []) => {
  if (
    !data ||
    typeof data !== 'object' ||
    data.success !== true ||
    !Number.isFinite(data.startTime) ||
    data.startTime < startedAt ||
    data.startTime > now ||
    !Array.isArray(data.testResults)
  )
    return false;
  if (
    !Number.isSafeInteger(data.numPassedTests) ||
    data.numPassedTests < 1 ||
    data.numFailedTests !== 0 ||
    data.numFailedTestSuites !== 0 ||
    !Number.isSafeInteger(data.numPendingTests) ||
    data.numPendingTests < 0
  )
    return false;
  const suites = new Map();
  for (const suite of data.testResults) {
    if (
      typeof suite.name !== 'string' ||
      !Array.isArray(suite.assertionResults) ||
      suites.has(suite.name)
    )
      return false;
    suites.set(suite.name, suite);
    for (const test of suite.assertionResults) {
      if (typeof test.fullName !== 'string' || typeof test.status !== 'string') return false;
      if (
        test.status !== 'passed' &&
        !(allowedSkipped.includes(suite.name) && ['pending', 'skipped'].includes(test.status))
      )
        return false;
    }
  }
  if (
    expectedFiles.some(
      (file) => !suites.has(file) || suites.get(file).assertionResults.length === 0,
    )
  )
    return false;
  const passed = data.testResults
    .flatMap((suite) => suite.assertionResults)
    .filter((test) => test.status === 'passed').length;
  const pending = data.testResults
    .flatMap((suite) => suite.assertionResults)
    .filter((test) => ['pending', 'skipped'].includes(test.status)).length;
  return (
    passed === data.numPassedTests &&
    pending === data.numPendingTests &&
    passed + pending === data.numTotalTests
  );
};
export const areaEvidence = (area, assertions, sourceUnchanged, commandsPassed, filesExist) => {
  const tests = assertions.filter(
    (test) =>
      area.tests.includes(test.file) &&
      (!area.id.startsWith('HOST-') || test.name.includes(`[${area.id}]`)),
  );
  const allFilesChecked = area.tests.every((file) => tests.some((test) => test.file === file));
  const success =
    sourceUnchanged &&
    commandsPassed &&
    filesExist &&
    (area.id === 'EVIDENCE'
      ? true
      : allFilesChecked && tests.length > 0 && tests.every((test) => test.status === 'passed'));
  return { success, tests };
};
