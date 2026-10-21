"use client";
// components/sticky-header.tsx — 스크롤해도 위에 붙어 있는 머리글 (클라이언트)
// 참가자 화면과 참가자 매뉴얼이 함께 쓴다. 머리글은 처음부터 맨 위에 붙어 있으므로,
// 조금이라도 스크롤했을 때를 「고정된 상태」로 보고 그림자를 켠다.
import { useEffect, useState, type ReactNode } from "react";

export function StickyHeader({ className, children }: { className: string; children: ReactNode }) {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <header className={`${className} header-sticky${stuck ? " is-stuck" : ""}`}>{children}</header>;
}
