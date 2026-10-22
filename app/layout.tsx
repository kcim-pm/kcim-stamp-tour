import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KCIM BIMlize Con 2026 스탬프 투어",
  description: "행사장 구역을 돌며 스탬프를 모으고 경품 추첨에 응모하세요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={notoSansKr.className}>
      <body>{children}</body>
    </html>
  );
}
