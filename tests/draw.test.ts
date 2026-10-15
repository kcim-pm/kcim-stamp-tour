// tests/draw.test.ts — lib/draw.ts 가 풀어야 할 문제
//
// 난수는 고정 함수를 넣는다. 예: 항상 0 을 돌려주는 함수, 또는 미리 정한 숫자 배열을 순서대로 꺼내는 함수.
// Math.random 이나 crypto.randomInt 를 테스트에서 직접 쓰지 않는다.

// describe: 추첨 후보
//   it: excludePrevious 가 true 면 확정(confirmed) 당첨자를 뺀다
//       완주자 [1,2,3,4], 확정 당첨자 [2] → [1,3,4]
//   it: excludePrevious 가 false 면 확정 당첨자도 그대로 둔다
//       완주자 [1,2,3,4], 확정 당첨자 [2] → [1,2,3,4]
//   it: 부재자(absent)는 빼지 않는다 — 호출하는 쪽이 confirmed 만 넘기므로 여기서는 「넘기지 않은 번호는 남는다」로 확인
//       완주자 [1,2,3], 확정 당첨자 [] → [1,2,3]
//   it: 완주자 순서를 유지한다

// describe: 재추첨 후보
//   it: 이 회차의 당첨 기록(pending, absent 전부)을 뺀다
//       후보 [1,2,3,4,5], 이 회차 [2,4] → [1,3,5]
//   it: 이 회차 기록이 없으면 후보 그대로

// describe: 무작위 추출
//   it: 고정 난수로 결과가 재현된다
//       후보 [1,2,3,4,5], count 2, randomInt 가 항상 0 을 돌려주면 → 결과가 매번 같다 (값까지 적어 둔다)
//   it: 뽑힌 번호에 중복이 없다
//       후보 [1..10], count 10 → 10개 전부 서로 다르고 후보에 있는 번호
//   it: 뽑힌 번호는 모두 후보 안에 있다
//   it: count 가 후보 수보다 크면 후보 수만큼만 뽑힌다 (10/15 결정)
//       후보 [1,2], count 3 → 길이 2, [1,2] 를 섞은 것
//   it: 후보가 비어 있으면 NOT_ENOUGH_CANDIDATES
//       후보 [], count 1 → throw
//   it: count 가 후보 수와 같으면 전부 뽑힌다
//   it: count 가 0, 음수, 소수, 문자열이면 INVALID_WINNER_COUNT
//   it: 원본 후보 배열을 바꾸지 않는다
