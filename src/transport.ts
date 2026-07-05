import { failure } from "./errors";
import type {
  ResolvedTmnVoucherClientConfig,
  SdkFailure,
  StatusCode,
  TrueMoneyResponse,
} from "./types";

export type TransportResult<TData> =
  | {
      success: true;
      data: TData;
    }
  | SdkFailure<"NETWORK_ERROR" | "TIMEOUT" | "INVALID_RESPONSE">;

function mergeHeaders(
  config: ResolvedTmnVoucherClientConfig,
  headers?: HeadersInit,
): Headers {
  const mergedHeaders = new Headers(config.headers);

  if (config.userAgent) {
    mergedHeaders.set("User-Agent", config.userAgent);
  }

  if (headers) {
    new Headers(headers).forEach((value, key) => {
      mergedHeaders.set(key, value);
    });
  }

  return mergedHeaders;
}

export async function requestJson<TData>(
  config: ResolvedTmnVoucherClientConfig,
  url: string,
  init: RequestInit = {},
): Promise<TransportResult<TData>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await config.fetch(url, {
      ...init,
      headers: mergeHeaders(config, init.headers),
      signal: controller.signal,
    });

    if (!response.ok) {
      return failure(
        "INVALID_RESPONSE",
        `HTTP ${response.status}: ${response.statusText || "Request failed"}`,
      );
    }

    let json: unknown;

    try {
      json = (await response.json()) as unknown;
    } catch (error) {
      return failure(
        "INVALID_RESPONSE",
        error instanceof Error
          ? error.message
          : "API ไม่ได้ส่งข้อมูลกลับมาเป็น JSON",
      );
    }

    if (!json || typeof json !== "object") {
      return failure("INVALID_RESPONSE", "รูปแบบข้อมูลที่ได้รับจาก API ไม่ถูกต้อง");
    }

    return {
      success: true,
      data: json as TData,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return failure("TIMEOUT", "เชื่อมต่อ API เกินเวลาที่กำหนด");
    }

    return failure(
      "NETWORK_ERROR",
      error instanceof Error ? error.message : "ไม่สามารถเชื่อมต่อ API ได้",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function parseTrueMoneyResponse<TData>(
  response: TrueMoneyResponse<TData>,
) {
  const code = response.status?.code as StatusCode | undefined;
  const message = response.status?.message;

  if (!code || !message) {
    return failure("INVALID_RESPONSE", "รูปแบบสถานะจาก API ไม่ถูกต้อง");
  }

  return {
    success: true as const,
    code,
    message,
    data: response.data,
  };
}
