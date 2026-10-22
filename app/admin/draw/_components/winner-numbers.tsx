"use client";

// 당첨 번호 (클라이언트). spec 3.4 「추첨 중」「결과(임시)」「확정 후」「당첨 번호 배치」, A-14, A-15, A-24, D-23
// 번호마다 세 자리 릴이다. 상자 없이 숫자만 놓고, 크기와 열 수는 인원에 따라 winnerLayout 이 정한다.
// 추첨 중에는 모든 칸이 돌고, 첫 칸부터 하나씩 백→십→일 순으로 멈춘다. 일정은 lib/winner-layout.ts 의 reelStopAt 이다.
// 번호는 세 자리로 채워 보여 준다(padNo, 3 → 003).
// 이미 서 있는 번호는 그대로 두고 새로 뽑힌 번호만 돌도록 번호마다 컴포넌트를 참가번호 key 로 유지한다.
// 재추첨 때 나머지 번호는 움직이지 않는다. 새로고침해서 다시 열면(animate 없음) 돌지 않고 바로 선다.
//
// 두 가지 모드
//   - select (결과(임시)): 번호를 누르면 부재자로 고른다. 고른 번호는 주황 면이 뒤에 깔린다. 재추첨된 부재자는 목록에 없다.
//   - confirmed (확정 후): 보여 주기만 한다.
// 순서는 받은 nos 그대로다. 발표 화면이 winnerDisplayOrder 로 정해서 넘긴다(오름차순, 재추첨 번호는 뒤에).
import { useEffect, useRef, useState } from "react";
import { padNo, reelStopAt, winnerEnterOrder, winnerLayout } from "@/lib/winner-layout";

type Props = {
  nos: number[];
  selected?: Set<number>;
  fresh?: Set<number>; // 재추첨으로 새로 뽑힌 번호 (돌다가 멈추고 잠깐 강조)
  animate?: boolean; // 추첨 중: 모든 번호가 돌다가 차례로 멈춘다. 아니면 fresh 만 돈다
  disabled?: boolean;
  onToggle?: (participantNo: number) => void;
  onDigitStop?: () => void; // 자릿수 하나가 멈추기 시작할 때 (효과음)
  size?: number; // 지정하면 winnerLayout 대신 이 크기를 쓴다
};

export function WinnerNumbers({ nos, selected, fresh, animate = false, disabled, onToggle, onDigitStop, size }: Props) {
  const layout = winnerLayout(nos.length);
  // 재추첨 번호는 끝자리여도 앞 칸을 기다리지 않고 그 묶음 안에서 0부터 차례를 센다.
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
          spin={animate || (fresh?.has(no) ?? false)}
          pressed={selected?.has(no) ?? false}
          fresh={fresh?.has(no) ?? false}
          disabled={disabled || !onToggle}
          onToggle={onToggle}
          onDigitStop={onDigitStop}
        />
      ))}
    </div>
  );
}

type NumberProps = {
  no: number;
  order: number;
  spin: boolean;
  pressed: boolean;
  fresh: boolean;
  disabled: boolean;
  onToggle?: (participantNo: number) => void;
  onDigitStop?: () => void;
};

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
// 자릿수마다 다른 걸음으로 올려 같은 숫자가 나란히 서지 않게 한다.
const SPIN_STEPS = [1, 3, 7];

function WinnerNumber({ no, order, spin, pressed, fresh, disabled, onToggle, onDigitStop }: NumberProps) {
  // 돌지 여부와 차례는 처음 붙을 때 정하고 그 뒤로 바꾸지 않는다.
  // 추첨 중 → 결과(임시)로 단계가 바뀌어도 멈추던 릴은 그 일정대로 계속 멈추고, 이미 선 번호는 다시 돌지 않는다.
  const [spinning] = useState(spin);
  const [firstOrder] = useState(order);
  // 자릿수마다 멈추기 시작했는지. 멈추면 감속 띠(is-settling)로 바꾼다.
  const [stopped, setStopped] = useState<boolean[]>(() => (spin ? [false, false, false] : [true, true, true]));
  const stopSound = useRef(onDigitStop);
  stopSound.current = onDigitStop;

  useEffect(() => {
    if (!spinning) return;
    const timers = [0, 1, 2].map((k) =>
      setTimeout(() => {
        setStopped((s) => s.map((v, j) => (j === k ? true : v)));
        stopSound.current?.();
      }, reelStopAt(firstOrder, k)),
    );
    return () => timers.forEach(clearTimeout);
  }, [spinning, firstOrder]);

  const classes = ["winner"];
  if (fresh) classes.push("is-new");
  const digits = padNo(no).split("");

  return (
    <button
      type="button"
      className={classes.join(" ")}
      aria-pressed={pressed}
      aria-label={`번호 ${no}${pressed ? ", 재추첨 대상" : ""}`}
      disabled={disabled}
      onClick={onToggle ? () => onToggle(no) : undefined}
    >
      <span className="winner__digits" aria-hidden="true">
        {digits.map((d, k) => (
          <span key={k} className="winner__col">
            {stopped[k] ? (
              // 멈춘 자리. 0~9 띠 두 벌을 두고 한 바퀴(10칸) 위에서 값(--d)까지 감속해 내려온다. 처음부터 서 있던 번호는 바로 값에 선다.
              <span className={`winner__strip${spinning ? " is-settling" : ""}`} style={{ "--d": d } as React.CSSProperties}>
                {[...DIGITS, ...DIGITS].map((n, i) => (
                  <span key={i}>{n}</span>
                ))}
              </span>
            ) : (
              <SpinningStrip step={SPIN_STEPS[k]} start={k * 3} />
            )}
          </span>
        ))}
      </span>
    </button>
  );
}

// 도는 띠. 띠 하나에 숫자 둘(위·아래)을 두고, CSS 애니메이션(globals.css reel-pass) 반복 경계마다
// 아래 숫자를 위로 올리고 새 숫자를 아래에 둔다. 경계에서는 글자가 틀 밖에 있어 바꿔도 보이지 않는다.
// 줄어든 움직임 환경에서는 애니메이션이 없어 멈춘 숫자만 보인다.
function SpinningStrip({ step, start }: { step: number; start: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const strip = ref.current;
    if (!strip) return;
    const onIteration = () => {
      const [top, bottom] = strip.children as unknown as HTMLSpanElement[];
      top.textContent = bottom.textContent;
      bottom.textContent = String((Number(bottom.textContent) + step) % 10);
    };
    strip.addEventListener("animationiteration", onIteration);
    return () => strip.removeEventListener("animationiteration", onIteration);
  }, [step]);

  return (
    <span ref={ref} className="winner__strip is-spinning">
      <span>{start % 10}</span>
      <span>{(start + step) % 10}</span>
    </span>
  );
}
