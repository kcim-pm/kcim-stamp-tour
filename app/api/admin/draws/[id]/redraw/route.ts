import { randomInt } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { apiError, toErrorResponse } from "@/lib/api-error";
import { loadCandidates, loadDraw, loadDraws, toDrawResponse, toDrawRow, toWinnerRows } from "@/lib/admin-query";
import { drawWinners, pickRedrawCandidates } from "@/lib/draw";
import { assertPending, assertRedrawSelection } from "@/lib/draw-state";
import { getSupabase } from "@/lib/supabase-server";
import { DbError } from "@/lib/status-query";

// POST /api/admin/draws/{회차번호}/redraw — 부재자 재추첨 (spec 5.3, A-24, D-18)
// 고른 번호를 부재자로 바꾸고 그 수만큼 새로 뽑는다. 나머지 번호는 그대로다.
// 후보가 고른 수보다 적으면 있는 만큼만 새로 뽑힌다.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const drawId = Number((await params).id);
  let body: { participantNos?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY");
  }
  const selected = body?.participantNos;
  if (!Number.isInteger(drawId) || drawId < 1 || !Array.isArray(selected) || !selected.every(Number.isInteger)) {
    return apiError("INVALID_BODY");
  }

  const supabase = getSupabase();
  try {
    const draws = await loadDraws();
    const draw = draws.find((d) => d.id === drawId);
    if (!draw) return apiError("DRAW_NOT_FOUND");

    assertPending(toDrawRow(draw));
    assertRedrawSelection(toWinnerRows(draw), selected as number[]);

    // 이 회차를 처음 뽑을 때와 같은 기준의 후보에서, 이 회차에 기록된 번호(남은 당첨자, 부재자)를 모두 뺀다.
    const candidates = await loadCandidates(draws, draw.exclude_previous);
    const redrawCandidates = pickRedrawCandidates(
      candidates,
      draw.winners.map((w) => w.participant_no),
    );
    // 후보가 0명이면 여기서 던지고 DB 는 바뀌지 않는다.
    const picked = drawWinners(redrawCandidates, selected.length, randomInt);

    // 순서: ① 새 번호 추가 → ② 고른 번호를 부재자로. ②가 실패하면 ①만 지우면 재추첨 전 상태로 돌아간다.
    // 되돌리기마저 실패하는 경우는 남는다. 완전히 묶으려면 DB 함수(rpc)가 필요하지만 행사 규모에서는 생략한다.
    const { error: insertError } = await supabase
      .from("draw_winners")
      .insert(picked.map((no) => ({ draw_id: drawId, participant_no: no, status: "pending" })));
    if (insertError) throw new DbError(insertError.message);

    const { error: absentError } = await supabase
      .from("draw_winners")
      .update({ status: "absent" })
      .eq("draw_id", drawId)
      .eq("status", "pending")
      .in("participant_no", selected as number[]);
    if (absentError) {
      await supabase.from("draw_winners").delete().eq("draw_id", drawId).in("participant_no", picked);
      throw new DbError(absentError.message);
    }

    const saved = await loadDraw(drawId);
    if (!saved) throw new DbError(`회차 ${drawId} 를 다시 읽지 못했다`);
    return NextResponse.json(toDrawResponse(saved));
  } catch (e) {
    return toErrorResponse(e, "[POST /api/admin/draws/redraw]");
  }
}
