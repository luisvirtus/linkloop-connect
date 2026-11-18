import { createPublicClient } from "./supabase-public.server";
export async function getServiceFlags(code: string) {
  const { data } = await createPublicClient().rpc("public_service_flags", { _code: code });
  return (data ?? { waiterEnabled: false }) as { waiterEnabled: boolean };
}