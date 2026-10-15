import { headers } from "next/headers";
import QRCode from "qrcode";
import { PrintButton } from "./_components/print-button";
import { requireAdminPage } from "@/lib/admin-session";
import { loadZonesWithToken } from "@/lib/status-query";

// /qr — QR 인쇄 페이지 (spec 3.5). 관리자 로그인이 필요하다(3.6).

// D-01 로 고정된 운영 주소. QR 에 들어가므로 환경변수가 아니라 상수로 둔다.
const PRODUCTION_URL = "https://bimlizecon2026.netlify.app";

async function resolveSiteUrl(): Promise<{ url: string; isProduction: boolean }> {
  if (process.env.CONTEXT === "production") return { url: PRODUCTION_URL, isProduction: true };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return { url: PRODUCTION_URL, isProduction: true };

  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || /^\d/.test(host) ? "http" : "https");
  return { url: `${proto}://${host}`, isProduction: false };
}

export default async function QrPage() {
  // 쿠키가 없거나 만료·위조면 /admin/login?next=%2Fqr 로 보내지고, 로그인 뒤 다시 /qr 로 돌아온다.
  await requireAdminPage("/qr");

  const [{ url: siteUrl, isProduction }, zones] = await Promise.all([resolveSiteUrl(), loadZonesWithToken()]);
  const sheets = await Promise.all(
    zones.map(async (z) => ({
      ...z,
      svg: await QRCode.toString(`${siteUrl}/?z=${z.qr_token}`, {
        type: "svg",
        margin: 1,
        color: { dark: "#2b2550", light: "#ffffff" },
      }),
    })),
  );

  return (
    <main className="qr-page">
      <div className="qr-toolbar no-print">
        <div>
          <h1>QR 포스터 · 구역 {sheets.length}곳</h1>
          <div className="hint-small" style={{ textAlign: "left" }}>
            QR 주소: {siteUrl}
            {!isProduction && " (운영 아님 · 검증용)"}
          </div>
        </div>
        <PrintButton />
      </div>
      {sheets.map((s) => (
        <section key={s.id} className="qr-sheet">
          <div className="event">KCIM BIMlize Con 2026 스탬프 투어</div>
          <h2>{s.name}</h2>
          <div className="qr-box" dangerouslySetInnerHTML={{ __html: s.svg }} />
          <ol className="qr-steps">
            <li>
              <span className="n">1</span>이 QR을 스캔하세요
            </li>
            <li>
              <span className="n">2</span>명찰의 참가번호를 입력하세요
            </li>
            <li>
              <span className="n">3</span>[방문 인증하기]를 누르세요
            </li>
          </ol>
        </section>
      ))}
    </main>
  );
}
