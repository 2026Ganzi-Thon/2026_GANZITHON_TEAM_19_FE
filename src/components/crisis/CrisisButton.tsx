import phoneIcon from '@/assets/icons/phone.svg';
import { CRISIS } from '@/copy/fixed';
import { track } from '@/lib/analytics';
import { cx } from '@/lib/cx';
import { useCrisisStore } from '@/stores/crisisStore';

interface CrisisButtonProps {
  /** 로그인 전 화면에서는 '도움말'로 보인다 */
  label?: string;
  withIcon?: boolean;
  /** 로그인 전 화면의 도움말은 보조 글자색으로 차분하게 둔다 */
  muted?: boolean;
}

/** 언제든 위기 자원을 여는 버튼 (TRD 11-1). */
export function CrisisButton({
  label = CRISIS.button,
  withIcon = true,
  muted = false,
}: CrisisButtonProps) {
  const show = useCrisisStore((state) => state.show);

  return (
    <button
      type="button"
      onClick={() => {
        show({ source: 'manual' });
        track('crisis_modal_opened', { source: 'manual' });
      }}
      className={cx(
        'inline-flex min-h-(--size-touch) items-center gap-1.5 text-caption',
        muted ? 'font-medium text-fg-muted' : 'font-bold text-fg',
      )}
    >
      {withIcon && <img src={phoneIcon} alt="" width={16} height={16} />}
      {label}
    </button>
  );
}
