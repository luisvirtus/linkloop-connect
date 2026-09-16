import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSellerDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: seller } = await context.supabase
      .from("sellers")
      .select("id, name, email, active")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!seller) return { seller: null, sales: [], commissions: [], plates: [], totals: null };

    const { data: sales } = await context.supabase
      .from("sales")
      .select("id, amount, payment_status, sold_at, company_id, plate_id, companies(name), plates(serial, qr_code)")
      .eq("seller_id", seller.id)
      .order("sold_at", { ascending: false });

    const { data: commissions } = await context.supabase
      .from("commissions")
      .select("id, kind, amount, percent, base_amount, status, created_at, paid_at")
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false });

    const { data: plates } = await context.supabase
      .from("plates")
      .select("id, serial, qr_code, status, linked_at")
      .eq("seller_id", seller.id)
      .order("serial", { ascending: true });

    const list = commissions ?? [];
    const totals = {
      sales: (sales ?? []).length,
      revenue: (sales ?? []).reduce((acc, s) => acc + Number(s.amount), 0),
      pending: list.filter((c) => c.status === "pending").reduce((a, c) => a + Number(c.amount), 0),
      paid: list.filter((c) => c.status === "paid").reduce((a, c) => a + Number(c.amount), 0),
      renewals: list.filter((c) => c.kind === "renewal").length,
    };

    return { seller, sales: sales ?? [], commissions: list, plates: plates ?? [], totals };
  });
