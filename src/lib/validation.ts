import { z } from 'zod';

/** Date.parse normalizes impossible dates; require an exact round trip. */
export const isRealDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
};

export const isoDate = z.string().max(10).refine(isRealDate, 'Expected a real YYYY-MM-DD date');
export const boundedId = z.string().trim().min(1).max(200);
export const currentUtcDate = (): string => new Date().toISOString().slice(0, 10);

export const isoDatetime = z
  .string()
  .max(35)
  .refine((value) => {
    const match =
      /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(
        value,
      );
    if (!match || !isRealDate(match[1] ?? '')) return false;
    if (Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4] ?? 0) > 59) return false;
    const offset = match[5] ?? '';
    if (offset !== 'Z' && (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4, 6)) > 59))
      return false;
    return Number.isFinite(Date.parse(value));
  }, 'Expected a real ISO datetime with timezone (Z or explicit offset)');

export const validateStay = (
  value: { checkin?: string | undefined; checkout?: string | undefined },
  context: z.RefinementCtx,
): void => {
  if ((value.checkin === undefined) !== (value.checkout === undefined)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['checkout'],
      message: 'Provide both checkin and checkout',
    });
  } else if (
    value.checkin !== undefined &&
    value.checkout !== undefined &&
    value.checkout <= value.checkin
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['checkout'],
      message: 'Checkout must be after checkin',
    });
  }
};
