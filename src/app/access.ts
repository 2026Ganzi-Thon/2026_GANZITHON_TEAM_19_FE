import type { AccountStatus, Role } from '@/api/types';

export const ROLE_HOME: Record<Role, string> = {
  client: '/c',
  trainee: '/t',
  expert: '/e',
  admin: '/admin',
};

export function roleHome(role: Role | undefined): string {
  return role ? ROLE_HOME[role] : '/';
}

/**
 * 계정 상태별로 열 수 있는 화면 범위 (TRD 11-1).
 * full: 일반 화면 / profile: 프로필·자격 화면 / readonly: 대시보드·내역 조회 / status: A-04
 */
export type AccessScope = 'full' | 'profile' | 'readonly' | 'status';

const ALLOWED_SCOPES: Record<AccountStatus, readonly AccessScope[]> = {
  active: ['full', 'profile', 'readonly', 'status'],
  // 예약만 서버가 막는다 (403 CLIENT_RESTRICTED). 조회는 그대로 된다
  restricted: ['full', 'profile', 'readonly', 'status'],
  pending_review: ['profile', 'status'],
  rejected: ['profile', 'status'],
  suspended: ['readonly', 'status'],
  banned: ['status'],
  withdrawn: ['status'],
};

export function canAccess(status: AccountStatus | undefined, scope: AccessScope): boolean {
  return status ? ALLOWED_SCOPES[status].includes(scope) : false;
}

/**
 * 로그인 후 돌아갈 경로. 같은 출처의 내부 경로만 받는다 (TRD 11-3 오픈 리다이렉트 방지).
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  return next;
}

export function loginPath(currentPath: string): string {
  return currentPath === '/' ? '/login' : `/login?next=${encodeURIComponent(currentPath)}`;
}
