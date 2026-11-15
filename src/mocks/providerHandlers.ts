import { http, HttpResponse } from 'msw';

import type { Schema } from '@/api/types';

import { mockDb } from './db';
import { currentUid, currentUser, errorResponse, notFound, unauthenticated, url } from './http';

// 공급자 프로필·자격 목 API (USR-06, CRD-01~05)
// - 자격번호가 0000 으로 끝나면 불일치(422), 9999 로 끝나면 확인 서비스 장애(503)를 돌려준다
const NO_CONTENT = 204;
const UPLOAD_PATH = '/mock-upload';
const MISMATCH_SUFFIX = '0000';
const UNAVAILABLE_SUFFIX = '9999';
const MASK_VISIBLE = 2;

type Credential = Schema<'CredentialResponse'>;

/** 사용자 ID → 등록한 서류 */
const credentials = new Map<string, Credential[]>();

function mask(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return `${'*'.repeat(Math.max(0, value.length - MASK_VISIBLE))}${value.slice(-MASK_VISIBLE)}`;
}

export const providerHandlers = [
  http.put(url('/me/provider-profile'), async ({ request }) => {
    const uid = currentUid(request);
    const me = currentUser(request);
    if (!uid || !me) return unauthenticated();
    const body = (await request.json()) as Schema<'ProviderProfileRequest'>;
    const profile: Schema<'ProviderProfileResponse'> = {
      track: me.role === 'expert' ? 'expert' : 'trainee',
      display_name: body.display_name,
      real_name: body.real_name,
      service_label: body.service_label,
      specialties: body.specialties,
      bio: body.bio,
      career: body.career,
      school: body.school,
      accepts_supervision: body.accepts_supervision,
    };
    mockDb.users.set(uid, { ...me, provider_profile: profile });
    return HttpResponse.json(profile);
  }),

  http.post(url('/me/credentials/upload-url'), ({ request }) => {
    if (!currentUser(request)) return unauthenticated();
    const fileKey = `credentials/${crypto.randomUUID()}`;
    const target: Schema<'UploadUrlResponse'> = {
      upload_url: url(`${UPLOAD_PATH}/${fileKey}`),
      file_key: fileKey,
      expires_in: 300,
    };
    return HttpResponse.json(target);
  }),

  http.put(url(`${UPLOAD_PATH}/*`), () => new HttpResponse(null, { status: NO_CONTENT })),

  http.get(url('/me/credentials'), ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    return HttpResponse.json(credentials.get(me.id ?? '') ?? []);
  }),

  http.post(url('/me/credentials/submit'), ({ request }) => {
    const uid = currentUid(request);
    const me = currentUser(request);
    if (!uid || !me) return unauthenticated();
    const mine = credentials.get(me.id ?? '') ?? [];
    const pending = mine.filter((item) => item.status === 'draft' || item.status === 'rejected');
    credentials.set(
      me.id ?? '',
      mine.map((item) => (pending.includes(item) ? { ...item, status: 'submitted' } : item)),
    );
    mockDb.users.set(uid, { ...me, status: 'pending_review' });
    const result: Schema<'SubmitResponse'> = {
      submitted_count: pending.length,
      user_status: 'pending_review',
    };
    return HttpResponse.json(result);
  }),

  http.post(url('/me/credentials'), async ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const body = (await request.json()) as Schema<'CredentialCreateRequest'>;
    if (body.verify && body.cert_number?.endsWith(MISMATCH_SUFFIX)) {
      return errorResponse(422, 'CREDENTIAL_MISMATCH', '자격 정보가 일치하지 않습니다');
    }
    if (body.verify && body.cert_number?.endsWith(UNAVAILABLE_SUFFIX)) {
      return errorResponse(503, 'VERIFIER_UNAVAILABLE', '자격 확인 서비스에 연결할 수 없습니다');
    }
    const credential: Credential = {
      id: crypto.randomUUID(),
      kind: body.kind,
      cert_name: body.cert_name,
      cert_number_masked: mask(body.cert_number),
      issued_on: body.issued_on ?? (body.kind === 'society' ? '2022-03-02' : undefined),
      has_file: Boolean(body.file_key),
      verify_method: body.verify ? 'api' : body.file_key ? 'ocr' : 'manual',
      verify_result: body.verify ? 'match' : 'none',
      user_corrected: false,
      status: 'draft',
    };
    credentials.set(me.id ?? '', [...(credentials.get(me.id ?? '') ?? []), credential]);
    return HttpResponse.json(credential, { status: 201 });
  }),

  http.patch(url('/me/credentials/:credentialId'), async ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const mine = credentials.get(me.id ?? '') ?? [];
    const target = mine.find((item) => item.id === params.credentialId);
    if (!target) return notFound();
    const body = (await request.json()) as Schema<'CredentialUpdateRequest'>;
    const updated: Credential = {
      ...target,
      cert_name: body.cert_name ?? target.cert_name,
      cert_number_masked: mask(body.cert_number) ?? target.cert_number_masked,
      issued_on: body.issued_on ?? target.issued_on,
      user_corrected: true,
    };
    credentials.set(
      me.id ?? '',
      mine.map((item) => (item === target ? updated : item)),
    );
    return HttpResponse.json(updated);
  }),
];
