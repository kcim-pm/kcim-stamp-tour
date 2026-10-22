"use client";
// Lottie 애니메이션 플레이어 (public/lottie/*.lottie). 참가자 완주 카드의 트로피와 발표 화면 종료 장면의 선물이 함께 쓴다.
// 기본값은 한 번 재생하고 마지막 프레임에서 멈춘다. loop 를 주면 계속 돈다.
// 기기에서 「동작 줄이기」를 켰으면 재생하지 않고 마지막 프레임만 보여 준다.
// 부르는 쪽에서 next/dynamic(ssr: false)으로 불러오므로, 그 장면을 보는 사람만 플레이어를 내려받는다.
import { useEffect, useState } from "react";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";

type Props = {
  src?: string; // 기본은 완주 카드의 트로피(winner.lottie). 이전 트로피 trophy.lottie 는 파일만 남겨 둔다
  loop?: boolean;
};

export default function TrophyLottie({ src = "/lottie/winner.lottie", loop = false }: Props) {
  const [player, setPlayer] = useState<DotLottie | null>(null);
  const [reducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (!player || !reducedMotion) return;
    const showLastFrame = () => player.setFrame(player.totalFrames - 1);
    if (player.isLoaded) showLastFrame();
    player.addEventListener("load", showLastFrame);
    return () => player.removeEventListener("load", showLastFrame);
  }, [player, reducedMotion]);

  return (
    <DotLottieReact
      src={src}
      autoplay={!reducedMotion}
      loop={loop && !reducedMotion}
      dotLottieRefCallback={setPlayer}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
