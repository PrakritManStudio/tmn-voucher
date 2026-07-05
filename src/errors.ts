import type { SdkFailure, StatusCode } from "./types";

export function failure<TCode extends Exclude<StatusCode, "SUCCESS">>(
  code: TCode,
  message: string,
  data?: unknown,
): SdkFailure<TCode> {
  return {
    success: false,
    code,
    message,
    ...(data !== undefined ? { data } : {}),
  };
}
