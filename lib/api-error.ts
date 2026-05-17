import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "VALIDATION_FAILED"
  | "AI_PARSE_ERROR"
  | "INTERNAL_ERROR"
  | "INVALID_ORIGIN"
  | "MISSING_CONFIG";

type ApiErrorResponse = {
  error: string;
  code: ApiErrorCode;
  retryAfter?: number;
};

export function apiError(
  message: string,
  code: ApiErrorCode,
  status: number,
  retryAfter?: number
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { error: message, code, retryAfter },
    { status }
  );
}
