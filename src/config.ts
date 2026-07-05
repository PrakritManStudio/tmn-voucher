import {
  DEFAULT_BASE_API_URL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
} from "./constants";
import type {
  FetchLike,
  ResolvedTmnVoucherClientConfig,
  TmnVoucherClientConfig,
} from "./types";

function getDefaultFetch(): FetchLike {
  if (typeof fetch !== "function") {
    return async () => {
      throw new Error(
        "Fetch API is not available. Pass a custom fetch implementation in TmnVoucherClient config.",
      );
    };
  }

  return fetch.bind(globalThis) as FetchLike;
}

function normalizeBaseApiUrl(baseApiUrl: string): string {
  return baseApiUrl.replace(/\/+$/, "");
}

export function resolveConfig(
  config: TmnVoucherClientConfig = {},
): ResolvedTmnVoucherClientConfig {
  return {
    baseApiUrl: normalizeBaseApiUrl(
      config.baseApiUrl ?? DEFAULT_BASE_API_URL,
    ),
    userAgent: config.userAgent ?? DEFAULT_USER_AGENT,
    headers: config.headers ?? {},
    fetch: config.fetch ?? getDefaultFetch(),
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
}
