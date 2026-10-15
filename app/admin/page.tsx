// /admin — 관리자 콘솔 (spec 3.3). 서버 컴포넌트.
// 지금은 로그인 보호와 최소 이동 버튼만 있다. 통계·참가자 목록·추첨은 이후 작업에서 채운다.
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
