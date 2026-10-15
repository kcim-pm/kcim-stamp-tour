// lib/csv.ts — 참가자 현황 CSV 생성 (순수 함수, 단위 테스트 대상)
//
// DB 를 읽지 않는다. 구역 목록과 참가자 행을 인자로 받아 문자열 하나를 돌려준다.
// Route Handler(GET /api/admin/export)가 이 문자열을 text/csv 로 내려보낸다.
// 형식은 spec 5.3 export, D-17.

// 엑셀이 UTF-8 로 읽어 한글이 깨지지 않게 맨 앞에 붙인다.
// 이스케이프로 쓴다. 글자 그대로 넣으면 보이지 않아 에디터가 지워도 모른다.
const BOM = "﻿";
// 엑셀 기준 줄 끝. 마지막 줄 뒤에도 붙인다.
const CRLF = "\r\n";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type CsvZone = { name: string };

export type CsvRow = {
  participantNo: number;
  visitedAt: (string | null)[]; // zones 와 같은 길이. 미방문은 null
  completed: boolean;
  prizes: string[]; // 확정(confirmed)된 당첨 경품 이름만
  giftGivenAt: (string | null)[]; // prizes 와 같은 길이. 미지급은 null
};

// 쉼표, 큰따옴표, 줄바꿈이 있으면 전체를 큰따옴표로 감싸고 안의 큰따옴표는 두 개로.
// 구역 이름(D-15 확정 대기)이나 경품 이름에 쉼표가 들어와도 열이 밀리지 않게.
export function escapeField(value: string | null): string {
  if (value === null) return "";
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

const pad = (n: number) => String(n).padStart(2, "0");

// DB 의 UTC ISO 문자열을 한국 시간 "YYYY-MM-DD HH:mm:ss" 로 바꾼다 (10/15 결정).
// toLocaleString 대신 +9시간 한 값을 UTC 필드로 읽어 조립한다. Netlify 서버의 시간대 설정에 영향받지 않는다.
export function formatTime(iso: string | null): string {
  if (iso === null) return "";
  const d = new Date(Date.parse(iso) + KST_OFFSET_MS);
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

// visitedAt 의 길이·순서가 zones 와 같은지는 검사하지 않는다. 호출자(GET /api/admin/export)가
// 구역 sort 순서대로 채워야 열이 밀리지 않는다.
export function buildCsv(zones: CsvZone[], rows: CsvRow[]): string {
  const header = ["참가번호", ...zones.map((z) => z.name), "완주", "당첨 경품", "지급 시각"];

  const body = rows.map((r) => [
    String(r.participantNo),
    ...r.visitedAt.map(formatTime),
    r.completed ? "Y" : "",
    r.prizes.join(";"),
    r.giftGivenAt.map(formatTime).join(";"),
  ]);

  const lines = [header, ...body].map((cells) => cells.map(escapeField).join(","));
  return BOM + lines.map((line) => line + CRLF).join("");
}
