import type { CallToolResult, Tool, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ZodSchema, ZodType, ZodTypeDef } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { McpError } from '../lib/errors.js';

export interface ToolCallContext {
  signal: AbortSignal;
}

export interface ToolResponse extends CallToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Tool['inputSchema'];
  outputSchema?: Tool['inputSchema'];
  annotations?: ToolAnnotations;
  schema: ZodSchema;
  handler: (input: unknown, context?: ToolCallContext) => Promise<ToolResponse>;
}

// One source of truth: advertised constraints and runtime validation are
// generated from the same Zod schema. Cross-field refinements still run in Zod.
export const jsonSchema = (schema: ZodSchema): Tool['inputSchema'] => {
  const converted = zodToJsonSchema(schema, { target: 'jsonSchema7', $refStrategy: 'none' });
  if (!('type' in converted) || converted.type !== 'object') {
    throw new Error('MCP tool schemas must describe objects');
  }
  return { ...converted, type: 'object' };
};

// Public errors deliberately exclude upstream URLs, bodies, selectors, causes,
// and raw arguments. Those details can contain private messages or credentials.
const publicFailure = (error: Record<string, unknown>): Record<string, unknown> => {
  switch (error.kind) {
    case 'RateLimited':
      return {
        error: 'Request rate limit reached; retry after the indicated delay.',
        kind: error.kind,
        ...(typeof error.retry_after_ms === 'number' &&
        Number.isFinite(error.retry_after_ms) &&
        error.retry_after_ms >= 0
          ? { retry_after_ms: error.retry_after_ms }
          : {}),
      };
    case 'UpstreamHTTP':
      return {
        error: 'The upstream service returned an HTTP error.',
        kind: error.kind,
        ...(typeof error.status === 'number' &&
        Number.isInteger(error.status) &&
        error.status >= 100 &&
        error.status <= 599
          ? { status: error.status }
          : {}),
      };
    case 'ParseFailed':
      return { error: 'Public listing data could not be parsed reliably.', kind: error.kind };
    case 'ValidationFailed':
      return { error: 'Tool data did not pass validation.', kind: error.kind };
    case 'NotImplemented':
      return { error: 'This capability has no connected provider.', kind: error.kind };
    case 'TransportFailed':
      return {
        error: 'The upstream request could not be completed.',
        kind: error.kind,
        ...(typeof error.reason === 'string' &&
        ['Network', 'Timeout', 'ResponseTooLarge', 'QueueFull', 'Closed', 'Cancelled'].includes(
          error.reason,
        )
          ? { reason: error.reason }
          : {}),
      };
    default:
      return { error: 'Tool execution failed.', kind: 'UnexpectedError' };
  }
};

export const toolError = (error: McpError): Record<string, unknown> => publicFailure(error);

const errorResponse = (data: Record<string, unknown>): ToolResponse => ({
  content: [{ type: 'text', text: JSON.stringify(data) }],
  // Errors have no structuredContent: MCP clients may validate any structured
  // content against the success outputSchema, including when isError is true.
  isError: true,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const wrapHandler =
  <T, RawT>(
    schema: ZodType<T, ZodTypeDef, RawT>,
    fn: (input: T, context?: ToolCallContext) => Promise<unknown>,
    output?: ZodSchema,
  ) =>
  async (raw: unknown, context?: ToolCallContext): Promise<ToolResponse> => {
    try {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        return errorResponse({
          error: 'ValidationFailed',
          kind: 'ValidationFailed',
          // Zod issues can include received values in messages; retain only
          // fixed error codes and schema-defined paths.
          issues: parsed.error.issues.map((issue) => ({ code: issue.code, path: issue.path })),
        });
      }
      if (context?.signal.aborted) {
        return errorResponse({ error: 'Tool request was cancelled.', kind: 'Cancelled' });
      }
      const out = await fn(parsed.data, context);
      if (isRecord(out) && typeof out.error === 'string' && typeof out.kind === 'string') {
        return errorResponse(publicFailure(out));
      }
      const checked = output?.safeParse(out);
      if (checked && !checked.success) {
        return errorResponse({
          error: 'Tool output did not pass validation.',
          kind: 'OutputValidationFailed',
        });
      }
      const data: unknown = checked?.data ?? out;
      if (!isRecord(data)) {
        return errorResponse({
          error: 'Tool output must be a JSON object.',
          kind: 'OutputValidationFailed',
        });
      }
      const text = JSON.stringify(data, (_key, value: unknown) => {
        if (typeof value === 'number' && !Number.isFinite(value)) {
          throw new Error('Non-finite numbers cannot be encoded as JSON');
        }
        return value;
      });
      // Parse once to guarantee that structuredContent matches the JSON text
      // exactly (no undefined values or non-JSON types on the wire).
      const structuredContent = JSON.parse(text) as Record<string, unknown>;
      return { content: [{ type: 'text', text }], structuredContent, isError: false };
    } catch {
      return errorResponse({ error: 'Tool execution failed.', kind: 'UnexpectedError' });
    }
  };

export const createTool = <I, O, RawI, RawO>(options: {
  name: string;
  description: string;
  schema: ZodType<I, ZodTypeDef, RawI>;
  output: ZodType<O, ZodTypeDef, RawO>;
  handler: (input: I, context?: ToolCallContext) => Promise<unknown>;
  annotations?: ToolAnnotations;
}): ToolDefinition => ({
  name: options.name,
  description: options.description,
  schema: options.schema,
  inputSchema: jsonSchema(options.schema),
  outputSchema: jsonSchema(options.output),
  annotations: options.annotations ?? {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: wrapHandler(options.schema, options.handler, options.output),
});
