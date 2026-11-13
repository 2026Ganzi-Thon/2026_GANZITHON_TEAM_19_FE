import axios, { type AxiosError } from 'axios';

import { getIdToken } from '@/lib/auth';
import { env } from '@/lib/env';

import { type ApiError, toApiError } from './errors';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retried?: boolean;
  }
}

const REQUEST_TIMEOUT_MS = 15_000;

export const api = axios.create({ baseURL: env.apiBaseUrl, timeout: REQUEST_TIMEOUT_MS });

type ApiErrorListener = (error: ApiError) => void;
const listeners = new Set<ApiErrorListener>();

/** 모든 API 오류를 한 곳에서 듣는다 (점검 모드, 계정 상태 제한, 세션 만료 처리용). */
export function onApiError(listener: ApiErrorListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

api.interceptors.request.use(async (config) => {
  const token = await getIdToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Request-ID'] = crypto.randomUUID();
  return config;
});

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config;
  // 토큰 만료 → 강제 갱신 후 1회 재시도 (TRD 17-2)
  if (error.response?.status === 401 && config && !config._retried) {
    config._retried = true;
    const token = await getIdToken(true);
    if (token) return api(config);
  }
  const apiError = toApiError(error);
  listeners.forEach((listener) => listener(apiError));
  throw apiError;
});

/** 예약·결제 POST에 붙이는 멱등 키 헤더 (TRD 17-2). 폼 단위로 한 번 만든 키를 넘긴다. */
export function idempotencyHeader(key: string): { 'Idempotency-Key': string } {
  return { 'Idempotency-Key': key };
}
