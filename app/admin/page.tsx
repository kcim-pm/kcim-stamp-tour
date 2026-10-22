// /admin — 관리자 콘솔 (spec 3.3). 서버 컴포넌트.
// 로그인 확인과 화면의 큰 틀만 맡는다. 데이터를 불러오고 버튼에 반응하는 일은 클라이언트 컴포넌트가 한다.
// 첫 화면 데이터를 서버에서 미리 읽어 넘기지 않는다. 어차피 1분마다 API 로 다시 받으므로 읽는 방법을 하나로 둔다.
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-session";
import { AdminConsole } from "./_components/admin-console";
import { DrawSettingsPanel } from "./_components/draw-settings-panel";
import { LogoutButton } from "./_components/logout-button";
import { OpenDrawButton } from "./_components/open-draw-button";
import { PrizeEditor } from "./_components/prize-editor";

export default async function AdminPage() {
  // try 안에서 부르면 안 된다. 페이지 이동이 예외 방식으로 동작해서 catch 에 잡혀 버린다.
  await requireAdminPage("/admin");

  return (
    <main className="console">
      <header className="console-header">
        <h1>관리자 콘솔</h1>
        <nav className="console-actions">
          <OpenDrawButton />
          <a className="btn-ghost" href="#prizes">
            경품 목록
          </a>
          <Link className="btn-ghost" href="/qr">
            QR 인쇄 페이지
          </Link>
          {/* 서버가 내려받기 파일로 응답하므로 링크로 충분하다 */}
          <a className="btn-ghost" href="/api/admin/export">
            CSV 내려받기
          </a>
          <Link className="btn-ghost" href="/admin/manual">
            운영자 가이드
          </Link>
          <LogoutButton />
        </nav>
      </header>
      <AdminConsole />
      <DrawSettingsPanel />
      <PrizeEditor />
    </main>
  );
}
