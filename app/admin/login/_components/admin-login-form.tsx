"use client";

// app/admin/login/_components/admin-login-form.tsx — 로그인 입력란과 버튼 (클라이언트 컴포넌트)
// 이 페이지만 쓰므로 공용 components/ 가 아니라 페이지 옆 _components/ 에 둔다 (_ 폴더는 라우트가 되지 않는다)
//
// props: { next: string }   ← 로그인 성공 뒤 갈 경로. 서버에서 이미 검사된 값

// 상태
//   password: 입력값
//   error:    "wrong" | "network" | null
//   busy:     요청 중이면 버튼 잠금

// 제출(submit)
//   1. 기본 submit 동작을 막는다 (페이지 새로고침 방지)
//   2. busy = true, error = null
//   3. POST /api/admin/login  body { password }
//   4. 204 → 쿠키가 붙었으므로 next 로 이동
//        - router.replace(next) 대신 window.location.assign(next) 를 쓴다
//          이유: 이동한 페이지가 서버 컴포넌트에서 쿠키를 다시 읽어야 하므로 전체 요청이 필요
//      401 → error = "wrong"  (「비밀번호가 틀립니다」)
//      그 외/throw → error = "network" (「연결에 실패했습니다. 다시 시도해 주세요」)
//   5. busy = false

// 화면
//   <form> 안에 type="password" 입력란 하나(autoFocus), [로그인] 버튼.
//   error 가 있으면 입력란 아래에 빨간 문구(참가자 화면의 .banner-error 재사용).
//   비밀번호 보기 토글, 아이디 입력란은 없다 (공용 비밀번호 1개, D-12)

export function AdminLoginForm({ next }: { next: string }) {
  void next;
  return null; // 자리 표시자. 구현 시 교체
}
