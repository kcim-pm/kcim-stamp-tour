"use client";

// 숫자 릴 (클라이언트). spec 3.4 「추첨 중」, A-14
// 세 자릿수가 각각 아래에서 위로 지나간다. 
// 띠 하나에 숫자 둘(위·아래)을 두고, 반복 경계마다 아래 숫자를 위로 올리고 새 숫자를 아래에 둔다. 
// 경계에서는 글자가 틀 밖에 있어 바꿔도 보이지 않는다. 
// 자릿수마다 다른 걸음으로 올려 같은 숫자가 나란히 서지 않게 한다. 
// 결과는 서버가 이미 정했고 릴은 그것을 보여 줄 뿐이다.
// 움직임은 CSS 애니메이션(globals.css .reel__strip)이고, 줄어든 움직임 환경에서는 멈춘 숫자만 보인다.
import { useEffect, useRef } from "react";

const STEPS = [1, 3, 7];

export function Reel({ paused }: { paused: boolean }) {
  const strips = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const cleanups = strips.current.map((strip, k) => {
      if (!strip) return () => {};
      const onIteration = () => {
        const [top, bottom] = strip.children as unknown as HTMLSpanElement[];
        top.textContent = bottom.textContent;
        bottom.textContent = String((Number(bottom.textContent) + STEPS[k]) % 10);
      };
      strip.addEventListener("animationiteration", onIteration);
      return () => strip.removeEventListener("animationiteration", onIteration);
    });
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <p className={`reel${paused ? " is-paused" : ""}`} aria-hidden="true">
      {STEPS.map((_, k) => (
        <span key={k} className="reel__col">
          <span
            className="reel__strip"
            ref={(el) => {
              strips.current[k] = el;
            }}
          >
            <span className="reel__digit">{k * 3}</span>
            <span className="reel__digit">{(k * 3 + STEPS[k]) % 10}</span>
          </span>
        </span>
      ))}
    </p>
  );
}
