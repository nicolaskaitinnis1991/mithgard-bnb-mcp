import type { ZodSchema } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON-Schema for MCP
  schema: ZodSchema; // Zod runtime check
  handler: (input: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>;
}

export const wrapHandler =
  <T>(schema: ZodSchema<T>, fn: (input: T) => Promise<unknown>) =>
  async (raw: unknown) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: 'ValidationFailed', issues: parsed.error.issues }),
          },
        ],
      };
    }
    const out = await fn(parsed.data);
    return { content: [{ type: 'text' as const, text: JSON.stringify(out) }] };
  };
