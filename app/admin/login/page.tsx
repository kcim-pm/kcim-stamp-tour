// /admin/login — 관리자 로그인 페이지 (서버 컴포넌트)
//
// 역할: 주소의 next 값을 검사해서 넘기고, 이미 로그인돼 있으면 바로 보낸다.
// 입력란·fetch 같은 상호작용은 ./_components/admin-login-form.tsx(클라이언트)가 맡는다.
// app/page.tsx 가 토큰을 찾아 participant-screen 에 넘기는 구조와 같다.

// searchParams: Promise<{ next?: string }>  (Next 16 은 await 필요)

// 1. next = safeNextPath(searchParams.next)   ← 외부 주소면 "/admin" 으로 바뀐다
// 2. 이미 로그인 상태(isAdminLoggedIn)면 redirect(next)
//    - 로그인 페이지를 북마크해 두고 다시 열었을 때 비밀번호를 또 묻지 않는다
// 3. 아니면 <AdminLoginForm next={next} /> 를 그린다
//    - 제목 「관리자 로그인」, 안내 한 줄. 참가자 화면과 같은 globals.css 토큰·.card 를 쓴다

export default function AdminLoginPage() {
  return null; // 자리 표시자. 구현 시 교체
}
