import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LINK_CHANNELS, normalizeLinkValue, normalizeOptionalWebUrl } from "@/lib/link-channels";

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

async function assertPageOfCompany(pageId: string, companyId: string, linkId?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: page } = await supabaseAdmin.from("pages").select("id").eq("id", pageId).eq("company_id", companyId).maybeSingle();
  if (!page) throw new Error("Acesso negado.");
  if (linkId) {
    const { data: link } = await supabaseAdmin.from("page_links").select("id").eq("id", linkId).eq("page_id", pageId).maybeSingle();
    if (!link) throw new Error("Acesso negado.");
  }
  return supabaseAdmin;
}

async function assertLinkOfCompany(linkId: string, companyId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: link } = await supabaseAdmin.from("page_links").select("id, pages!inner(company_id)").eq("id", linkId).eq("pages.company_id", companyId).maybeSingle();
  if (!link) throw new Error("Acesso negado.");
  return supabaseAdmin;
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
    const websiteUrl = normalizeOptionalWebUrl(data.websiteUrl);
    const googleReviewUrl = normalizeOptionalWebUrl(data.googleReviewUrl);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("pages")
      .update({
        title: data.title,
        subtitle: data.subtitle || null,
        logo_url: data.logoUrl || null,
        google_review_url: googleReviewUrl,
      })
      .eq("id", data.pageId)
      .eq("company_id", data.companyId);
    await supabaseAdmin
      .from("companies")
      .update({ name: data.companyName, website_url: websiteUrl, logo_url: data.logoUrl || null })
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
    if (!LINK_CHANNELS.some((channel) => channel.value === data.kind)) throw new Error("Tipo de canal inválido.");
    const normalizedUrl = normalizeLinkValue(data.kind, data.url);
    const supabaseAdmin = await assertPageOfCompany(data.pageId, data.companyId, data.id);
    const payload = {
      page_id: data.pageId,
      kind: data.kind,
      label: data.label,
      url: normalizedUrl,
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
    const supabaseAdmin = await assertLinkOfCompany(data.id, data.companyId);
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

async function assertPlateOfCompany(supabase: any, plateId: string, companyId: string) {
  const { data: plate } = await supabase.from("plates").select("id").eq("id", plateId).eq("company_id", companyId).maybeSingle();
  if (!plate) throw new Error("Plaquinha não encontrada.");
}

/** Short nickname (e.g. "Mesa 04"); works even with an expired subscription. */
export const setPlateLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { companyId: string; plateId: string; label: string }) => ({ ...data, label: String(data.label ?? "").trim().slice(0, 40) }))
  .handler(async ({ data, context }) => {
    await assertPlateOfCompany(context.supabase, data.plateId, data.companyId);
    const { error } = await context.supabase.from("plates").update({ label: data.label || null }).eq("id", data.plateId);
    if (error) throw new Error("Não foi possível salvar o apelido.");
    return { ok: true };
  });

/** Gives one plate its own page (copy of the default page) or returns it to the shared page. */
export const setPlateCustomPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { companyId: string; plateId: string; custom: boolean }) => data)
  .handler(async ({ data, context }) => {
    await assertCanEdit(context.supabase, context.userId, data.companyId);
    await assertPlateOfCompany(context.supabase, data.plateId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pages } = await supabaseAdmin.from("pages").select("*").eq("company_id", data.companyId).order("created_at", { ascending: true });
    const main = pages?.[0];
    if (!main) throw new Error("Página não encontrada.");
    if (main.plate_id === data.plateId) throw new Error("Esta plaquinha já usa a página padrão.");
    const own = pages?.find((pg) => pg.plate_id === data.plateId);
    if (data.custom && !own) {
      const { data: created, error } = await supabaseAdmin.from("pages").insert({
        plate_id: data.plateId, company_id: data.companyId, title: main.title, subtitle: main.subtitle,
        logo_url: main.logo_url, google_review_url: main.google_review_url, menu_enabled: main.menu_enabled, menu: main.menu,
      }).select("id").single();
      if (error || !created) throw new Error("Não foi possível criar a página.");
      const { data: links } = await supabaseAdmin.from("page_links").select("kind, label, url, position, active").eq("page_id", main.id);
      if (links?.length) await supabaseAdmin.from("page_links").insert(links.map((l) => ({ ...l, page_id: created.id })));
    }
    if (!data.custom && own) {
      await supabaseAdmin.from("page_links").delete().eq("page_id", own.id);
      await supabaseAdmin.from("pages").delete().eq("id", own.id);
    }
    await supabaseAdmin.from("audit_logs").insert({ user_id: context.userId, action: data.custom ? "page.custom" : "page.shared", entity: "plates", entity_id: data.plateId });
    return { ok: true };
  });

export const saveMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { companyId: string; pageId: string; enabled: boolean; items: { c: string; n: string; d?: string; p: number }[] }) => {
    const items = (data.items ?? []).slice(0, 150).map((i) => ({
      c: String(i.c ?? "").trim().slice(0, 40),
      n: String(i.n ?? "").trim().slice(0, 60),
      d: String(i.d ?? "").trim().slice(0, 120) || undefined,
      p: Math.round(Math.max(0, Number(i.p) || 0) * 100) / 100,
    })).filter((i) => i.n);
    return { ...data, enabled: !!data.enabled, items };
  })
  .handler(async ({ data, context }) => {
    await assertCanEdit(context.supabase, context.userId, data.companyId);
    const supabaseAdmin = await assertPageOfCompany(data.pageId, data.companyId);
    const { error } = await supabaseAdmin.from("pages").update({ menu_enabled: data.enabled, menu: data.items }).eq("id", data.pageId);
    if (error) throw new Error("Não foi possível salvar o cardápio.");
    return { ok: true };
  });

export const getAddons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { companyId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("company_addons", { _company_id: data.companyId });
    if (error) throw new Error("Não foi possível carregar os recursos adicionais.");
    return res as Record<"waiter" | "menu", { active: boolean; free: boolean; expiresAt: string | null; cycle: string | null; quantity: number; pending: boolean; monthly: number; annual: number }>;
  });

export const requestAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { companyId: string; addon: "waiter" | "menu"; cycle: "monthly" | "annual" }) => data)
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("request_addon", { _company_id: data.companyId, _addon: data.addon, _cycle: data.cycle });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; alreadyPending: boolean };
  });
