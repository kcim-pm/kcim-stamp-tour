import { NextResponse, type NextRequest } from "next/server";
import { normalizeParticipantNo } from "@/lib/participant-no";
import { loadStatus } from "@/lib/status-query";

// GET /api/status?no={참가번호} — 스탬프 현황 조회
export async function GET(request: NextRequest) {
  let participantNo: number;
  try {
    participantNo = normalizeParticipantNo(request.nextUrl.searchParams.get("no") ?? "");
  } catch {
    return NextResponse.json({ error: "INVALID_PARTICIPANT_NO" }, { status: 400 });
  }

  try {
    const status = await loadStatus(participantNo);
    return NextResponse.json(status);
  } catch (e) {
    console.error("[GET /api/status]", e);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }
}
