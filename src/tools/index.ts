import type { ToolDefinition } from './registry.js';
import { buildSearchTool } from './search/tool.js';
import type { SearchDeps } from './search/handler.js';

export interface AppDeps {
  search: SearchDeps;
}

export const allTools = (deps: AppDeps): ToolDefinition[] => [buildSearchTool(deps.search)];
