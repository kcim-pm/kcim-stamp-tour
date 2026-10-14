// /qr — QR 인쇄 페이지 (spec 3.5, A-02, A-03). 서버 컴포넌트.
// TODO(10/15): lib/auth 가 생기면 맨 위에서 관리자 세션을 검증하고 없으면 /admin 으로 redirect.
//              운영 배포(main 병합) 전에는 반드시 막는다.
import QRCode from "qrcode";
import { PrintButton } from "@/components/print-button";
import { loadZonesWithToken } from "@/lib/status-query";

// D-01 로 고정된 운영 주소. QR 에 들어가므로 환경변수가 아니라 상수로 둔다.
const SITE_URL = "https://bimlizecon2026.netlify.app";

export default async function QrPage() {
  const zones = await loadZonesWithToken();
  const sheets = await Promise.all(
    zones.map(async (z) => ({
      ...z,
      svg: await QRCode.toString(`${SITE_URL}/?z=${z.qr_token}`, {
        type: "svg",
        margin: 1,
        color: { dark: "#2b2550", light: "#ffffff" },
      }),
    })),
  );

  return (
    <main className="qr-page">
      <div className="qr-toolbar no-print">
        <h1>QR 포스터 · 구역 {sheets.length}곳</h1>
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
