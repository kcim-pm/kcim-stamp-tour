"use client";

// app/admin/_components/logout-button.tsx — [로그아웃] 버튼 (클라이언트 컴포넌트)
// 쿠키를 지운 뒤 로그인 페이지로 전체 요청 이동한다.
import { useState } from "react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.assign("/admin/login");
    }
  }

  return (
    <button className="btn-small" disabled={busy} onClick={logout}>
      로그아웃
    </button>
  );
}
