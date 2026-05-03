import type { ListingDetailsInputT } from './schema.js';
import { type Result, err } from '../../lib/result.js';
import { type McpError, notImplemented } from '../../lib/errors.js';
import type { ListingDetailsParsed } from '../../parsers/airbnb-public.js';

export interface ListingDeps {
  http: { get: (url: string) => Promise<Result<string, McpError>> };
  cache: { get: (k: string) => unknown; set: (k: string, v: unknown) => void };
  parse: (html: string, listingId: string) => Result<ListingDetailsParsed, McpError>;
}

export const listingHandler =
  (_deps: ListingDeps) =>
  async (_input: ListingDetailsInputT): Promise<Result<unknown, McpError>> => {
    await Promise.resolve();
    return err(notImplemented('airbnb_listing_details', 'skeleton'));
  };
