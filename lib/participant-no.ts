// 오류 메시지
const INVALID = "INVALID_PARTICIPANT_NO";

// 자릿수 검사. "0007" 은 값은 7 이지만 네 자리라 여기서 걸린다.
const ONE_TO_THREE_DIGITS = /^\d{1,3}$/;

export function normalizeParticipantNo(input: string | number): number {
  const text = String(input).trim();

  if (!ONE_TO_THREE_DIGITS.test(text)) {
    throw new Error(INVALID);
  }

  const no = parseInt(text, 10);

  // "000" 은 정규식은 통과하지만 값이 0 이라 여기서 걸린다.
  if (no < 1 || no > 999) {
    throw new Error(INVALID);
  }

  return no;
}
