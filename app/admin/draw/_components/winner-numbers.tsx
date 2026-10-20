"use client";

// 당첨 번호 (클라이언트). spec 3.4 「결과(임시)」「확정 후」「당첨 번호 배치」, A-15, A-24
// 상자 없이 숫자만 크게 놓는다. 크기와 열 수는 인원에 따라 winnerLayout 이 정한다.
// 번호는 자릿수마다 0~9 띠를 두고 값까지 굴러 들어온다. 
// 이미 서 있는 번호는 그대로 두고 새로 뽑힌 번호만 굴러 들어오도록 번호마다 컴포넌트를 참가번호 key 로 유지한다. 
// 재추첨 때 나머지 번호는 움직이지 않는다.
//
// 두 가지 모드
//   - select (결과(임시)): 번호를 누르면 부재자로 고른다. 고른 번호는 주황 면이 뒤에 깔린다. 재추첨된 부재자는 목록에 없다.
//   - confirmed (확정 후, 이전 결과): 보여 주기만 한다.
// 순서는 받은 nos 그대로다. 발표 화면이 winnerDisplayOrder 로 정해서 넘긴다(오름차순, 재추첨 번호는 뒤에).
import { useEffect, useState } from "react";
import { winnerEnterOrder, winnerLayout } from "@/lib/winner-layout";

type Props = {
  nos: number[];
  selected?: Set<number>;
  fresh?: Set<number>; // 재추첨으로 새로 뽑힌 번호 (잠깐 강조)
  disabled?: boolean;
  onToggle?: (participantNo: number) => void;
  size?: number; // 지정하면 winnerLayout 대신 이 크기를 쓴다 (이전 결과 창)
};

export function WinnerNumbers({ nos, selected, fresh, disabled, onToggle, size }: Props) {
  const layout = winnerLayout(nos.length);
  // 재추첨 번호는 끝자리여도 기다리지 않고 바로 굴러 들어온다.
  const enterOrder = winnerEnterOrder(nos, fresh ?? new Set());
  // --size 는 단위 없는 숫자(1280px 폭 기준 px). CSS 에서 화면 폭에 비례해 vw 로 바꾼다.
  const style = { "--size": size ?? layout.size, "--cols": layout.cols } as React.CSSProperties;

  return (
    <div className={`winners winners--${layout.kind}`} style={style}>
      {nos.map((no, i) => (
        <WinnerNumber
          key={no}
          no={no}
          order={enterOrder[i]}
          pressed={selected?.has(no) ?? false}
          fresh={fresh?.has(no) ?? false}
          disabled={disabled || !onToggle}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

type NumberProps = {
  no: number;
  order: number;
  pressed: boolean;
  fresh: boolean;
  disabled: boolean;
  onToggle?: (participantNo: number) => void;
};

function WinnerNumber({ no, order, pressed, fresh, disabled, onToggle }: NumberProps) {
  // 처음 붙은 다음 프레임에 is-in 을 붙여 굴러 들어오는 전환이 걸리게 한다.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const classes = ["winner"];
  if (entered) classes.push("is-in");
  if (fresh) classes.push("is-new");
  const digits = String(no).split("");

  return (
    <button
      type="button"
      className={classes.join(" ")}
      style={{ "--i": order } as React.CSSProperties}
      aria-pressed={pressed}
      aria-label={`번호 ${no}${pressed ? ", 재추첨 대상" : ""}`}
      disabled={disabled}
      onClick={onToggle ? () => onToggle(no) : undefined}
    >
      <span className="winner__digits" aria-hidden="true">
        {digits.map((d, k) => (
          <span key={k} className="winner__col">
            <span className="winner__strip" style={{ "--d": d, "--i": order + k * 0.3 } as React.CSSProperties}>
              {Array.from({ length: 10 }, (_, n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </button>
  );
}
