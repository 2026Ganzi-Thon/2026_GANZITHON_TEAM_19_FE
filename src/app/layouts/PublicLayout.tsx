import { Outlet } from 'react-router';

/** 로그인 전 화면(A-01~A-03)의 틀. */
export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Outlet />
    </div>
  );
}
