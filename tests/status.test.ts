import { describe, it, expect } from "vitest";
import { buildStatus } from "../lib/status";

const zones = [
  { id: 1, code: "zone1", name: "구역 1", sort: 1 },
  { id: 2, code: "zone2", name: "구역 2", sort: 2 },
  { id: 3, code: "zone3", name: "구역 3", sort: 3 },
];

describe("현황 계산", () => {
  it("방문한 구역에는 visited 와 visitedAt 을, 안 한 구역에는 false 와 null 을 붙인다", () => {
    const visits = [{ zone_id: 2, visited_at: "2026-10-27T04:12:00Z" }];
    const status = buildStatus(7, zones, visits);

    expect(status.zones).toEqual([
      { code: "zone1", name: "구역 1", visited: false, visitedAt: null },
      { code: "zone2", name: "구역 2", visited: true, visitedAt: "2026-10-27T04:12:00Z" },
      { code: "zone3", name: "구역 3", visited: false, visitedAt: null },
    ]);
  });

  it("방문 수와 전체 구역 수를 세고 완주 여부를 붙인다", () => {
    const visits = [{ zone_id: 1, visited_at: "a" }];
    const status = buildStatus(7, zones, visits);

    expect(status.participantNo).toBe(7);
    expect(status.visitedCount).toBe(1);
    expect(status.zoneCount).toBe(3);
    expect(status.completed).toBe(false);
  });

  it("모든 구역을 방문하면 completed 가 true 다", () => {
    const visits = zones.map((z) => ({ zone_id: z.id, visited_at: "a" }));
    expect(buildStatus(7, zones, visits).completed).toBe(true);
  });

  it("방문 기록이 없으면 전부 미방문이고 completed 는 false 다", () => {
    const status = buildStatus(7, zones, []);
    expect(status.visitedCount).toBe(0);
    expect(status.completed).toBe(false);
    expect(status.zones.every((z) => !z.visited)).toBe(true);
  });

  it("구역 순서는 zones 배열 순서를 그대로 따른다", () => {
    const reversed = [...zones].reverse();
    const status = buildStatus(7, reversed, []);
    expect(status.zones.map((z) => z.code)).toEqual(["zone3", "zone2", "zone1"]);
  });

  it("응답에 당첨 관련 필드를 넣지 않는다", () => {
    const status = buildStatus(7, zones, []);
    expect(Object.keys(status).sort()).toEqual(
      ["completed", "participantNo", "visitedCount", "zoneCount", "zones"].sort(),
    );
  });
});
