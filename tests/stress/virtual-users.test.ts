import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Logger } from 'pino';
import type { ZodSchema } from 'zod';
import { mockTools } from '../../src/tools/index.js';
import { OperationsOutput } from '../../src/operations/tool.js';
import { WorkflowOutput } from '../../src/workflows/schema.js';
import { MAX_TOOL_OUTPUT_BYTES } from '../../src/tools/registry.js';
import { APPROVAL_TOOLS, demoInputs, providedInputs } from './input-fixtures.js';

interface Case {
  name: string;
  arguments: Record<string, unknown>;
  expected: 'demo' | 'provided' | 'local' | 'plan' | 'execute' | 'input-rejection';
  workflowSource?: 'demo' | 'provided';
}

const log = {
  info: () => undefined,
  error: () => undefined,
  debug: () => undefined,
} as unknown as Logger;
const validators = new Map<string, ZodSchema>();
for (const tool of mockTools(log)) {
  if (!tool.output) throw new Error('Every domain tool requires a runtime output schema');
  validators.set(tool.name, tool.output);
}
validators.set('operations_status', OperationsOutput);
validators.set('host_workflow', WorkflowOutput);

const steps = (inputs: Record<string, Record<string, unknown>>) =>
  Object.entries(inputs).map(([tool, args], index) => ({
    id: `step_${String(index)}`,
    tool,
    arguments: args,
    ...(index > 0 ? { depends_on: [`step_${String(index - 1)}`] } : {}),
  }));

const domainCases: Case[] = [
  ...Object.entries(demoInputs).map(([name, args]) => ({
    name,
    arguments: { ...args, mode: 'demo' },
    expected: 'demo' as const,
  })),
  ...Object.entries(providedInputs).map(([name, args]) => ({
    name,
    arguments: args,
    expected: 'provided' as const,
  })),
  {
    name: 'host_workflow',
    arguments: { mode: 'plan', steps: steps(providedInputs) },
    expected: 'plan',
  },
  {
    name: 'host_workflow',
    arguments: { mode: 'execute', steps: steps(providedInputs) },
    expected: 'execute',
    workflowSource: 'provided',
  },
  {
    name: 'host_workflow',
    arguments: { mode: 'execute', steps: steps(demoInputs) },
    expected: 'execute',
    workflowSource: 'demo',
  },
  { name: 'operations_status', arguments: {}, expected: 'local' },
];
const invalidCases: Case[] = [
  {
    name: 'airbnb_search',
    arguments: { location: '', checkin: '2026-02-30' },
    expected: 'input-rejection',
  },
  { name: 'airbnb_listing_details', arguments: { listing_id: '' }, expected: 'input-rejection' },
  {
    name: 'host_workflow',
    arguments: {
      mode: 'execute',
      steps: [{ id: 'recursive', tool: 'host_workflow', arguments: {} }],
    },
    expected: 'input-rejection',
  },
  {
    name: 'host_insights',
    arguments: { listing_id: 'synthetic', mode: 'provided' },
    expected: 'input-rejection',
  },
  {
    name: 'host_workflow',
    arguments: {
      mode: 'execute',
      steps: [
        {
          id: 'bad_step',
          tool: 'smart_pricing',
          arguments: { listing_id: 'synthetic', from: '2026-06-03', to: '2026-06-01' },
        },
      ],
    },
    expected: 'input-rejection',
  },
];

describe('[LOAD] simulated critical users over a real MCP process', () => {
  it('discovers and validates 2000 varied concurrent domain, workflow and input-rejection contracts', async () => {
    const image = process.env.MCP_STRESS_IMAGE ?? process.env.MITHGARD_STRESS_DOCKER_IMAGE;
    const transport = new StdioClientTransport(
      image
        ? {
            command: 'docker',
            args: [
              'run',
              '--rm',
              '-i',
              '--read-only',
              '--network=none',
              '--cap-drop=ALL',
              '--security-opt=no-new-privileges',
              '--memory=256m',
              image,
            ],
            stderr: 'pipe',
          }
        : { command: process.execPath, args: ['dist/index.js'], stderr: 'pipe' },
    );
    const client = new Client({ name: 'virtual-critical-users', version: '1.0.0' });
    transport.stderr?.on('data', () => undefined);
    try {
      await client.connect(transport);
      // The SDK enforces advertised output contracts only after discovery.
      const discovery = await client.listTools();
      expect(discovery.tools).toHaveLength(11);
      for (const tool of discovery.tools) expect(tool.outputSchema?.type).toBe('object');
      const start = performance.now();
      const byTool: Record<string, number> = {};
      const byScenario: Record<string, number> = {};
      let success = 0;
      let rejected = 0;
      let workflowSteps = 0;
      let validIndex = 0;
      for (let batch = 0; batch < 100; batch++) {
        const cases = Array.from({ length: 20 }, (_, user) => {
          const entry =
            user % 4 === 0
              ? invalidCases[(batch + user / 4) % invalidCases.length]
              : domainCases[validIndex++ % domainCases.length];
          if (!entry) throw new Error('Expected a configured synthetic case');
          byTool[entry.name] = (byTool[entry.name] ?? 0) + 1;
          byScenario[entry.expected] = (byScenario[entry.expected] ?? 0) + 1;
          return entry;
        });
        const results = await Promise.all(
          cases.map((entry) => client.callTool({ name: entry.name, arguments: entry.arguments })),
        );
        for (const [index, raw] of results.entries()) {
          const entry = cases[index];
          if (!entry) throw new Error('Expected request metadata');
          const result = CallToolResultSchema.parse(raw);
          expect(Buffer.byteLength(JSON.stringify(result), 'utf8')).toBeLessThanOrEqual(
            MAX_TOOL_OUTPUT_BYTES,
          );
          if (entry.expected === 'input-rejection') {
            rejected += 1;
            expect(result.isError, entry.name).toBe(true);
            expect(result.structuredContent).toBeUndefined();
            continue;
          }
          success += 1;
          expect(result.isError, entry.name).toBe(false);
          const output = result.structuredContent;
          if (!output) throw new Error('Successful tools require structuredContent');
          expect(validators.get(entry.name)?.safeParse(output).success, entry.name).toBe(true);
          const first = result.content[0];
          if (first?.type !== 'text') throw new Error('Expected JSON text content');
          expect(JSON.parse(first.text), entry.name).toEqual(output);
          if (entry.expected === 'demo' || entry.expected === 'provided') {
            expect(output._source, entry.name).toBe(entry.expected);
            expect(output._mock, entry.name).toBe(entry.expected === 'demo');
            if (APPROVAL_TOOLS.has(entry.name)) expect(output.approval_required).toBe(true);
          } else if (entry.expected === 'plan' || entry.expected === 'execute') {
            const workflow = WorkflowOutput.parse(output);
            expect(workflow.execution_status).toBe(
              entry.expected === 'plan' ? 'planned' : 'verified',
            );
            expect(workflow.results).toHaveLength(entry.expected === 'plan' ? 0 : 7);
            if (entry.expected === 'execute') {
              expect(workflow.summary.technical_verified).toBe(true);
              expect(workflow.summary.approval_required).toBe(true);
              expect(workflow.acceptance_status).toBe('approval_pending');
              for (const step of workflow.results) {
                expect(step.status).toBe('completed');
                expect(step.source).toBe(entry.workflowSource);
                expect(validators.get(step.tool)?.safeParse(step.output).success, step.tool).toBe(
                  true,
                );
                if (APPROVAL_TOOLS.has(step.tool))
                  expect(step.output?.approval_required).toBe(true);
                workflowSteps += 1;
              }
            }
          }
        }
      }
      expect(success).toBe(1500);
      expect(rejected).toBe(500);
      expect(Object.keys(byTool).sort()).toEqual(discovery.tools.map((tool) => tool.name).sort());
      for (const scenario of ['demo', 'provided', 'local', 'plan', 'execute', 'input-rejection'])
        expect(byScenario[scenario]).toBeGreaterThan(0);
      const final = CallToolResultSchema.parse(
        await client.callTool({ name: 'operations_status', arguments: {} }),
      );
      const state = OperationsOutput.parse(final.structuredContent);
      expect(state.active_calls).toBe(0);
      expect(state.recovery_count).toBe(0);
      expect(state.status).toBe('unverified');
      console.info(
        JSON.stringify({
          scenario: 'virtual-users-multi-tool',
          scope: image ? 'constrained-container-local-synthetic' : 'native-process-local-synthetic',
          workload_tool_calls: 2000,
          control_tool_calls: 1,
          discovery_calls: 1,
          concurrency: 20,
          success,
          input_rejections: rejected,
          executed_workflow_steps: workflowSteps,
          by_tool: byTool,
          by_scenario: byScenario,
          external_requests: 0,
          business_writes: 0,
          human_acceptance: false,
          duration_ms: Math.round(performance.now() - start),
        }),
      );
    } finally {
      await client.close();
    }
  });
});
