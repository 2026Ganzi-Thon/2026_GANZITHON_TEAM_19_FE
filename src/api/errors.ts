import type { AxiosError } from 'axios';

export const NETWORK_ERROR = 'NETWORK_ERROR';
export const UNKNOWN_ERROR = 'UNKNOWN_ERROR';

export type FieldErrors = Record<string, string>;

interface ApiErrorInit {
  status: number;
  code: string;
  message?: string;
  details?: Record<string, unknown>;
  requestId?: string;
  retryAfterSeconds?: number;
}

/** 백엔드 공통 오류 형식을 옮긴 것 (TRD 17-2). 화면은 code 로 분기한다. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;
  readonly requestId: string | undefined;
  readonly retryAfterSeconds: number | undefined;

  constructor(init: ApiErrorInit) {
    super(init.message ?? init.code);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details ?? {};
    this.requestId = init.requestId;
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  /** 422 응답의 필드별 오류 (TRD 17-7). */
  get fields(): FieldErrors {
    const fields = this.details.fields;
    if (!isRecord(fields)) return {};
    return Object.fromEntries(
      Object.entries(fields).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const response = (error as AxiosError | undefined)?.response;
  if (!response) return new ApiError({ status: 0, code: NETWORK_ERROR });

  const data: unknown = response.data;
  const body = isRecord(data) && isRecord(data.error) ? data.error : undefined;
  const retryAfter = Number(response.headers?.['retry-after']);
  return new ApiError({
    status: response.status,
    code: typeof body?.code === 'string' ? body.code : UNKNOWN_ERROR,
    message: typeof body?.message === 'string' ? body.message : undefined,
    details: isRecord(body?.details) ? body.details : undefined,
    requestId: typeof body?.request_id === 'string' ? body.request_id : undefined,
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  });
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
