import { createTool, limitToolResponse, type ToolDefinition } from '../tools/registry.js';
import type { WorkflowEngine } from './engine.js';
import { WorkflowInput, WorkflowOutput } from './schema.js';

export const buildWorkflowTool = (engine: WorkflowEngine): ToolDefinition => {
  const tool = createTool({
    name: 'host_workflow',
    description:
      '[LOCAL] Plan, execute and verify up to eight explicit read-only tool steps. Validates the entire plan before execution, propagates provenance and required approvals. No model, host writes or recursive workflows.',
    schema: WorkflowInput,
    output: WorkflowOutput,
    handler: (input, context) => engine.run(input, context),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });
  const handler = tool.handler;
  return {
    ...tool,
    handler: async (input, context) => {
      const response = await handler(input, context);
      const status = response.structuredContent?.execution_status;
      // The advertised output contract deliberately includes partial failures.
      if (status === 'partial' || status === 'failed' || status === 'cancelled')
        response.isError = true;
      return limitToolResponse(response);
    },
  };
};
