import { randomInt } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { apiError, toErrorResponse } from "@/lib/api-error";
import {
  loadCandidates,
  loadCompletedNos,
  loadDraw,
  loadDraws,
  loadTargetedNos,
  toDrawResponse,
  toDrawRow,
} from "@/lib/admin-query";
import { drawWinnersWithTargets } from "@/lib/draw";
import { assertCanStartDraw } from "@/lib/draw-state";
import { getSupabase } from "@/lib/supabase-server";
import { DbError } from "@/lib/status-query";

// GET·POST /api/admin/draws — 추첨 이력 조회, 추첨 실행 (spec 5.3, A-10, A-11, A-13, A-18)

// 발표 화면이 열릴 때, 조작이 실패해 다시 맞출 때 부른다. 임시 회차도 포함한다.
// 「이전 당첨자 제외」 켬/끔 두 후보 수를 함께 돌려줘서, 스위치를 바꿀 때 서버를 다시 부르지 않게 한다.
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const [draws, completedNos] = await Promise.all([loadDraws(), loadCompletedNos()]);
    const candidates = await loadCandidates(draws, true, completedNos);
    return NextResponse.json({
      draws: draws.map(toDrawResponse),
      candidateCount: candidates.length,
      completedCount: completedNos.length,
    });
  } catch (e) {
    return toErrorResponse(e, "[GET /api/admin/draws]");
  }
}

// 발표 화면의 [추첨 시작]이 부른다. 서버에서 당첨자를 뽑아 임시 결과로 저장한다. 연출은 이 결과를 보여 줄 뿐이다.
// 검사와 저장 사이에 틈이 있어 아주 빠르게 두 번 누르면 임시 회차가 두 개 생길 수 있다.
// 발표 화면은 요청 중에 버튼을 막는다. 요청한 경품이 「지금 차례」인지는 검사하지 않는다 (명세에 없음).
export async function POST(request: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let body: { prizeId?: unknown; winnerCount?: unknown; excludePrevious?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY");
  }
  const { prizeId, winnerCount, excludePrevious = true } = body ?? {};
  if (!Number.isInteger(prizeId) || (prizeId as number) < 1 || typeof excludePrevious !== "boolean") {
    return apiError("INVALID_BODY");
  }

  const supabase = getSupabase();
  try {
    const draws = await loadDraws();
    assertCanStartDraw(draws.map(toDrawRow), prizeId as number);

    const { data: prize, error: prizeError } = await supabase
      .from("prizes")
      .select("id, winner_count, use_targeted")
      .eq("id", prizeId as number)
      .maybeSingle();
    if (prizeError) throw new DbError(prizeError.message);
    if (!prize) return apiError("INVALID_BODY");

    // 생략하면 경품 목록의 인원 (A-11). 틀린 값은 drawWinners 가 INVALID_WINNER_COUNT 로 거부한다.
    const count = winnerCount === undefined ? prize.winner_count : winnerCount;
    const candidates = await loadCandidates(draws, excludePrevious);
    // 경품의 「대상자 적용」이 켜져 있으면 체크한 후보를 먼저 뽑는다 (spec 6장 「추첨 대상 우선」, A-27). 꺼져 있으면 빈 배열이라 보통 추첨과 같다.
    // 후보가 인원보다 적으면 후보 전원, 0명이면 NOT_ENOUGH_CANDIDATES
    const targetedNos = await loadTargetedNos(prize.use_targeted);
    const picked = drawWinnersWithTargets(candidates, targetedNos, count as number, randomInt);

    // 당첨 인원 칸에는 실제로 덜 뽑혔어도 요청한 인원을 남긴다 (spec 5.3)
    const { data: created, error: drawError } = await supabase
      .from("draws")
      .insert({ prize_id: prize.id, winner_count: count, exclude_previous: excludePrevious, status: "pending" })
      .select("id")
      .single();
    if (drawError) throw new DbError(drawError.message);

    const { error: winnersError } = await supabase
      .from("draw_winners")
      .insert(picked.map((no) => ({ draw_id: created.id, participant_no: no, status: "pending" })));
    if (winnersError) {
      // 당첨자 없는 임시 회차가 남으면 DRAW_PENDING_EXISTS 때문에 다음 추첨이 계속 막힌다.
      await supabase.from("draws").delete().eq("id", created.id);
      throw new DbError(winnersError.message);
    }

    const saved = await loadDraw(created.id);
    if (!saved) throw new DbError(`방금 만든 회차 ${created.id} 를 다시 읽지 못했다`);
    return NextResponse.json(toDrawResponse(saved), { status: 201 });
  } catch (e) {
    return toErrorResponse(e, "[POST /api/admin/draws]");
  }
}
