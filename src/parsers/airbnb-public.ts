import * as cheerio from 'cheerio';
import { type Result, err } from '../lib/result.js';
import { type McpError, parseFailed } from '../lib/errors.js';
import type { Listing, NormalizedQuery } from '../types/airbnb.js';

export const parseSearchResults = (
  html: string,
  _query: NormalizedQuery,
): Result<{ listings: Listing[]; total: number }, McpError> => {
  const $ = cheerio.load(html);
  // Airbnb embeds JSON in a <script id="data-deferred-state-0"> tag
  const scriptText = $('script#data-deferred-state-0').text();
  if (!scriptText) return err(parseFailed('script#data-deferred-state-0', 'search'));
  // Implementation in T44 — this is the skeleton for the test to fail against
  return err(parseFailed('not implemented', 'search'));
};
