// /admin/draw — 추첨·발표 화면 (spec 3.4). 서버 컴포넌트.
// 로그인을 확인하고 발표 화면 본체를 띄운다. 데이터는 본체가 API 로 불러온다.
// 프로젝터용이라 화면 전체(가로 16:9)를 채운다. 참가자 화면의 휴대폰 폭 틀은 쓰지 않는다.
import { requireAdminPage } from "@/lib/admin-session";
import { DrawScreen } from "./_components/draw-screen";

export default async function DrawPage() {
  // try 안에서 부르지 않는다. 페이지 이동이 예외 방식으로 동작한다.
  await requireAdminPage("/admin/draw");
  return <DrawScreen />;
}
