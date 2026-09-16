import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EXPIRED_MSG = "Para alterar as informações da sua página, é necessário renovar sua assinatura.";

async function assertCanEdit(supabase: any, userId: string, companyId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!company) throw new Error("Acesso negado.");
  }
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("expires_at")
    .eq("company_id", companyId)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const active = !!sub && new Date(sub.expires_at).getTime() > Date.now();
  if (!active && !isAdmin) throw new Error(EXPIRED_MSG);
  return { isAdmin: !!isAdmin };
}

export const savePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      companyId: string;
      pageId: string;
      title: string;
      subtitle?: string | null;
      logoUrl?: string | null;
      googleReviewUrl?: string | null;
      websiteUrl?: string | null;
      companyName: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertCanEdit(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("pages")
      .update({
        title: data.title,
        subtitle: data.subtitle || null,
        logo_url: data.logoUrl || null,
        google_review_url: data.googleReviewUrl || null,
      })
      .eq("id", data.pageId)
      .eq("company_id", data.companyId);
    await supabaseAdmin
      .from("companies")
      .update({ name: data.companyName, website_url: data.websiteUrl || null, logo_url: data.logoUrl || null })
      .eq("id", data.companyId);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "page.update",
      entity: "pages",
      entity_id: data.pageId,
    });
    return { ok: true };
  });

export const saveLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      companyId: string;
      pageId: string;
      id?: string | null;
      kind: string;
      label: string;
      url: string;
      position?: number;
      active?: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertCanEdit(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      page_id: data.pageId,
      kind: data.kind,
      label: data.label,
      url: data.url,
      position: data.position ?? 0,
      active: data.active ?? true,
    };
    if (data.id) {
      await supabaseAdmin.from("page_links").update(payload).eq("id", data.id);
    } else {
      await supabaseAdmin.from("page_links").insert(payload);
    }
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: data.id ? "link.update" : "link.create",
      entity: "page_links",
      entity_id: data.id ?? data.pageId,
      details: { label: data.label },
    });
    return { ok: true };
  });

export const deleteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { companyId: string; id: string }) => data)
  .handler(async ({ data, context }) => {
    await assertCanEdit(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("page_links").delete().eq("id", data.id);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "link.delete",
      entity: "page_links",
      entity_id: data.id,
    });
    return { ok: true };
  });

/** Blocking works even with an expired subscription. */
export const setPlateBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { plateId: string; blocked: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { data: plate } = await context.supabase
      .from("plates")
      .select("id, company_id")
      .eq("id", data.plateId)
      .maybeSingle();
    if (!plate) throw new Error("Plaquinha não encontrada.");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) {
      const { data: company } = await context.supabase
        .from("companies")
        .select("id")
        .eq("id", plate.company_id!)
        .eq("owner_id", context.userId)
        .maybeSingle();
      if (!company) throw new Error("Acesso negado.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("plates").update({ blocked_by_client: data.blocked }).eq("id", data.plateId);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: data.blocked ? "plate.block" : "plate.unblock",
      entity: "plates",
      entity_id: data.plateId,
    });
    return { ok: true };
  });

/** Manual renewal record until the Stripe integration is turned on. */
export const requestRenewal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { companyId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: company } = await context.supabase
      .from("companies")
      .select("id")
      .eq("id", data.companyId)
      .maybeSingle();
    if (!company) throw new Error("Acesso negado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin.from("settings").select("*").eq("id", true).maybeSingle();
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("company_id", data.companyId)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: existing } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("kind", "renewal")
      .eq("status", "pending")
      .maybeSingle();
    if (existing) return { ok: true, paymentId: existing.id, alreadyPending: true };
    const payment = await supabaseAdmin
      .from("payments")
      .insert({
        company_id: data.companyId,
        subscription_id: sub?.id ?? null,
        kind: "renewal",
        amount: Number(settings?.subscription_price ?? 0),
        status: "pending",
      })
      .select("id")
      .single();
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "subscription.renewal_requested",
      entity: "companies",
      entity_id: data.companyId,
    });
    return { ok: true, paymentId: payment.data?.id ?? null, alreadyPending: false };
  });
