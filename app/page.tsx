// / — 참가자 화면 (spec 3.2). 서버 컴포넌트.
// 주소의 z 로 구역을 찾아 결과만 클라이언트 컴포넌트에 넘긴다. 나머지는 components/participant-screen.tsx.
import { ParticipantScreen, type ZoneResult } from "@/components/participant-screen";
import { findZoneByToken } from "@/lib/status-query";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ z?: string }>;
}) {
  const { z } = await searchParams;

  let zone: ZoneResult = { kind: "none" };
  if (z) {
    try {
      const found = await findZoneByToken(z);
      zone = found ? { kind: "valid", code: found.code, name: found.name } : { kind: "invalid" };
    } catch (e) {
      // DB 오류여도 화면은 떠야 한다. 잘못된 QR 안내로 대신한다.
      console.error("[/] findZoneByToken", e);
      zone = { kind: "invalid" };
    }
  }

  return <ParticipantScreen zone={zone} zoneToken={z ?? null} />;
}
