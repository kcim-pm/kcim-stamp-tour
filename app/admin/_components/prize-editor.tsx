"use client";

// 경품 목록 등록·수정 (클라이언트). spec 3.3 「경품 목록」, A-12, A-27, D-19
// 행사 전에 경품(이름, 당첨 인원, 대상자 적용)을 등록하고 고친다. 등급은 「5등 커피」처럼 이름에 적는다. 추첨은 표의 줄 순서대로 진행된다.
// 순서 숫자는 입력하지 않는다. [↑][↓]로 줄을 옮기고, 저장할 때 위에서부터 sort 를 매긴다 (assignPrizeSorts).
// 이미 추첨한 경품은 맨 위에 고정하고 글자로만 보여 준다. 서버도 PRIZE_ALREADY_DRAWN 으로 막지만 화면에서 먼저 막는다.
// 1분 자동 갱신에는 넣지 않는다. 입력하는 도중에 갱신되면 고치던 값이 덮어써지기 때문이다.
import { useCallback, useEffect, useState } from "react";
import { adminFetch, errorMessage } from "@/lib/admin-fetch";
import type { PrizeResponse } from "@/lib/admin-query";
import { assignPrizeSorts, orderPrizesForEditing } from "@/lib/draw-state";

// 입력란 값은 글자 그대로 둔다. 숫자 검사는 저장할 때 한다.
type EditRow = {
  key: string; // 화면에서만 쓰는 줄 구분값. 새 줄은 id 가 없어서 필요하다
  id: number | null;
  name: string;
  winnerCount: string;
  sort: number | null; // 서버에서 받은 값. 추첨한 경품은 저장할 때 그대로 보낸다. 새 줄은 null
  useTargeted: boolean; // 「대상자 적용」. 켜면 참가자 목록에서 체크한 완주자를 먼저 뽑는다 (A-27)
  drawn: boolean;
};
type Field = "name" | "winnerCount";

let newKeySeq = 0;
const toEditRow = (p: PrizeResponse): EditRow => ({
  key: `p${p.id}`,
  id: p.id,
  name: p.name,
  winnerCount: String(p.winnerCount),
  sort: p.sort,
  useTargeted: p.useTargeted,
  drawn: p.drawn,
});
const toEditRows = (prizes: PrizeResponse[]) => orderPrizesForEditing(prizes.map(toEditRow));

const isInt = (s: string) => /^-?\d+$/.test(s.trim());

// 틀린 칸 목록. 비어 있으면 저장할 수 있다.
function invalidFields(r: EditRow): Field[] {
  const bad: Field[] = [];
  if (r.name.trim() === "") bad.push("name");
  if (!isInt(r.winnerCount) || Number(r.winnerCount) < 1) bad.push("winnerCount");
  return bad;
}

export function PrizeEditor() {
  const [rows, setRows] = useState<EditRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const load = useCallback(async () => {
    const result = await adminFetch<{ prizes: PrizeResponse[] }>("/api/admin/prizes");
    if (result.ok) {
      setRows(toEditRows(result.data.prizes));
      setDirty(false);
      setShowErrors(false);
      setLoaded(true);
    } else {
      setNotice({ kind: "error", text: errorMessage(result.code) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 저장하지 않고 페이지를 떠나려 하면 한 번 묻는다.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function changed(next: EditRow[]) {
    setRows(next);
    setDirty(true);
    setNotice(null);
  }

  function edit(key: string, field: Field, value: string) {
    changed(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function toggleTargeted(key: string, useTargeted: boolean) {
    changed(rows.map((r) => (r.key === key ? { ...r, useTargeted } : r)));
  }

  function addRow() {
    changed([
      ...rows,
      { key: `new${++newKeySeq}`, id: null, name: "", winnerCount: "", sort: null, useTargeted: false, drawn: false },
    ]);
  }

  function removeRow(key: string) {
    changed(rows.filter((r) => r.key !== key));
  }

  // 추첨하지 않은 줄끼리만 자리를 바꾼다. 추첨한 경품 위로는 올라가지 않는다.
  function move(index: number, step: -1 | 1) {
    const target = index + step;
    if (target < 0 || target >= rows.length || rows[target].drawn) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    changed(next);
  }

  async function save() {
    if (rows.some((r) => invalidFields(r).length > 0)) {
      setShowErrors(true);
      setNotice({ kind: "error", text: "빨갛게 표시된 칸을 고쳐 주세요" });
      return;
    }
    setSaving(true);
    const sorts = assignPrizeSorts(rows);
    // 새 줄은 id 없이 보낸다 (spec 5.3 「id 가 없으면 새로 만든다」)
    const prizes = rows.map((r, i) => ({
      ...(r.id !== null && { id: r.id }),
      name: r.name.trim(),
      winnerCount: Number(r.winnerCount),
      sort: sorts[i],
      useTargeted: r.useTargeted,
    }));
    const result = await adminFetch<{ prizes: PrizeResponse[] }>("/api/admin/prizes", { method: "PUT", body: { prizes } });
    if (result.ok) {
      setRows(toEditRows(result.data.prizes));
      setDirty(false);
      setShowErrors(false);
      setNotice({ kind: "ok", text: "저장했습니다" });
    } else {
      setNotice({ kind: "error", text: errorMessage(result.code) });
      // 그사이 발표 화면에서 추첨한 것이므로 목록을 다시 불러온다.
      if (result.code === "PRIZE_ALREADY_DRAWN") await load();
    }
    setSaving(false);
  }

  const input = (r: EditRow, field: Field, type: "text" | "number") => (
    <input
      type={type}
      value={r[field]}
      className={showErrors && invalidFields(r).includes(field) ? "is-invalid" : undefined}
      onChange={(e) => edit(r.key, field, e.target.value)}
      aria-label={field}
    />
  );

  return (
    <section className="console-section" id="prizes">
      <h2>경품 목록</h2>
      <p className="hint" style={{ margin: 0 }}>
        위에서부터 순서대로 추첨합니다. [↑][↓]로 순서를 바꿉니다. 추첨한 경품은 맨 위에 고정되며 수정할 수 없습니다.
        「대상자 적용」을 켠 경품은 참가자 목록에서 체크한 완주자를 먼저 뽑고, 모자라면 나머지 완주자에서 채웁니다.
      </p>
      {!loaded ? (
        <div className="empty">{notice?.text ?? "불러오는 중…"}</div>
      ) : (
        <div className="table-wrap" style={{ maxHeight: "none" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th className="num" style={{ width: 60 }}>
                  순서
                </th>
                <th>이름</th>
                <th style={{ width: 110 }}>당첨 인원</th>
                <th className="num" style={{ width: 110 }}>
                  대상자 적용
                </th>
                <th className="num" style={{ width: 100 }}>
                  이동
                </th>
                <th className="num" style={{ width: 90 }}>
                  삭제
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    경품이 없습니다
                  </td>
                </tr>
              )}
              {rows.map((r, i) =>
                r.drawn ? (
                  <tr key={r.key}>
                    <td className="num">{i + 1}</td>
                    <td>
                      {r.name} <span className="badge">추첨함</span>
                    </td>
                    <td>{r.winnerCount}명</td>
                    <td className="num">{r.useTargeted ? "적용" : ""}</td>
                    <td />
                    <td />
                  </tr>
                ) : (
                  <tr key={r.key}>
                    <td className="num">{i + 1}</td>
                    <td>{input(r, "name", "text")}</td>
                    <td>{input(r, "winnerCount", "number")}</td>
                    <td className="num">
                      <input
                        type="checkbox"
                        checked={r.useTargeted}
                        disabled={saving}
                        onChange={(e) => toggleTargeted(r.key, e.target.checked)}
                        aria-label="대상자 적용"
                      />
                    </td>
                    <td className="num" style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn-ghost"
                        style={{ height: 30, padding: "0 10px" }}
                        disabled={saving || i === 0 || rows[i - 1].drawn}
                        onClick={() => move(i, -1)}
                        aria-label="위로"
                      >
                        ↑
                      </button>{" "}
                      <button
                        className="btn-ghost"
                        style={{ height: 30, padding: "0 10px" }}
                        disabled={saving || i === rows.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label="아래로"
                      >
                        ↓
                      </button>
                    </td>
                    <td className="num">
                      <button className="btn-ghost btn-danger" style={{ height: 30 }} onClick={() => removeRow(r.key)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="console-row">
        <button className="btn-ghost" disabled={!loaded || saving} onClick={addRow}>
          + 경품 추가
        </button>
        <button className="btn-ghost btn-primary" disabled={!dirty || saving} onClick={save}>
          {saving ? "저장 중…" : "저장"}
        </button>
        {notice && loaded && <span className={notice.kind === "ok" ? "text-ok" : "text-error"}>{notice.text}</span>}
      </div>
    </section>
  );
}
