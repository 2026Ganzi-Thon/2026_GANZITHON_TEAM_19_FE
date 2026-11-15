import { isApiError } from '@/api/errors';
import { errorCopy } from '@/copy/errorMessages';
import { showToast } from '@/stores/uiStore';

/** 어드민 조치가 실패하면 오류 코드에 맞는 문구를 토스트로 보여 준다 */
export function toastApiError(error: unknown): void {
  showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
}
