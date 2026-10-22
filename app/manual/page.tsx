// /manual — 이용 안내 (spec 3.7). 서버 컴포넌트, 정적 페이지.
// 참가자 가이드와 참가자용 자주 묻는 질문만 담는다. 운영자 가이드는 로그인 뒤 /admin/manual 에서 본다.
// 화면 배치는 바뀔 수 있으므로 버튼 위치보다 「무엇을 하면 어떻게 되는지」 흐름 위주로 쓴다.
// 이미지는 public/manual/ 에 있다. 화면이 바뀌면 spec 3.7 작성 규칙대로 직접 다시 찍는다.
import type { Metadata } from "next";
import { FaqList, StepList, type Faq, type Step } from "@/components/manual-guide";
import { StickyHeader } from "@/components/sticky-header";

export const metadata: Metadata = {
  title: "이용 안내 · KCIM BIMlize Con 2026 스탬프 투어",
};

const PARTICIPANT_STEPS: Step[] = [
  {
    title: "구역에 붙은 QR 코드를 찍어요",
    body: [
      "행사장 곳곳에 스탬프 투어 포스터가 붙어 있습니다. 휴대폰 카메라로 포스터의 QR 코드를 찍으면 스탬프 투어 화면이 열리고, 지금 있는 구역 이름이 나옵니다.",
      "앱을 설치하거나 회원가입을 할 필요는 없습니다.",
    ],
    image: { src: "/manual/participant-scan.png", alt: "QR을 찍으면 나오는 화면. 현재 구역 이름과 참가번호 입력란이 보인다" },
  },
  {
    title: "참가번호를 입력해요",
    body: [
      "입장 명찰에 적힌 참가번호를 입력합니다.",
      "한 번 입력하면 휴대폰이 번호를 기억하므로, 다음 구역부터는 번호가 미리 채워져 있습니다.",
      "각 휴대폰 상황에 따라 번호가 기억되지 않을 수도 있습니다. 그럴 때는 참가번호를 다시 입력하면 됩니다.",
    ],
  },
  {
    title: "[방문 인증하기]를 눌러 스탬프를 받아요",
    body: [
      "버튼을 누르면 「인증 완료!」 안내와 함께 해당 구역의 스탬프가 찍힙니다. 아래쪽에서 지금까지 모은 스탬프를 볼 수 있습니다.",
      "같은 구역에서 여러 번 눌러도 스탬프는 한 번만 찍힙니다.",
    ],
    image: { src: "/manual/participant-verified.png", alt: "인증 완료 안내와 스탬프 현황이 보이는 화면" },
  },
  {
    title: "모든 구역을 돌면 추첨에 자동으로 응모돼요",
    body: [
      "5곳의 스탬프를 모두 모으면 「완주 성공!」 화면이 나옵니다. 완주 성공 시 경품 추첨에 자동 응모되므로 별도의 경품 추첨 신청 절차는 없습니다.",
    ],
    image: { src: "/manual/participant-complete.png", alt: "완주 성공 화면. 트로피와 내 참가번호가 크게 보인다" },
  },
  {
    title: "마지막 세션 종료 후 럭키 드로우 추첨이 진행돼요",
    body: [
      "럭키 드로우 추첨은 마지막 세션 종료 직후 진행되며, 당첨 번호는 무대 화면을 통해 발표됩니다. 휴대폰 화면에는 당첨 여부가 표시되지 않으니, 무대 화면을 꼭 확인해 주세요.",
      "당첨되신 분은 행사 종료 후 퇴장하실 때 출구 쪽 데스크에서 스태프에게 명찰을 보여주시고 경품을 수령해 주세요.",
    ],
  },
];

const PARTICIPANT_FAQ: Faq[] = [
  {
    q: "QR을 찍었는데 「잘못된 QR입니다」라고 나와요.",
    a: "포스터의 QR을 다시 찍어 주세요. 다른 곳에서 받은 링크나 주소를 직접 입력한 경우에도 이렇게 나옵니다. 계속 같은 안내가 나오면 가까운 스태프에게 알려 주세요.",
  },
  {
    q: "참가번호를 잘못 입력했어요.",
    a: "입력란의 번호를 올바른 번호로 고친 뒤 다시 버튼을 누르면 그 번호로 바뀝니다. 잘못된 번호로 받은 스탬프는 옮겨지지 않으므로, 해당 구역의 QR을 다시 찍어 인증해 주세요.",
  },
  {
    q: "휴대폰을 바꿨거나, 다시 들어왔더니 번호가 비어 있어요.",
    a: "카카오톡 같은 앱 안에서 열었거나 시크릿 모드를 쓰면 휴대폰이 번호를 기억하지 못할 수 있습니다. 같은 참가번호를 다시 입력하면 모은 스탬프가 그대로 보입니다.",
  },
  {
    q: "「연결에 실패했습니다」라고 나와요.",
    a: "인터넷 연결이 잠시 끊긴 경우입니다. 와이파이나 데이터 연결을 확인한 뒤 [다시 시도]를 눌러 주세요.",
  },
  {
    q: "같은 구역에서 여러 번 인증하면 스탬프가 더 쌓이나요?",
    a: "아니요. 구역마다 스탬프는 한 번만 찍힙니다. 다시 누르면 「이미 인증한 구역입니다」라고 나옵니다.",
  },
  {
    q: "당첨됐는지 휴대폰으로 확인할 수 있나요?",
    a: "아니요. 당첨 번호는 무대 화면에서만 발표됩니다. 발표 시간에 무대 화면을 확인해 주세요.",
  },
];

export default function ManualPage() {
  return (
    <main className="screen manual">
      <StickyHeader className="header header-bar header-with-back">
        <a href="/" className="header-back" aria-label="스탬프 투어로 돌아가기">
          <BackIcon />
        </a>
        <div className="header-title">
          BIMlize Con 2026 <em>이용 안내</em>
        </div>
      </StickyHeader>

      <section id="participant" className="manual-section">
        <h1>참여 방법</h1>
        <StepList steps={PARTICIPANT_STEPS} />
      </section>

      <section id="faq" className="manual-section">
        <h1>자주 묻는 질문</h1>
        <FaqList items={PARTICIPANT_FAQ} />
      </section>

      <footer className="footer">
        <a href="#participant">맨 위로 ↑</a>
      </footer>
    </main>
  );
}

/* 머리글 왼쪽 돌아가기 꺾쇠(<) */
function BackIcon() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 5-7 7 7 7" />
    </svg>
  );
}
