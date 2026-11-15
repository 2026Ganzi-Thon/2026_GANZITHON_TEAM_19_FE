import { Outlet } from 'react-router';

/** 로그인 전 화면(A-01~A-03)의 틀. 웹앱 틀(AppFrame) 안을 가득 채운다. */
export function PublicLayout() {
  return (
    <div className="flex grow flex-col">
      <Outlet />
    </div>
  );
}
