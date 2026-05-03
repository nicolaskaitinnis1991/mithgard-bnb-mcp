import { randomBytes } from 'node:crypto';
export const newRequestId = (): string => randomBytes(8).toString('hex');
