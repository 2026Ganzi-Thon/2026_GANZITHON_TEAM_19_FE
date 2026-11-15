import { NavLink } from 'react-router';

import { cx } from '@/lib/cx';

export interface NavItem {
  to: string;
  label: string;
  /** 정확히 같은 경로일 때만 선택으로 본다 */
  end?: boolean;
  /** 0보다 크면 이름 옆에 수를 보여 준다 (읽지 않은 알림) */
  badge?: number;
}

interface NavProps {
  items: readonly NavItem[];
  label: string;
}

/** 하단 탭. 웹앱 틀 안에서 화면 아래에 붙고, 노치·홈 바 여백을 확보한다 (TRD 18-4). */
export function TabBar({ items, label }: NavProps) {
  return (
    <nav
      aria-label={label}
      className="sticky bottom-0 z-10 flex shrink-0 border-t border-line bg-bg safe-bottom"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cx(
              'relative flex min-h-(--size-tabbar) grow items-center justify-center gap-1 text-micro',
              isActive ? 'font-bold text-fg' : 'text-fg-muted',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span aria-hidden="true" className="absolute top-0 h-0.5 w-9 bg-brand-green" />
              )}
              {item.label}
              {item.badge ? (
                <span className="rounded-full bg-danger px-1.5 font-bold text-fg-inverse">
                  {item.badge}
                </span>
              ) : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
