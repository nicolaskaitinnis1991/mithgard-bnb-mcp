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
  output?: ZodSchema;
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
        ...(error.scope === 'local' || error.scope === 'upstream' ? { scope: error.scope } : {}),
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
    case 'Busy':
      return { error: 'The local execution limit is reached; retry later.', kind: error.kind };
    case 'Closed':
      return { error: 'The local executor is closed.', kind: error.kind };
    case 'CircuitOpen':
      return { error: 'The upstream tool is temporarily isolated.', kind: error.kind };
    case 'Cancelled':
      return { error: 'Tool request was cancelled.', kind: error.kind };
    case 'TransportFailed':
      return {
        error: 'The upstream request could not be completed.',
        kind: error.kind,
        ...(typeof error.reason === 'string' &&
        [
          'Network',
          'Timeout',
          'QueueTimeout',
          'ResponseTooLarge',
          'QueueFull',
          'Closed',
          'Cancelled',
        ].includes(error.reason)
          ? { reason: error.reason }
          : {}),
      };
    default:
      return { error: 'Tool execution failed.', kind: 'UnexpectedError' };
  }
};

export const toolError = (error: McpError): Record<string, unknown> => publicFailure(error);

export const MAX_TOOL_OUTPUT_BYTES = 256 * 1024;

const errorResponse = (data: Record<string, unknown>): ToolResponse => ({
  content: [{ type: 'text', text: JSON.stringify(data) }],
  // Errors have no structuredContent: MCP clients may validate any structured
  // content against the success outputSchema, including when isError is true.
  isError: true,
});

// Count the complete envelope, including both JSON text and structuredContent,
// rather than JS character count or only one of the duplicated payloads.
export const limitToolResponse = (response: ToolResponse): ToolResponse => {
  try {
    if (Buffer.byteLength(JSON.stringify(response), 'utf8') <= MAX_TOOL_OUTPUT_BYTES) {
      return response;
    }
    return errorResponse({ error: 'Tool output exceeded the size limit.', kind: 'OutputTooLarge' });
  } catch {
    return errorResponse({ error: 'Tool execution failed.', kind: 'UnexpectedError' });
  }
};

const cancelledResponse = (): ToolResponse =>
  errorResponse({ error: 'Tool request was cancelled.', kind: 'Cancelled' });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const safeIssuePath = (schema: ZodSchema, path: (string | number)[]): (string | number)[] => {
  const fields = new Set<string>();
  const visit = (node: unknown): void => {
    if (!isRecord(node)) return;
    if (isRecord(node.properties)) {
      for (const key of Object.keys(node.properties)) fields.add(key);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (isRecord(value)) visit(value);
    }
  };
  visit(zodToJsonSchema(schema, { target: 'jsonSchema7', $refStrategy: 'none' }));
  return path.map((part) => (typeof part === 'number' || fields.has(part) ? part : '[field]'));
};

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
        return limitToolResponse(
          errorResponse({
            error: 'ValidationFailed',
            kind: 'ValidationFailed',
            // Zod issues can include received values in messages; retain only
            // fixed error codes and schema-defined paths.
            issues: parsed.error.issues.slice(0, 20).map((issue) => ({
              code: issue.code,
              path: safeIssuePath(schema, issue.path),
            })),
            ...(parsed.error.issues.length > 20 ? { issues_truncated: true } : {}),
          }),
        );
      }
      if (context?.signal.aborted) {
        return cancelledResponse();
      }
      const out = await fn(parsed.data, context);
      // Cooperative handlers may finish or reject after a cancellation was
      // received. Their late output must not become a successful MCP response.
      if (context?.signal.aborted) return cancelledResponse();
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
      return limitToolResponse({
        content: [{ type: 'text', text }],
        structuredContent,
        isError: false,
      });
    } catch {
      if (context?.signal.aborted) return cancelledResponse();
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
  output: options.output,
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
