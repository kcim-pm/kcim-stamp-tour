import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function requireEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name} 이(가) 비어 있다. .env.local 또는 Netlify 환경변수를 확인할 것`);
  }
  return value;
}

// 처음 부를 때 한 번만 만들고 이후에는 같은 클라이언트를 돌려준다.
export function getSupabase(): SupabaseClient {
  if (client) return client;

  client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      // 서버는 로그인 상태를 가질 필요가 없다. 세션 저장·갱신을 전부 끈다.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return client;
}
