import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPrintablePlate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { plateId: string }) => ({ plateId: String(data.plateId ?? "") }))
  .handler(async ({ data, context }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.plateId)) {
      throw new Error("Plaquinha não encontrada.");
    }
    const { data: plate, error } = await context.supabase
      .from("plates")
      .select("id, qr_code, size, company_id, seller_id")
      .eq("id", data.plateId)
      .maybeSingle();
    if (error || !plate) throw new Error("Plaquinha não encontrada ou sem permissão.");

    const [{ data: isAdmin }, { data: seller }, { data: company }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.from("sellers").select("id").eq("user_id", context.userId).maybeSingle(),
      plate.company_id
        ? context.supabase.from("companies").select("id, name, owner_id").eq("id", plate.company_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (!isAdmin && !(seller && seller.id === plate.seller_id) && !(company && company.owner_id === context.userId)) {
      throw new Error("Você não pode imprimir esta plaquinha.");
    }
    return {
      id: plate.id,
      qrCode: plate.qr_code,
      size: plate.size,
      companyName: company?.name ?? null,
    };
  });
