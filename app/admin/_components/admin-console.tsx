"use client";

// 관리자 콘솔 본체 (클라이언트). spec 3.3 통계·참가자 목록·자동 갱신, A-04~A-06, A-08, A-27
// 참가자 현황을 불러와 통계와 목록을 보여 주고, 삭제와 「추첨 대상」 체크 저장을 처리한다.
// 체크는 화면에서만 바뀌고, [대상 저장]을 눌러야 지금 화면의 체크 전체를 서버에 보낸다(spec 5.3 PUT participants/targets).
// 저장 전 체크는 서버 데이터와 따로 들고 있어서(draft), 1분 자동 갱신이 목록을 다시 받아도 덮어쓰이지 않는다.
// 발표 화면에서 확정한 당첨 경품은 다음 갱신 때 반영된다 (spec 3.3 마지막 문단).
import { useCallback, useEffect, useState } from "react";
import { adminFetch, errorMessage } from "@/lib/admin-fetch";
import type { ParticipantRow, Stats, ZoneColumn } from "@/lib/admin-query";
import { ParticipantTable } from "./participant-table";
import { useAutoRefresh } from "./use-auto-refresh";

export type { ZoneColumn };
export type ParticipantItem = Omit<ParticipantRow, "visitedAt">;
type ParticipantsResponse = { stats: Stats; zones: ZoneColumn[]; participants: ParticipantItem[] };

const hhmmss = (d: Date) => d.toLocaleTimeString("ko-KR", { hour12: false });

export function AdminConsole() {
  const [data, setData] = useState<ParticipantsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetNotice, setTargetNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // 저장하지 않은 체크. null 이면 고친 것이 없어 서버 값(participants[].targeted)을 그대로 보여 준다.
  const [targetDraft, setTargetDraft] = useState<Set<number> | null>(null);

  // 실패해도 이전 데이터는 지우지 않는다. 통신이 잠깐 끊겨도 표가 사라지지 않게.
  const load = useCallback(async () => {
    setLoading(true);
    const result = await adminFetch<ParticipantsResponse>("/api/admin/participants");
    if (result.ok) {
      setData(result.data);
      setLoadedAt(new Date());
      setError(null);
    } else {
      setError(errorMessage(result.code));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const autoRefresh = useAutoRefresh(load);

  async function remove(participantNo: number) {
    if (!confirm(`${participantNo}번 참가자를 삭제할까요? 방문 기록과 당첨 기록도 함께 지워집니다.`)) return;
    const result = await adminFetch(`/api/admin/participants/${participantNo}`, { method: "DELETE" });
    if (!result.ok) alert(errorMessage(result.code));
    await load();
  }

  // 화면에 보이는 체크 상태. 고친 것이 있으면 draft, 없으면 서버 값.
  // draft 에는 그사이 지워진 참가자 번호가 남을 수 있어서, 지금 목록에 있는 번호만 센다.
  const isTargeted = (p: ParticipantItem) => (targetDraft ? targetDraft.has(p.participantNo) : p.targeted);
  const shownParticipants = data?.participants.map((p) => ({ ...p, targeted: isTargeted(p) })) ?? [];
  const targetedNos = shownParticipants.filter((p) => p.targeted).map((p) => p.participantNo);
  const targetDirty = targetDraft !== null;

  // 체크 하나를 화면에서만 바꾼다. 처음 바꿀 때 서버 값을 복사해 draft 를 만든다.
  function toggleTarget(participantNo: number, targeted: boolean) {
    if (!data) return;
    const next = new Set(targetDraft ?? data.participants.filter((p) => p.targeted).map((p) => p.participantNo));
    if (targeted) next.add(participantNo);
    else next.delete(participantNo);
    setTargetDraft(next);
    setTargetNotice(null);
  }

  // [대상 저장]. 지금 화면의 체크 전체를 보낸다. 성공하면 서버가 돌려준 체크로 표를 맞추고 draft 를 비운다.
  // 실패하면 draft 를 그대로 두어 운영자가 고쳐서 다시 저장할 수 있게 한다(NOT_COMPLETED 는 새로고침 뒤 다시 체크).
  async function saveTargets() {
    setTargetSaving(true);
    const result = await adminFetch<{ participantNos: number[] }>("/api/admin/participants/targets", {
      method: "PUT",
      body: { participantNos: targetedNos },
    });
    if (result.ok) {
      const saved = new Set(result.data.participantNos);
      setData((prev) =>
        prev ? { ...prev, participants: prev.participants.map((p) => ({ ...p, targeted: saved.has(p.participantNo) })) } : prev,
      );
      setTargetDraft(null);
      setTargetNotice({ kind: "ok", text: `추첨 대상 ${saved.size}명 저장했습니다` });
    } else {
      setTargetNotice({ kind: "error", text: errorMessage(result.code) });
    }
    setTargetSaving(false);
  }

  // 저장하지 않은 체크가 있는 채로 페이지를 떠나려 하면 한 번 묻는다 (경품 목록과 같다).
  useEffect(() => {
    if (!targetDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [targetDirty]);

  const stats = data?.stats;

  return (
    <>
      <section className="console-section">
        <div className="stat-grid">
          <Stat label="전체 참가자" value={stats?.total} />
          <Stat label="완주자" value={stats?.completed} />
          <Stat label="진행 중" value={stats?.inProgress} />
        </div>

        <div className="console-row">
          <label className="switch">
            <input
              type="checkbox"
              checked={autoRefresh.enabled}
              onChange={(e) => autoRefresh.setEnabled(e.target.checked)}
            />
            <span className="switch-track" />
            자동 갱신 1분
          </label>
          <button className="btn-ghost" disabled={loading} onClick={load}>
            {loading ? "불러오는 중…" : "새로고침"}
          </button>
          <span className="hint">마지막 갱신 {loadedAt ? hhmmss(loadedAt) : "-"}</span>
          {error && <span className="text-error">{error}</span>}
        </div>
      </section>

      <section className="console-section">
        <div className="console-row">
          <h2>참가자 목록</h2>
          <span className="hint">
            추첨 대상 {targetedNos.length}명 · 완주자만 체크할 수 있고 [대상 저장]을 눌러야 저장됩니다
          </span>
          <button className="btn-ghost btn-primary" disabled={!targetDirty || targetSaving} onClick={saveTargets}>
            {targetSaving ? "저장 중…" : "대상 저장"}
          </button>
          {targetDirty && !targetSaving && <span className="text-error">저장하지 않은 체크가 있습니다</span>}
          {targetNotice && <span className={targetNotice.kind === "ok" ? "text-ok" : "text-error"}>{targetNotice.text}</span>}
        </div>
        {data ? (
          <ParticipantTable
            participants={shownParticipants}
            zones={data.zones}
            onDelete={remove}
            onToggleTarget={toggleTarget}
            targetDisabled={targetSaving}
          />
        ) : (
          <div className="empty">{error ?? "불러오는 중…"}</div>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value ?? "-"}</span>
    </div>
  );
}
