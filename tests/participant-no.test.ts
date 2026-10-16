import { describe, it, expect } from 'vitest';
import { normalizeParticipantNo } from '../lib/participant-no';

describe("참가자 번호 정규화", () => {
    it("앞자리 0을 제거하고 정수로 바꾼다", () => {
        expect(normalizeParticipantNo("007")).toBe(7);
        expect(normalizeParticipantNo("042")).toBe(42);
        expect(normalizeParticipantNo("123")).toBe(123);
    });

    it("세 자리를 넘으면 형식 오류이다", () => {
        expect(() => normalizeParticipantNo("0007")).toThrow("INVALID_PARTICIPANT_NO");
    });

    it("숫자 앞뒤 공백은 제거한다", () => {
        expect(normalizeParticipantNo(" 42 ")).toBe(42);
    });

    it("숫자가 아닌 글자가 섞이면 오류를 던진다", () => {
        expect(() => normalizeParticipantNo("7a")).toThrow("INVALID_PARTICIPANT_NO");
    });

    it("빈 값은 오류를 던진다", () => {
        expect(() => normalizeParticipantNo("")).toThrow("INVALID_PARTICIPANT_NO");
    });

    it.each([
        ["1", 1],
        ["999", 999],
    ])("%s 은 허용 범위 안이다 -> %i", (input, expected) => {
        expect(normalizeParticipantNo(input)).toBe(expected);
    });

    it.each([0, "000"])("값이 0이면 오류를 던진다: %s", (input) => {
        expect(() => normalizeParticipantNo(input)).toThrow("INVALID_PARTICIPANT_NO");
    });

    it("입력된 번호가 999보다 크다면 오류를 던진다", () => {
        expect(() => normalizeParticipantNo(1000)).toThrow("INVALID_PARTICIPANT_NO");
    });
});