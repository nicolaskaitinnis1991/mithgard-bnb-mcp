// JSON walker utilities — defensive traversal of truly-unknown JSON shapes.
//
// Airbnb's embedded GraphQL response (in `<script id="data-deferred-state-0">`)
// rotates its key/value layout between deploys: keys appear, vanish, or move
// down the tree without warning. A statically-typed view of that JSON would be
// a lie. Instead we walk it with these three helpers, each of which fails
// quietly (returns `undefined` / skips) on any unexpected shape so the parser
// caller can decide whether to fall back to another strategy.
//
// The `eslint-disable` directives below are deliberate and **contained to this
// file only**. Walking foreign JSON whose schema can change without notice
// requires structural type loosening (`any` for dynamic property access). All
// downstream code (e.g. `src/parsers/airbnb-public.ts`) stays strict-clean:
// these helpers expose `unknown` to callers.
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * Walk a property-key path through unknown JSON, returning `undefined` on any
 * missing/null step. Never throws.
 *
 * @example
 * drill(json, ['data', 'presentation', 'staysSearch', 'results']);
 */
export const drill = (node: unknown, path: readonly string[]): unknown => {
  let cur: any = node;
  for (const key of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[key];
  }
  return cur as unknown;
};

/**
 * Recursively search `node` for the first object that contains `key` as an own
 * property. Returns the *value* at that key (not the parent object). Returns
 * `undefined` if no such object exists. Depth-first traversal, arrays first.
 *
 * @example
 * findFirstKey(json, 'bookingPdpSections'); // -> the sections payload
 */
export const findFirstKey = (node: unknown, key: string): unknown => {
  if (node === null || node === undefined) return undefined;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findFirstKey(n, key);
      if (r !== undefined) return r;
    }
    return undefined;
  }
  if (typeof node !== 'object') return undefined;
  const obj = node as Record<string, unknown>;
  if (key in obj) return obj[key];
  for (const v of Object.values(obj)) {
    const r = findFirstKey(v, key);
    if (r !== undefined) return r;
  }
  return undefined;
};

/**
 * Walk `node` recursively, calling `visit(obj)` for every object reached.
 * Visitor may have side effects (e.g. push into an accumulator). Arrays and
 * primitives are traversed but not passed to `visit`. Never throws.
 *
 * @example
 * const acc: Listing[] = [];
 * walkObjects(json, (obj) => { if (looksLikeListing(obj)) acc.push(toListing(obj)); });
 */
export const walkObjects = (node: unknown, visit: (obj: Record<string, unknown>) => void): void => {
  if (Array.isArray(node)) {
    for (const item of node) walkObjects(item, visit);
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  const obj = node as Record<string, unknown>;
  visit(obj);
  for (const value of Object.values(obj)) walkObjects(value, visit);
};

/* eslint-enable @typescript-eslint/no-explicit-any */
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
/* eslint-enable @typescript-eslint/no-unsafe-member-access */
