"use client";

// 당첨 번호 격자 (클라이언트). spec 3.4 「결과(임시)」「확정 후」, A-15, A-24
// 보여 주기만 한다. 번호 고르기는 부모(draw-screen)에게서 받은 함수를 부른다.
//
// 두 가지 모드
//   - select (결과(임시)): 임시 당첨자만 보여 준다. 재추첨된 부재자는 뺀다 (spec 3.4).
//     흐리게라도 남기면 관객이 「지워진 번호」를 당첨으로 오해할 수 있다.
//   - confirmed (확정 후, 이전 결과): 확정 당첨자 번호만 보여 준다.
// 순서는 참가번호 오름차순이다. 서버가 이미 이 순서로 보낸다.
import type { DrawResponse } from "@/lib/admin-query";

type Props =
  | {
      mode: "select";
      draw: DrawResponse;
      selected: Set<number>;
      highlighted: Set<number>; // 재추첨으로 새로 뽑힌 번호 (잠깐 강조)
      disabled: boolean;
      onToggle: (participantNo: number) => void;
    }
  | {
      mode: "confirmed";
      draw: DrawResponse;
    };

export function WinnerGrid(props: Props) {
  const status = props.mode === "select" ? "pending" : "confirmed";
  const winners = props.draw.winners.filter((w) => w.status === status);
  // 10개 이하면 5열, 그보다 많으면 10열. 뒷줄 관객도 읽을 수 있게 번호를 아주 크게 쓴다.
  const cols = winners.length <= 10 ? 5 : 10;

  return (
    <div className="winner-grid" style={{ "--cols": cols } as React.CSSProperties}>
      {winners.map((w) => {
        if (props.mode === "select") {
          const classes = ["winner-cell"];
          if (props.selected.has(w.participantNo)) classes.push("is-selected");
          if (props.highlighted.has(w.participantNo)) classes.push("is-new");
          return (
            <button
              key={w.participantNo}
              className={classes.join(" ")}
              disabled={props.disabled}
              aria-pressed={props.selected.has(w.participantNo)}
              onClick={() => props.onToggle(w.participantNo)}
            >
              <span className="winner-no">{w.participantNo}</span>
            </button>
          );
        }

        return (
          <div key={w.participantNo} className="winner-cell">
            <span className="winner-no">{w.participantNo}</span>
          </div>
        );
      })}
    </div>
  );
}
