"use client";

// app/admin/login/_components/admin-login-form.tsx — 로그인 입력란과 버튼 (클라이언트 컴포넌트)
// 이 페이지만 쓰므로 공용 components/ 가 아니라 페이지 옆 _components/ 에 둔다 (_ 폴더는 라우트가 되지 않는다)
// 아이디 입력란과 비밀번호 보기 토글은 없다 (공용 비밀번호 1개, D-12)
import { useState, type FormEvent } from "react";

type LoginError = "wrong" | "network" | null;

// next 는 서버에서 이미 검사된 값이다.
export function AdminLoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<LoginError>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 204) {
        // 이동한 페이지가 서버 컴포넌트에서 쿠키를 다시 읽어야 하므로 router.replace 대신 전체 요청으로 이동한다.
        window.location.assign(next);
        return;
      }
      setError(res.status === 401 ? "wrong" : "network");
    } catch {
      setError("network");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label className="label" htmlFor="admin-password">
        비밀번호
      </label>
      <input
        id="admin-password"
        className="input-no"
        style={{ fontSize: 20 }}
        type="password"
        autoComplete="current-password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error === "wrong" && <div className="banner banner-error">비밀번호가 틀립니다</div>}
      {error === "network" && <div className="banner banner-error">연결에 실패했습니다. 다시 시도해 주세요</div>}
      <button className="btn" type="submit" disabled={busy || password === ""}>
        로그인
      </button>
    </form>
  );
}
