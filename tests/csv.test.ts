import { describe, it, expect } from "vitest";
import { buildCsv, escapeField, formatTime, type CsvRow } from "../lib/csv";

// 이스케이프로 쓴다. 글자 그대로 넣으면 보이지 않아 에디터가 지워도 모른다.
const BOM = "\uFEFF";
const zones = [{ name: "구역 1" }, { name: "구역 2" }];
const HEADER = "참가번호,구역 1,구역 2,완주,당첨 경품";

const row = (over: Partial<CsvRow> = {}): CsvRow => ({
  participantNo: 7,
  visitedAt: [null, null],
  completed: false,
  prizes: [],
  ...over,
});

// BOM 을 떼고 CRLF 로 나눈다. 마지막 CRLF 뒤의 빈 문자열은 버린다.
function lines(csv: string): string[] {
  const parts = csv.slice(BOM.length).split("\r\n");
  expect(parts.at(-1)).toBe("");
  return parts.slice(0, -1);
}

describe("형식", () => {
  it('결과가 BOM("\\uFEFF") 으로 시작한다', () => {
    expect(buildCsv(zones, [row()]).startsWith(BOM)).toBe(true);
  });

  it("첫 줄이 참가번호,구역 이름들…,완주,당첨 경품 순서다", () => {
    expect(lines(buildCsv(zones, [row()]))[0]).toBe(HEADER);
  });

  it("줄 끝이 CRLF 이고 마지막 줄 뒤에도 CRLF 가 있다", () => {
    const csv = buildCsv(zones, [row(), row({ participantNo: 8 })]);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(lines(csv)).toHaveLength(3);
  });

  it("행이 없으면 BOM 과 첫 줄만 있다", () => {
    expect(buildCsv(zones, [])).toBe(`${BOM}${HEADER}\r\n`);
  });
});

describe("참가자 행", () => {
  it("참가번호는 앞자리 0 없이 쓴다 (7)", () => {
    expect(lines(buildCsv(zones, [row()]))[1].split(",")[0]).toBe("7");
  });

  it("미방문 구역은 빈칸이다", () => {
    const csv = buildCsv(zones, [row({ visitedAt: ["2026-10-27T01:00:00+00:00", null] })]);
    expect(lines(csv)[1]).toBe("7,2026-10-27 10:00:00,,,");
  });

  it('완주자는 완주 칸이 "Y", 아니면 빈칸이다', () => {
    const csv = buildCsv(zones, [row({ completed: true }), row({ participantNo: 8 })]);
    expect(lines(csv)[1].split(",")[3]).toBe("Y");
    expect(lines(csv)[2].split(",")[3]).toBe("");
  });

  it("당첨 경품이 없으면 빈칸이다", () => {
    expect(lines(buildCsv(zones, [row()]))[1].split(",")[4]).toBe("");
  });

  it("당첨 경품이 여러 개면 세미콜론으로 잇는다", () => {
    const csv = buildCsv(zones, [row({ prizes: ["5등 경품", "2등 경품"] })]);
    expect(lines(csv)[1].split(",")[4]).toBe("5등 경품;2등 경품");
  });

  it("당첨 경품이 마지막 열이다 (지급 시각 열은 없다)", () => {
    const csv = buildCsv(zones, [row({ prizes: ["5등 경품"] })]);
    expect(lines(csv)[1]).toBe("7,,,,5등 경품");
  });
});

describe("칸 다듬기", () => {
  it("쉼표가 든 값은 큰따옴표로 감싼다", () => {
    expect(escapeField("로비, 1층")).toBe('"로비, 1층"');
    expect(lines(buildCsv([{ name: "로비, 1층" }], []))[0]).toBe('참가번호,"로비, 1층",완주,당첨 경품');
  });

  it("큰따옴표가 든 값은 두 개로 바꾸고 감싼다", () => {
    expect(escapeField('A "특별" 존')).toBe('"A ""특별"" 존"');
  });

  it("줄바꿈이 든 값은 감싼다", () => {
    expect(escapeField("1층\n로비")).toBe('"1층\n로비"');
    expect(escapeField("1층\r로비")).toBe('"1층\r로비"');
  });

  it("특수문자가 없으면 그대로, null 은 빈 문자열", () => {
    expect(escapeField("구역 1")).toBe("구역 1");
    expect(escapeField(null)).toBe("");
  });
});

describe("시각 표기", () => {
  it('UTC ISO 를 한국 시간 "YYYY-MM-DD HH:mm:ss" 로 바꾼다', () => {
    expect(formatTime("2026-10-27T08:05:00+00:00")).toBe("2026-10-27 17:05:00");
  });

  it("날짜가 넘어가는 경우도 맞다", () => {
    expect(formatTime("2026-10-27T16:30:00+00:00")).toBe("2026-10-28 01:30:00");
  });

  it("한 자리 월·일·시는 0 을 붙인다", () => {
    expect(formatTime("2026-01-05T00:07:09+00:00")).toBe("2026-01-05 09:07:09");
  });

  it("Z 표기와 밀리초가 붙은 값도 읽는다", () => {
    expect(formatTime("2026-10-27T08:05:00.123Z")).toBe("2026-10-27 17:05:00");
  });

  it("Supabase 가 주는 마이크로초 6자리 형식도 읽는다", () => {
    expect(formatTime("2026-10-27T08:05:00.123456+00:00")).toBe("2026-10-27 17:05:00");
  });

  it("null 은 빈 문자열", () => {
    expect(formatTime(null)).toBe("");
  });
});
