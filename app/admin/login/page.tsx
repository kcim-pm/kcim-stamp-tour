// /admin/login — 관리자 로그인 페이지 (spec 3.6). 서버 컴포넌트.
// 주소의 next 값을 검사해서 넘기고, 이미 로그인돼 있으면 바로 보낸다.
// 입력란·fetch 같은 상호작용은 ./_components/admin-login-form.tsx(클라이언트)가 맡는다.
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth";
import { isAdminLoggedIn } from "@/lib/admin-session";
import { AdminLoginForm } from "./_components/admin-login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next: rawNext } = await searchParams;
  // 외부 주소면 "/admin" 으로 바뀐다. next 가 여러 번 오면 배열이므로 거부한다.
  const next = safeNextPath(typeof rawNext === "string" ? rawNext : undefined);

  // 로그인 페이지를 북마크해 두고 다시 열었을 때 비밀번호를 또 묻지 않는다.
  if (await isAdminLoggedIn()) redirect(next);

  return (
    <main className="screen">
      <section className="card">
        <h1 className="status-title">관리자 로그인</h1>
        <p className="hint">운영 스태프에게 공유된 관리자 비밀번호를 입력하세요.</p>
        <AdminLoginForm next={next} />
      </section>
    </main>
  );
}
