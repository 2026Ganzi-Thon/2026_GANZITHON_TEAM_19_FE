import { describe, expect, it } from 'vitest';

import { ApiError, isApiError, NETWORK_ERROR, toApiError, UNKNOWN_ERROR } from './errors';

function axiosFailure(status: number, data: unknown, headers: Record<string, string> = {}) {
  return { response: { status, data, headers } };
}

describe('toApiError', () => {
  it('reads the backend error envelope', () => {
    const error = toApiError(
      axiosFailure(409, {
        error: {
          code: 'SLOT_TAKEN',
          message: '이미 예약된 시간입니다',
          details: {},
          request_id: 'req_1',
        },
      }),
    );

    expect(error).toMatchObject({ status: 409, code: 'SLOT_TAKEN', requestId: 'req_1' });
  });

  it('exposes field errors from a validation failure', () => {
    const error = toApiError(
      axiosFailure(422, {
        error: { code: 'VALIDATION_ERROR', details: { fields: { nickname: '2~12자', age: 3 } } },
      }),
    );

    expect(error.fields).toEqual({ nickname: '2~12자' });
  });

  it('treats a missing response as a network error', () => {
    expect(toApiError(new Error('timeout')).code).toBe(NETWORK_ERROR);
  });

  it('falls back to an unknown code when the body is not the envelope', () => {
    expect(toApiError(axiosFailure(502, '<html>bad gateway</html>')).code).toBe(UNKNOWN_ERROR);
  });

  it('keeps the retry-after seconds of a rate limit response', () => {
    const error = toApiError(
      axiosFailure(429, { error: { code: 'RATE_LIMITED' } }, { 'retry-after': '12' }),
    );

    expect(error.retryAfterSeconds).toBe(12);
  });

  it('returns an ApiError unchanged', () => {
    const original = new ApiError({ status: 404, code: 'NOT_FOUND' });

    expect(toApiError(original)).toBe(original);
    expect(isApiError(original, 'NOT_FOUND')).toBe(true);
    expect(isApiError(original, 'SLOT_TAKEN')).toBe(false);
  });
});
