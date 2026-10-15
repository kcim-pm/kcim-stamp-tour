"use client";
// [인쇄] 버튼. app/qr/page.tsx 는 서버 컴포넌트라 onClick 을 쓸 수 없어 버튼만 따로 뺀다.

export function PrintButton() {
  return (
    <button className="btn no-print" style={{ height: 44, padding: "0 20px" }} onClick={() => window.print()}>
      인쇄
    </button>
  );
}
