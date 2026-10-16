// /manual — 이용 매뉴얼 (spec 3.1). 서버 컴포넌트, 정적 페이지.
// 참가자 가이드 · 운영자 가이드 · 자주 묻는 질문을 한 페이지에 두고, 위쪽 탭은 같은 페이지 안의 구역으로 이동한다.
// 화면 배치는 바뀔 수 있으므로 버튼 위치보다 「무엇을 하면 어떻게 되는지」 흐름 위주로 쓴다.
// 이미지는 public/manual/ 에 있고 scripts/capture-manual.mjs 로 다시 찍는다.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용 안내 · KCIM BIMlize Con 2026 스탬프 투어",
};

type Step = { title: string; body: string[]; image?: { src: string; alt: string; wide?: boolean } };
type StepGroup = { heading: string; steps: Step[] };
type Faq = { q: string; a: string };

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
    ],
  },
  {
    title: "[방문 인증하기]를 눌러 스탬프를 받아요",
    body: [
      "버튼을 누르면 「인증 완료!」 안내와 함께 그 구역의 스탬프가 찍힙니다. 아래쪽에서 지금까지 모은 스탬프를 볼 수 있습니다.",
      "같은 구역에서 여러 번 눌러도 스탬프는 한 번만 찍힙니다.",
    ],
    image: { src: "/manual/participant-verified.png", alt: "인증 완료 안내와 스탬프 현황이 보이는 화면" },
  },
  {
    title: "모든 구역을 돌면 추첨에 자동으로 응모돼요",
    body: [
      "5곳의 스탬프를 모두 모으면 「완주 성공!」 화면이 나옵니다. 이때 경품 추첨에 자동으로 응모되므로 따로 신청할 필요가 없습니다.",
    ],
    image: { src: "/manual/participant-complete.png", alt: "완주 성공 화면. 트로피와 내 참가번호가 크게 보인다" },
  },
  {
    title: "무대 발표에서 당첨 번호를 확인해요",
    body: [
      "추첨은 행사가 끝날 무렵 진행하고, 당첨 번호는 무대 화면에 발표됩니다. 휴대폰 화면에는 당첨 여부가 표시되지 않으니 발표를 꼭 확인해 주세요.",
      "내 번호가 나오면 스태프에게 명찰을 보여 주고 선물을 받으면 됩니다.",
    ],
  },
];

const PARTICIPANT_TIP: Step = {
  title: "QR 없이 내 스탬프 확인하기",
  body: [
    "이 페이지 맨 위의 [스탬프 투어로]를 누르거나 아무 QR이나 다시 찍은 뒤, 참가번호를 넣고 [현황 확인하기]를 누르면 지금까지 모은 스탬프를 볼 수 있습니다.",
    "휴대폰을 바꾸었거나 기록이 사라졌을 때도 같은 번호를 입력하면 그대로 다시 보입니다. 스탬프는 휴대폰이 아니라 서버에 저장되어 있기 때문입니다.",
  ],
  image: { src: "/manual/participant-lookup.png", alt: "QR 없이 들어와 참가번호로 현황을 확인하는 화면" },
};

const OPERATOR_GROUPS: StepGroup[] = [
  {
    heading: "행사 전 준비",
    steps: [
      {
        title: "관리자 화면에 들어가요",
        body: [
          "노트북 브라우저에서 사이트 주소 뒤에 /admin 을 붙여 들어갑니다. 담당자에게 받은 관리자 비밀번호를 입력하면 관리자 화면이 열립니다.",
          "한 번 로그인하면 12시간 동안 유지됩니다. 행사 당일 아침에 다시 로그인해 두면 추첨이 끝날 때까지 끊기지 않습니다.",
        ],
        image: { src: "/manual/admin-login.png", alt: "관리자 비밀번호를 입력하는 로그인 화면", wide: true },
      },
      {
        title: "경품을 추첨할 순서대로 등록해요",
        body: [
          "관리자 화면의 경품 목록에 경품 이름과 당첨 인원을 적고 저장합니다. 추첨은 목록의 위에서부터 한 경품씩 진행되므로, 먼저 뽑을 경품을 위에 둡니다. 순서는 화살표로 바꿀 수 있습니다.",
          "한 번 추첨을 시작한 경품은 결과를 지키기 위해 이름·인원·순서를 바꿀 수 없게 잠깁니다. 경품 정보는 추첨 전에 확정해 두세요.",
        ],
        image: { src: "/manual/admin-prizes.png", alt: "경품 이름과 당첨 인원을 적는 경품 목록 표", wide: true },
      },
      {
        title: "QR 포스터를 인쇄해 구역마다 붙여요",
        body: [
          "관리자 화면에서 QR 인쇄 페이지를 열고 인쇄하면 구역별 포스터가 A4 한 장씩 나옵니다.",
          "포스터마다 구역 이름이 적혀 있으니 맞는 구역에 붙이고, 붙인 뒤 휴대폰으로 직접 찍어 그 구역 이름이 나오는지 확인합니다.",
        ],
        image: { src: "/manual/admin-qr.png", alt: "QR 인쇄 페이지. QR 코드는 보안을 위해 가려 두었다", wide: true },
      },
    ],
  },
  {
    heading: "행사 중",
    steps: [
      {
        title: "참여 현황을 지켜봐요",
        body: [
          "관리자 화면에서 전체 참가자 수, 완주한 사람 수, 아직 도는 중인 사람 수와 참가자별 스탬프 현황을 볼 수 있습니다.",
          "화면은 1분마다 저절로 새로고침됩니다. 30분이 지나면 자동 새로고침이 꺼지므로, 계속 보려면 다시 켜거나 [새로고침]을 누르세요.",
          "장난이나 오타로 생긴 번호는 목록에서 삭제할 수 있습니다. 삭제하면 그 번호의 스탬프와 당첨 기록도 함께 지워집니다.",
        ],
        image: { src: "/manual/admin-console.png", alt: "참가자 수 통계와 참가자 목록이 보이는 관리자 화면", wide: true },
      },
    ],
  },
  {
    heading: "경품 추첨",
    steps: [
      {
        title: "발표 화면을 프로젝터에 띄워요",
        body: [
          "관리자 화면에서 [발표 화면 열기]를 누르면 발표 화면이 새 창으로 열립니다. 이 창을 프로젝터 쪽 화면으로 옮기고 F11 키로 전체 화면을 만듭니다.",
          "관리자 화면은 노트북 화면에 그대로 둡니다. 추첨 효과음이 나오므로 스피커도 연결해 두세요.",
        ],
      },
      {
        title: "추첨을 시작해요",
        body: [
          "발표 화면에는 지금 차례인 경품과 추첨 후보 수가 나옵니다. 후보는 5곳을 모두 돈 완주자입니다.",
          "「이전 당첨자 제외」가 켜져 있으면 앞선 경품에 당첨된 사람은 후보에서 빠집니다. 당첨 인원은 등록한 값으로 채워져 있고, 필요하면 이 자리에서 바꿀 수 있습니다.",
          "[추첨 시작]을 누르면 번호가 돌아가다가 당첨 번호가 나옵니다.",
        ],
        image: { src: "/manual/draw-ready.png", alt: "추첨 전 발표 화면. 경품 이름, 후보 수, 당첨 인원이 보인다", wide: true },
      },
      {
        title: "자리에 없는 당첨자는 다시 뽑아요",
        body: [
          "처음 나온 결과는 아직 임시입니다. 당첨 번호를 불러 현장에 없는 사람이 있으면, 그 번호를 눌러 선택하고 [선택 번호 재추첨]을 누릅니다. 선택한 자리만 새 번호로 바뀝니다.",
          "확정하기 전까지는 몇 번이든 다시 뽑을 수 있습니다. 다시 뽑힌 부재자는 같은 경품에서는 다시 나오지 않습니다.",
        ],
        image: { src: "/manual/draw-result.png", alt: "임시 결과 화면. 부재자 번호 하나가 선택되어 있다", wide: true },
      },
      {
        title: "당첨을 확정하고 다음 경품으로 넘어가요",
        body: [
          "모든 당첨자가 현장에 있으면 [당첨 확정]을 누릅니다. 결과가 저장되고, 화면 옆의 당첨 현황에 경품별로 쌓입니다.",
          "확정은 되돌릴 수 없습니다. 부재자를 모두 확인한 뒤에 눌러 주세요. 확정한 뒤 [다음 경품 →]을 누르면 다음 경품의 추첨 준비 화면으로 넘어갑니다.",
        ],
        image: { src: "/manual/draw-confirmed.png", alt: "당첨이 확정된 화면. 오른쪽에 경품별 당첨 현황이 보인다", wide: true },
      },
      {
        title: "지난 결과를 다시 보여 줄 수 있어요",
        body: ["[이전 결과]를 누르면 이미 확정한 경품을 골라 당첨 번호를 다시 크게 띄울 수 있습니다."],
        image: { src: "/manual/draw-history.png", alt: "이전 결과 창. 확정한 경품 목록과 당첨 번호가 보인다", wide: true },
      },
      {
        title: "마지막 경품을 확정하면 추첨이 끝나요",
        body: [
          "마지막 경품까지 확정하면 「모든 추첨이 끝났습니다」 화면이 나옵니다. 마지막 경품의 당첨 번호는 옆의 당첨 현황이나 [이전 결과]에서 다시 볼 수 있습니다.",
        ],
        image: { src: "/manual/draw-finish.png", alt: "모든 추첨이 끝났다는 종료 화면", wide: true },
      },
    ],
  },
  {
    heading: "행사 후",
    steps: [
      {
        title: "명찰 번호를 확인하고 선물을 드려요",
        body: [
          "당첨자가 오면 명찰의 번호가 발표된 당첨 번호와 같은지 확인하고 선물을 드립니다. 선물을 줬는지는 시스템에 기록하지 않으므로, 필요하면 현장에서 따로 체크해 주세요.",
        ],
      },
      {
        title: "결과를 내려받고 로그아웃해요",
        body: [
          "관리자 화면에서 [CSV 내려받기]를 누르면 참가번호, 구역별 인증 시각, 완주 여부, 당첨 경품이 담긴 파일을 받을 수 있습니다. 엑셀에서 바로 열립니다.",
          "작업이 끝나면 [로그아웃]을 누릅니다.",
        ],
      },
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

const OPERATOR_FAQ: Faq[] = [
  {
    q: "당첨자가 자리에 없어요.",
    a: "확정하기 전이라면 그 번호를 선택하고 [선택 번호 재추첨]을 누르세요. 그 자리만 새로 뽑습니다.",
  },
  {
    q: "[당첨 확정]을 실수로 눌렀어요.",
    a: "화면에서는 되돌릴 수 없습니다. 추첨을 멈추고 개발 담당자에게 연락해 주세요.",
  },
  {
    q: "경품 이름이나 인원을 고칠 수 없어요.",
    a: "이미 추첨을 시작한 경품은 결과를 지키기 위해 잠깁니다. 아직 추첨하지 않은 경품만 고칠 수 있습니다.",
  },
  {
    q: "추첨 중에 발표 화면을 닫았거나 새로고침했어요.",
    a: "추첨 결과는 서버에 저장되어 있습니다. 관리자 화면에서 [발표 화면 열기]를 다시 누르면 하던 단계부터 이어집니다.",
  },
  {
    q: "관리자 화면에 방금 확정한 당첨 결과가 안 보여요.",
    a: "관리자 화면은 1분마다 새로고침됩니다. 바로 보려면 [새로고침]을 누르세요.",
  },
  {
    q: "효과음이 나오지 않아요.",
    a: "노트북 소리가 켜져 있는지, 스피커가 연결되어 있는지 확인해 주세요. 소리는 발표 화면에서 [추첨 시작]을 누른 뒤부터 나옵니다.",
  },
];

export default function ManualPage() {
  return (
    <main className="screen manual">
      <header className="header">
        <div className="header-title">
          BIMlize Con 2026 <em>이용 안내</em>
        </div>
        <a href="/">스탬프 투어로</a>
      </header>

      <nav className="manual-tabs" aria-label="안내 목차">
        <a href="#participant">참가자</a>
        <a href="#operator">운영자</a>
        <a href="#faq">자주 묻는 질문</a>
      </nav>

      <section id="participant" className="manual-section">
        <h1>참가자 가이드</h1>
        <p className="manual-lead">
          행사장의 5개 구역을 돌며 스탬프를 모으면 경품 추첨에 자동으로 응모됩니다. 휴대폰 카메라만 있으면 됩니다.
        </p>
        <StepList steps={PARTICIPANT_STEPS} />
        <div className="manual-tip">
          <StepCard step={PARTICIPANT_TIP} label="TIP" />
        </div>
      </section>

      <section id="operator" className="manual-section">
        <h1>운영자 가이드</h1>
        <p className="manual-lead">
          운영자는 노트북 한 대로 행사 전 준비, 참여 현황 확인, 경품 추첨, 결과 정리를 진행합니다. 관리자 화면은 노트북처럼 넓은 화면에서 쓰는 것을 기준으로 합니다.
        </p>
        {OPERATOR_GROUPS.map((group, gi) => (
          <div key={group.heading} className="manual-group">
            <h2>{group.heading}</h2>
            {/* 단계 번호는 묶음을 넘어 이어서 매긴다 */}
            <StepList steps={group.steps} start={1 + OPERATOR_GROUPS.slice(0, gi).reduce((n, g) => n + g.steps.length, 0)} />
          </div>
        ))}
      </section>

      <section id="faq" className="manual-section">
        <h1>자주 묻는 질문</h1>
        <h2>참가자</h2>
        <FaqList items={PARTICIPANT_FAQ} />
        <h2>운영자</h2>
        <FaqList items={OPERATOR_FAQ} />
      </section>

      <footer className="footer">
        <a href="#participant">맨 위로 ↑</a>
      </footer>
    </main>
  );
}

function StepList({ steps, start = 1 }: { steps: Step[]; start?: number }) {
  return (
    <ol className="manual-steps">
      {steps.map((step, i) => (
        <li key={step.title}>
          <StepCard step={step} label={String(start + i)} />
        </li>
      ))}
    </ol>
  );
}

function StepCard({ step, label }: { step: Step; label: string }) {
  return (
    <article className="card manual-step">
      <h3>
        <span className="manual-no">{label}</span>
        {step.title}
      </h3>
      {step.body.map((text) => (
        <p key={text}>{text}</p>
      ))}
      {step.image && (
        // 탭하면 원본 크기로 연다. 넓은 관리자 화면 이미지는 휴대폰 폭에서 글자가 작게 보이기 때문이다.
        <a href={step.image.src} target="_blank" rel="noreferrer" className={step.image.wide ? "manual-shot manual-shot-wide" : "manual-shot"}>
          {/* 이미지 크기가 화면마다 달라 next/image 대신 img 를 쓴다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.image.src} alt={step.image.alt} loading="lazy" />
        </a>
      )}
    </article>
  );
}

function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="manual-faq">
      {items.map((item) => (
        <details key={item.q} className="card">
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
