import { describe, it, expect } from "vitest";
import { drawWinners, pickCandidates, pickRedrawCandidates } from "../lib/draw";

// 난수는 고정 함수를 넣는다. Math.random 이나 crypto.randomInt 를 테스트에서 직접 쓰지 않는다.
const alwaysZero = () => 0;

// 미리 정한 숫자를 순서대로 꺼낸다. max 를 넘는 값을 넣으면 테스트가 잘못된 것이므로 던진다.
function sequence(values: number[]) {
  let i = 0;
  return (max: number) => {
    const v = values[i++ % values.length];
    if (v >= max) throw new Error(`테스트 난수 ${v} 가 max ${max} 이상`);
    return v;
  };
}

describe("추첨 후보", () => {
  it("excludePrevious 가 true 면 확정(confirmed) 당첨자를 뺀다", () => {
    expect(pickCandidates([1, 2, 3, 4], [2], true)).toEqual([1, 3, 4]);
  });

  it("excludePrevious 가 false 면 확정 당첨자도 그대로 둔다", () => {
    expect(pickCandidates([1, 2, 3, 4], [2], false)).toEqual([1, 2, 3, 4]);
  });

  it("넘기지 않은 번호(부재자)는 남는다", () => {
    expect(pickCandidates([1, 2, 3], [], true)).toEqual([1, 2, 3]);
  });

  it("완주자 순서를 유지한다", () => {
    expect(pickCandidates([9, 3, 7, 1, 5], [7], true)).toEqual([9, 3, 1, 5]);
  });
});

describe("재추첨 후보", () => {
  it("이 회차의 당첨 기록(pending, absent 전부)을 뺀다", () => {
    expect(pickRedrawCandidates([1, 2, 3, 4, 5], [2, 4])).toEqual([1, 3, 5]);
  });

  it("이 회차 기록이 없으면 후보 그대로", () => {
    expect(pickRedrawCandidates([1, 2, 3], [])).toEqual([1, 2, 3]);
  });
});

describe("무작위 추출", () => {
  it("고정 난수로 결과가 재현된다", () => {
    // 항상 0 이면 i=4..1 마다 [0] 과 [i] 를 바꾼다: [1,2,3,4,5] → [2,3,4,5,1]
    expect(drawWinners([1, 2, 3, 4, 5], 2, alwaysZero)).toEqual([2, 3]);
    expect(drawWinners([1, 2, 3, 4, 5], 2, alwaysZero)).toEqual([2, 3]);
  });

  it("난수 순서를 바꾸면 결과도 그에 맞게 바뀐다", () => {
    // i=2: j=2 그대로, i=1: j=0 교환 → [2,1,3]
    expect(drawWinners([1, 2, 3], 3, sequence([2, 0]))).toEqual([2, 1, 3]);
  });

  it("뽑힌 번호에 중복이 없고 모두 후보 안에 있다", () => {
    const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = drawWinners(candidates, 10, sequence([3, 1, 4, 1, 5, 2, 0, 1, 0]));
    expect(result).toHaveLength(10);
    expect(new Set(result).size).toBe(10);
    expect([...result].sort((a, b) => a - b)).toEqual(candidates);
  });

  it("뽑힌 번호는 모두 후보 안에 있다", () => {
    const candidates = [11, 22, 33, 44, 55];
    const result = drawWinners(candidates, 3, sequence([1, 2, 0, 1]));
    expect(result).toHaveLength(3);
    for (const no of result) expect(candidates).toContain(no);
  });

  it("count 가 후보 수보다 크면 후보 수만큼만 뽑힌다", () => {
    const result = drawWinners([1, 2], 3, alwaysZero);
    expect(result).toHaveLength(2);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it("후보가 비어 있으면 NOT_ENOUGH_CANDIDATES", () => {
    expect(() => drawWinners([], 1, alwaysZero)).toThrow("NOT_ENOUGH_CANDIDATES");
  });

  it("count 가 후보 수와 같으면 전부 뽑힌다", () => {
    const result = drawWinners([1, 2, 3], 3, alwaysZero);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it.each([0, -1, 1.5, "2", NaN])("count 가 %j 면 INVALID_WINNER_COUNT", (count) => {
    expect(() => drawWinners([1, 2, 3], count as number, alwaysZero)).toThrow("INVALID_WINNER_COUNT");
  });

  it("count 검사가 후보 검사보다 먼저다", () => {
    expect(() => drawWinners([], 0, alwaysZero)).toThrow("INVALID_WINNER_COUNT");
  });

  it("원본 후보 배열을 바꾸지 않는다", () => {
    const candidates = [1, 2, 3, 4, 5];
    drawWinners(candidates, 3, alwaysZero);
    expect(candidates).toEqual([1, 2, 3, 4, 5]);
  });
});
