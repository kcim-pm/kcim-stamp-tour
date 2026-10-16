// 전체 구역이 0곳이면 완주가 아니다. 구역 데이터가 비어 있는 비정상 상태를 완주로 보지 않는다.
// 방문 수가 전체 수보다 많아도 완주가 아니다.
export function isCompleted(visitedCount: number, zoneCount: number): boolean {
  return zoneCount > 0 && visitedCount === zoneCount;
}
