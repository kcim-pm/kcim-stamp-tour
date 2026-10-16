"use client";

// 참가자 목록 표 (클라이언트). spec 3.3 「참가자 목록」, A-05, A-08
// 보여 주기만 한다. 삭제는 부모(admin-console)에게서 받은 함수를 부른다.
// 한 사람이 경품 여러 개에 당첨될 수 있어서(이전 당첨자 제외를 끈 경우) 당첨 경품 칸은 목록으로 그린다.
// 시각은 브라우저 시간대를 그대로 쓴다. 운영자 노트북은 한국 시간이다.
import type { ParticipantItem, ZoneColumn } from "./admin-console";

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });

export function ParticipantTable({
  participants,
  zones,
  onDelete,
}: {
  participants: ParticipantItem[];
  zones: ZoneColumn[];
  onDelete: (participantNo: number) => void;
}) {
  if (participants.length === 0) {
    return <div className="empty">참가자가 없습니다</div>;
  }

  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th className="num">번호</th>
            {zones.map((z) => (
              <th key={z.code} className="num">
                {z.name}
              </th>
            ))}
            <th className="num">완주</th>
            <th>당첨 경품</th>
            <th className="num">삭제</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.participantNo}>
              <td className="num">#{p.participantNo}</td>
              {zones.map((z) => {
                const at = p.visits[z.code];
                return (
                  <td key={z.code} className="num">
                    {at ? (
                      <span className="zone-ok" title={hhmm(at)}>
                        ✓
                      </span>
                    ) : (
                      <span className="zone-no">·</span>
                    )}
                  </td>
                );
              })}
              <td className="num">{p.completed && <span className="badge">완주</span>}</td>
              <td>
                {p.wins.map((w) => (
                  <div key={w.drawId} className="win-line">
                    {w.prizeName}
                  </div>
                ))}
              </td>
              <td className="num">
                <button className="btn-ghost btn-danger" style={{ height: 30 }} onClick={() => onDelete(p.participantNo)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
