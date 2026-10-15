"use client";

// 관리자 콘솔 본체 (클라이언트). spec 3.3 통계·참가자 목록·자동 갱신, A-04~A-06, A-08
// 참가자 현황을 불러와 통계와 목록을 보여 주고, 삭제를 처리한다.
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
        </div>
        {data ? (
          <ParticipantTable participants={data.participants} zones={data.zones} onDelete={remove} />
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
