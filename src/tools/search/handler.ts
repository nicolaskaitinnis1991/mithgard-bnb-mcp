import type { SearchInputT } from './schema.js';
import { type Result, err } from '../../lib/result.js';
import { type McpError, notImplemented } from '../../lib/errors.js';

export interface SearchParseResult {
  listings: {
    id: string;
    title: string;
    url: string;
    price_per_night: number;
    currency: string;
    location: string;
  }[];
  total: number;
}

export interface SearchDeps {
  http: { get: (url: string) => Promise<Result<string, McpError>> };
  cache: { get: (k: string) => unknown; set: (k: string, v: unknown) => void };
  parse: (html: string, q: SearchInputT) => Result<SearchParseResult, McpError>;
}

export const searchHandler =
  (_deps: SearchDeps) =>
  (_input: SearchInputT): Promise<Result<unknown, McpError>> => {
    return Promise.resolve(err(notImplemented('airbnb_search', 'wired in T49')));
  };
