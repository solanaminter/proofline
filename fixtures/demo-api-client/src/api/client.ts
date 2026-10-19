import { withRetry } from "../utils/retry";
import { ApiError } from "./errors";
import { API_BASE_URL, TIMEOUT_MS } from "../config";

export interface RequestOptions {
  timeoutMs?: number;
}

export class ApiClient {
  constructor(private baseUrl: string = API_BASE_URL) {}

  async get(path: string, opts: RequestOptions = {}): Promise<unknown> {
    return withRetry(async () => {
      const res = await fetch(this.baseUrl + path, {
        signal: AbortSignal.timeout(opts.timeoutMs ?? TIMEOUT_MS),
      });
      if (!res.ok) throw new ApiError(`GET ${path} failed: ${res.status}`, res.status);
      return res.json();
    });
  }

  async post(path: string, body: unknown, opts: RequestOptions = {}): Promise<unknown> {
    return withRetry(async () => {
      const res = await fetch(this.baseUrl + path, {
        method: "POST",
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(opts.timeoutMs ?? TIMEOUT_MS),
      });
      if (!res.ok) throw new ApiError(`POST ${path} failed: ${res.status}`, res.status);
      return res.json();
    });
  }
}
