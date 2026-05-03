import { request } from 'undici';
import PQueue from 'p-queue';
import { type Result, ok, err } from './result.js';
import { type McpError, rateLimited, upstreamHTTP } from './errors.js';

export interface HttpOptions {
  ratePerSec: number;
  ratePerHour: number;
  userAgent: string;
}

export const createHttpClient = (opts: HttpOptions) => {
  const perSec = new PQueue({ intervalCap: opts.ratePerSec, interval: 1000 });
  const perHour = new PQueue({ intervalCap: opts.ratePerHour, interval: 3_600_000 });

  const get = async (url: string, attempt = 0): Promise<Result<string, McpError>> => {
    return perHour.add(
      () =>
        perSec.add(async () => {
          const jitter = Math.random() * 250;
          await new Promise((r) => setTimeout(r, jitter));
          const res = await request(url, {
            method: 'GET',
            headers: { 'user-agent': opts.userAgent },
          });
          if (res.statusCode === 429) {
            const ra = Number(res.headers['retry-after'] ?? 5) * 1000;
            if (attempt < 3) {
              await new Promise((r) => setTimeout(r, ra));
              return get(url, attempt + 1);
            }
            return err(rateLimited(ra, new URL(url).host));
          }
          if (res.statusCode >= 400) {
            const body = await res.body.text();
            return err(upstreamHTTP(res.statusCode, url, body.slice(0, 200)));
          }
          return ok(await res.body.text());
        }) as Promise<Result<string, McpError>>,
    ) as Promise<Result<string, McpError>>;
  };

  return { get };
};
