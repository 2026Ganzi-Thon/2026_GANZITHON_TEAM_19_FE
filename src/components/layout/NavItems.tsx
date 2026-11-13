import { NavLink } from 'react-router';

import { cx } from '@/lib/cx';

export interface NavItem {
  to: string;
  label: string;
  /** 정확히 같은 경로일 때만 선택으로 본다 */
  end?: boolean;
}

interface NavProps {
  items: readonly NavItem[];
  label: string;
}

/** 모바일 하단 탭 (TRD 11-1). 노치·홈 바 여백을 확보한다 (18-4). */
export function TabBar({ items, label }: NavProps) {
  return (
    <nav
      aria-label={label}
      className="sticky bottom-0 z-10 flex border-t border-line bg-bg safe-bottom lg:hidden"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cx(
              'relative flex min-h-(--size-tabbar) grow items-center justify-center text-micro',
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
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** 데스크톱(1024px 이상) 좌측 사이드바 (TRD 11-1). */
export function SideNav({ items, label, brand }: NavProps & { brand: string }) {
  return (
    <nav
      aria-label={label}
      className="sticky top-0 hidden h-dvh w-(--size-sidebar) shrink-0 flex-col gap-1 border-r border-line px-6 py-8 lg:flex"
    >
      <p className="mb-6 text-subheading font-bold text-fg">{brand}</p>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cx(
              'flex min-h-(--size-touch) items-center rounded-sm px-3 text-body',
              isActive ? 'bg-brand-yellow font-bold text-fg' : 'text-fg-muted hover:bg-field',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
