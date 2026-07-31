export interface RateLimitWindowSchema {
  limit: number; // Max requests allowed in window
  remaining: number; // Remaining requests available
  reset: number; // Seconds until reset
}

export interface RateLimitScopeSchema {
  second?: RateLimitWindowSchema | null;
  minute?: RateLimitWindowSchema | null;
  hour?: RateLimitWindowSchema | null;
  day?: RateLimitWindowSchema | null;
}

export interface RateLimitsDataSchema {
  account: RateLimitScopeSchema;
  data: RateLimitScopeSchema;
  action: RateLimitScopeSchema;
  simulation: RateLimitScopeSchema; // Combat simulation rate limit
  assistant?: RateLimitScopeSchema | null;
}

export interface RateLimitsResponseSchema {
  data: RateLimitsDataSchema;
}
