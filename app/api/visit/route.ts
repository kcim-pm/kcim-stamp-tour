import { NextResponse, type NextRequest } from "next/server";
import { normalizeParticipantNo } from "@/lib/participant-no";
import { getSupabase } from "@/lib/supabase-server";
import { findZoneByToken, loadStatus } from "@/lib/status-query";

export async function POST(request: NextRequest) {
  // 요청 내용이 JSON이 아니면 잘못된 요청으로 돌려준다.
  let body: { participantNo?: unknown; zoneToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  // 정규화
  let participantNo: number;
  try {
    const raw = body.participantNo;
    participantNo = normalizeParticipantNo(
      typeof raw === "number" || typeof raw === "string" ? raw : "",
    );
  } catch {
    return NextResponse.json({ error: "INVALID_PARTICIPANT_NO" }, { status: 400 });
  }

  const zoneToken = typeof body.zoneToken === "string" ? body.zoneToken : "";
  const supabase = getSupabase();

  try {
    // QR 토큰과 같은 구역을 찾는다. 없는 토큰이면 없는 QR로 돌려준다.
    const zone = await findZoneByToken(zoneToken);
    if (!zone) {
      return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 404 });
    }

    // 이 번호의 참가자가 없으면 새로 만들고, 이미 있으면 기존 기록을 그대로 둔다.
    const { error: participantError } = await supabase
      .from("participants")
      .upsert({ participant_no: participantNo }, { onConflict: "participant_no", ignoreDuplicates: true });
    if (participantError) throw participantError;

    // 이 참가자가 이 구역에 왔다고 기록한다. 같은 구역을 이미 찍었으면 다시 넣지 않는다.
    const { data: inserted, error: visitError } = await supabase
      .from("visits")
      .upsert(
        { participant_no: participantNo, zone_id: zone.id },
        { onConflict: "participant_no,zone_id", ignoreDuplicates: true },
      )
      .select("zone_id");
    if (visitError) throw visitError;
    const alreadyVisited = (inserted?.length ?? 0) === 0;

    // 방금 기록을 반영한 스탬프 현황을 다시 읽어, 구역 정보와 함께 돌려준다.
    const status = await loadStatus(participantNo);
    return NextResponse.json({
      zone: { code: zone.code, name: zone.name },
      alreadyVisited,
      status,
    });
  } catch (e) {
    // 위 데이터베이스 작업 중 하나라도 실패하면 서버 오류로 돌려준다.
    console.error("[POST /api/visit]", e);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }
}
