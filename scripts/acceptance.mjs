import { spawnSync, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { archiveFiles, repositoryFiles } from './repository-files.mjs';
import { validateReport, areaEvidence } from './evidence.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = resolve(root, 'reports');
mkdirSync(reportDir, { recursive: true });
const git = (args) =>
  existsSync(resolve(root, '.git'))
    ? execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
    : null;
const fingerprint = () => {
  const files = repositoryFiles(root);
  const digest = createHash('sha256');
  for (const file of files)
    digest
      .update(file)
      .update('\0')
      .update(readFileSync(resolve(root, file)))
      .update('\0');
  return { sha256: digest.digest('hex'), files: files.length };
};
const start = new Date().toISOString();
// Replace any previous green report before commands or parsing can fail.
writeFileSync(
  resolve(reportDir, 'acceptance.json'),
  JSON.stringify({ status: 'not_verified', started: start, reason: 'run_in_progress' }) + '\n',
);
writeFileSync(
  resolve(reportDir, 'acceptance.md'),
  '# Acceptance not verified\n\nRun in progress; prior results have been invalidated.\n',
);
for (const file of ['unit-integration.json', 'stress-native.json', 'stress-container.json'])
  rmSync(resolve(reportDir, file), { force: true });
const initial = fingerprint();
const archiveInventoryMatches =
  JSON.stringify(archiveFiles(root)) === JSON.stringify(repositoryFiles(root));
const commands = [];
const image = `mithgard-bnb-mcp:acceptance-${randomUUID()}`;
let imageIdentity = null;
const run = (id, command, args, env = {}) => {
  const started = new Date().toISOString();
  process.stdout.write(`Acceptance: ${id}\n`);
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 600_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `\n${result.error.message}` : ''}`;
  const logfile = `reports/${id}.log`;
  writeFileSync(resolve(root, logfile), text);
  commands.push({
    id,
    command: [command, ...args],
    started,
    finished: new Date().toISOString(),
    exit_code: result.status,
    signal: result.signal,
    log: logfile,
  });
  if (result.status !== 0) {
    process.stderr.write(text.slice(-12_000));
    return false;
  }
  process.stdout.write(
    id === 'container-identity' ? 'Immutable image identity captured in log.\n' : text.slice(-1800),
  );
  return true;
};
let passed = archiveInventoryMatches && run('clean-install', 'npm', ['ci', '--ignore-scripts']);
if (passed) passed = run('verify-native', 'npm', ['run', 'verify']);
if (passed) passed = run('dependency-audit', 'npm', ['audit', '--audit-level=moderate', '--json']);
if (passed) passed = run('container-build', 'docker', ['build', '--pull', '-t', image, '.']);
if (passed) {
  passed = run('container-identity', 'docker', [
    'image',
    'inspect',
    image,
    '--format',
    '{{json .}}',
  ]);
  try {
    imageIdentity = JSON.parse(readFileSync(resolve(reportDir, 'container-identity.log'), 'utf8'));
    if (!/^sha256:[a-f0-9]{64}$/.test(imageIdentity.Id))
      throw new Error('Missing immutable image ID');
  } catch {
    passed = false;
    imageIdentity = null;
  }
}
if (passed)
  passed = run('container-smoke', 'npm', ['run', 'smoke', '--', '--docker', imageIdentity.Id]);
if (passed)
  passed = run('container-load', 'npm', ['run', 'test:stress'], {
    MITHGARD_STRESS_DOCKER_IMAGE: imageIdentity.Id,
  });
const final = fingerprint();
const sourceUnchanged = initial.sha256 === final.sha256;
const reportErrors = [];
const expectedUnit = repositoryFiles(root)
  .filter((file) => /^tests\/(?:unit|integration|e2e)\/.*\.test\.ts$/.test(file))
  .map((file) => resolve(root, file));
const expectedStress = repositoryFiles(root)
  .filter((file) => /^tests\/stress\/.*\.test\.ts$/.test(file))
  .map((file) => resolve(root, file));
const allowedSkipped = ['tests/e2e/search-e2e.test.ts', 'tests/e2e/listing-e2e.test.ts'].map(
  (file) => resolve(root, file),
);
const loadReport = (file, expected, skipped = []) => {
  try {
    const data = JSON.parse(readFileSync(resolve(root, file), 'utf8'));
    if (!validateReport(data, Date.parse(start), Date.now(), expected, skipped))
      throw new Error('Invalid, incomplete or stale test evidence');
    return data;
  } catch (error) {
    reportErrors.push({
      file,
      reason: error instanceof Error ? error.message : 'Invalid evidence',
    });
    return null;
  }
};
const unit = loadReport('reports/unit-integration.json', expectedUnit, allowedSkipped);
const native = loadReport('reports/stress-native.json', expectedStress);
const container = loadReport('reports/stress-container.json', expectedStress);
const plan = JSON.parse(readFileSync(resolve(root, 'docs/acceptance/plan.json'), 'utf8'));
const assertions = [unit, native].flatMap(
  (data) =>
    data?.testResults.flatMap((suite) =>
      suite.assertionResults.map((test) => ({
        file: relative(root, suite.name),
        name: test.fullName,
        status: test.status,
      })),
    ) ?? [],
);
const areas = plan.areas.map((area) => {
  const filesExist = [...area.source, ...area.tests].every((file) =>
    existsSync(resolve(root, file)),
  );
  const { success, tests } = areaEvidence(
    area,
    assertions,
    sourceUnchanged,
    passed && unit !== null && native !== null && container !== null,
    filesExist,
  );
  return {
    ...area,
    status: success ? 'local_checks_passed' : 'not_verified',
    executed_tests: tests,
    external_status: area.external.length ? 'open' : 'not_applicable',
  };
});
const overall =
  passed &&
  sourceUnchanged &&
  [unit, native, container].every((data) => data?.success === true) &&
  areas.every((area) => area.status === 'local_checks_passed');
const report = {
  started: start,
  finished: new Date().toISOString(),
  status: overall ? 'local_acceptance_passed' : 'not_verified',
  scope: plan.scope,
  git_commit: git(['rev-parse', 'HEAD']),
  git_status: git(['status', '--short']),
  source_fingerprint: final,
  source_unchanged_during_run: sourceUnchanged,
  archive_inventory_matches: archiveInventoryMatches,
  container: imageIdentity && {
    tag: image,
    image_id: imageIdentity.Id,
    architecture: imageIdentity.Architecture,
    os: imageIdentity.Os,
    user: imageIdentity.Config.User,
    networking: 'disabled',
    filesystem: 'read-only',
    memory_bytes: 268435456,
  },
  runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  commands,
  report_errors: reportErrors,
  tests: {
    unit_integration: unit && {
      passed: unit.numPassedTests,
      failed: unit.numFailedTests,
      skipped: unit.numPendingTests,
    },
    native_load: native && { passed: native.numPassedTests, failed: native.numFailedTests },
    container_load: container && {
      passed: container.numPassedTests,
      failed: container.numFailedTests,
    },
  },
  areas,
  limitations: [
    'Supplied-data authenticity is caller asserted, not authenticated Airbnb import.',
    'Synthetic clients and local fixtures do not establish human acceptance, live provider reliability, or a global SLA.',
    'This run checks the local container architecture; additional platforms require CI evidence.',
    'Test names map to areas; passing tests and coverage do not prove every line correct.',
  ],
};
writeFileSync(resolve(reportDir, 'acceptance.json'), JSON.stringify(report, null, 2) + '\n');
writeFileSync(
  resolve(reportDir, 'acceptance.md'),
  `# Machine-produced acceptance\n\nStatus: **${report.status}**\n\nRun: ${start} — ${report.finished}. Commit: ${report.git_commit}; working changes: ${report.git_status === null ? 'unknown (source archive)' : report.git_status ? 'yes (see JSON)' : 'no'}. Source SHA-256: ${final.sha256}. Unchanged during run: ${sourceUnchanged}.\n\n| Area | Local evidence | Executed cases | External gate |\n| --- | --- | ---: | --- |\n${areas.map((area) => `| ${area.id} | ${area.status} | ${area.executed_tests.length} | ${area.external_status} |`).join('\n')}\n\n## Commands\n\n${commands.map((item) => `- ${item.id}: exit ${item.exit_code}; [log](${item.id}.log)`).join('\n')}\n\n## Scope limits\n\n${report.limitations.map((item) => `- ${item}`).join('\n')}\n\nThe JSON report contains exact test names, statuses, source paths and planned acceptance criteria.\n`,
);
process.stdout.write(`Acceptance result: ${report.status}; reports/acceptance.json\n`);
if (!overall) process.exitCode = 1;
