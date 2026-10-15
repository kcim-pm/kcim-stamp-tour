// /admin — 관리자 콘솔 (spec 3.3). 서버 컴포넌트.
// 지금은 로그인 보호와 최소 이동 버튼만 있다. 통계·참가자 목록·추첨은 이후 작업에서 채운다.
//
// ── 의사 코드 (작업 8, 아직 구현 전) ───────────────────────────────
// 【이 페이지가 하는 일】
//   로그인 확인과 화면의 큰 틀만 맡는다. 데이터를 불러오고 버튼에 반응하는 일은 클라이언트 컴포넌트가 한다.
//
// 【처리 순서】
//   1. 로그인했는지 확인한다 (requireAdminPage). 안 했으면 로그인 페이지로 보낸다.
//      try 안에서 부르면 안 된다. 페이지 이동이 예외 방식으로 동작해서 catch 에 잡혀 버린다.
//   2. 화면 틀을 그린다. 노트북 화면에 맞는 넓은 틀이다 (참가자 화면의 휴대폰 폭 틀과 다르다).
//      ① 머리글: 「관리자 콘솔」 제목과 상단 버튼 5개 (spec 3.3 순서)
//         - [발표 화면 열기]: 새 창으로 발표 화면을 연다 (open-draw-button)
//         - [경품 목록]: 같은 페이지 아래의 경품 목록 영역으로 이동한다
//         - [QR 인쇄 페이지]: /qr 로 이동한다
//         - [CSV 내려받기]: CSV API 주소로 가는 링크. 서버가 「내려받기 파일」로 응답하므로 링크로 충분하다
//         - [로그아웃]: 이미 있는 버튼
//      ② 통계·자동 갱신·참가자 목록 영역 (admin-console)
//      ③ 경품 목록 영역 (prize-editor)
//
// 【이렇게 정한 이유】
//   첫 화면 데이터를 서버에서 미리 읽어 넘기지 않는다. 어차피 1분마다 API 로 다시 받으므로 읽는 방법을 하나로 둔다.
//   처음에 잠깐 「불러오는 중」이 보이는 것은 콘솔에서는 문제가 되지 않는다.
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-session";
import { LogoutButton } from "./_components/logout-button";

export default async function AdminPage() {
  await requireAdminPage("/admin");

  return (
    <main className="screen">
      <header className="header">
        <span className="header-title">
          관리자 <em>콘솔</em>
        </span>
        <LogoutButton />
      </header>
      <section className="card">
        <p className="hint">콘솔 기능은 준비 중입니다.</p>
        <Link className="btn" href="/qr" style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          QR 인쇄 페이지
        </Link>
      </section>
    </main>
  );
}
