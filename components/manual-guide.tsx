// components/manual-guide.tsx — 매뉴얼 단계 카드·FAQ 목록 (표시 전용, 서버 컴포넌트에서 그대로 쓴다)
// 참가자 매뉴얼(/manual)과 운영자 가이드(/admin/manual)가 같은 모양을 쓰므로 여기에 둔다.
// 문구 배열은 각 페이지 파일 위쪽에 있다.

export type Step = { title: string; body: string[]; image?: { src: string; alt: string; wide?: boolean } };
export type StepGroup = { heading: string; steps: Step[] };
export type Faq = { q: string; a: string };

export function StepList({ steps, start = 1 }: { steps: Step[]; start?: number }) {
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

export function StepCard({ step, label }: { step: Step; label: string }) {
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

/* 묶음(행사 전 준비 → 행사 중 → …)별로 소제목을 달고, 단계 번호는 묶음을 넘어 이어서 매긴다 */
export function StepGroups({ groups }: { groups: StepGroup[] }) {
  return (
    <>
      {groups.map((group, gi) => (
        <div key={group.heading} className="manual-group">
          <h2>{group.heading}</h2>
          <StepList steps={group.steps} start={1 + groups.slice(0, gi).reduce((n, g) => n + g.steps.length, 0)} />
        </div>
      ))}
    </>
  );
}

export function FaqList({ items }: { items: Faq[] }) {
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
