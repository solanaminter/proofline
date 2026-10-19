// Token-bucket rate limiter. NOTE: not wired into ApiClient yet.
export class RateLimiter {
  private tokens: number;

  constructor(
    private maxTokens: number,
    private refillMs: number
  ) {
    this.tokens = maxTokens;
  }

  async acquire(): Promise<void> {
    while (this.tokens <= 0) {
      await new Promise((r) => setTimeout(r, this.refillMs));
    }
    this.tokens -= 1;
  }

  release(): void {
    this.tokens = Math.min(this.maxTokens, this.tokens + 1);
  }
}
