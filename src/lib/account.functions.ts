import { createServerFn } from "@tanstack/react-start";
import { parseContact, type Contact } from "@/lib/registration";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AccountPlate = {
  id: string;
  serial: number;
  qr_code: string;
  size: string;
  status: string;
  blocked_by_client: boolean;
  blocked_by_admin: boolean;
  linked_at: string | null;
  label: string | null;
};

export type MenuItem = { c: string; n: string; d?: string; p: number };
export type AccountPage = {
  id: string; plate_id: string; title: string; subtitle: string | null; logo_url: string | null;
  google_review_url: string | null; menu_enabled: boolean; menu: MenuItem[];
  links: { id: string; kind: string; label: string; url: string; position: number; active: boolean }[];
};

export type AccountData = {
  userId: string;
  email: string | null;
  name: string | null;
  roles: string[];
  isAdmin: boolean;
  seller: { id: string; name: string } | null;
  company: { id: string; name: string; website_url: string | null; logo_url: string | null; contact: Contact } | null;
  plates: AccountPlate[];
  page: {
    id: string;
    plate_id: string;
    title: string;
    subtitle: string | null;
    logo_url: string | null;
    google_review_url: string | null;
  } | null;
  links: { id: string; kind: string; label: string; url: string; position: number; active: boolean }[];
  pages: AccountPage[];
  subscription: { id: string; starts_at: string; expires_at: string; amount: number; status: string } | null;
  subscriptionActive: boolean;
  impersonating: boolean;
};

async function loadAccount(supabase: any, userId: string, companyId?: string | null): Promise<AccountData> {
  const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", userId).maybeSingle();
  const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles: string[] = (roleRows ?? []).map((r: { role: string }) => r.role);
  const isAdmin = roles.includes("admin");
  const { data: seller } = await supabase.from("sellers").select("id, name").eq("user_id", userId).maybeSingle();

  let company = null as AccountData["company"];
  if (companyId && isAdmin) {
    const { data } = await supabase
      .from("companies")
      .select("id, name, website_url, logo_url, contact")
      .eq("id", companyId)
      .maybeSingle();
    company = data ?? null;
  } else {
    const { data } = await supabase
      .from("companies")
      .select("id, name, website_url, logo_url, contact")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    company = data ?? null;
  }

  let plates: AccountPlate[] = [];
  let page: AccountData["page"] = null;
  let links: AccountData["links"] = [];
  let subscription: AccountData["subscription"] = null;
  let pages: AccountPage[] = [];

  if (company) {
    const { data: plateRows } = await supabase
      .from("plates")
      .select("id, serial, qr_code, size, status, blocked_by_client, blocked_by_admin, linked_at, label")
      .eq("company_id", company.id)
      .order("serial", { ascending: true });
    plates = plateRows ?? [];

    const { data: pageRows } = await supabase
      .from("pages")
      .select("id, plate_id, title, subtitle, logo_url, google_review_url, menu_enabled, menu")
      .eq("company_id", company.id)
      .order("created_at", { ascending: true });
    const ids = (pageRows ?? []).map((r: { id: string }) => r.id);
    const { data: linkRows } = ids.length
      ? await supabase.from("page_links").select("id, page_id, kind, label, url, position, active").in("page_id", ids).order("position", { ascending: true })
      : { data: [] };
    pages = (pageRows ?? []).map((r: any) => ({ ...r, menu: Array.isArray(r.menu) ? r.menu : [], links: (linkRows ?? []).filter((l: any) => l.page_id === r.id) }));
    page = pages[0] ?? null;
    links = pages[0]?.links ?? [];

    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("id, starts_at, expires_at, amount, status")
      .eq("company_id", company.id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    subscription = subRow ?? null;
  }

  return {
    userId,
    email: profile?.email ?? null,
    name: profile?.full_name ?? null,
    roles,
    isAdmin,
    seller: seller ?? null,
    company,
    plates,
    page,
    links,
    pages,
    subscription,
    subscriptionActive: !!subscription && subscription.status === "active" && new Date(subscription.expires_at).getTime() > Date.now(),
    impersonating: !!companyId && isAdmin,
  };
}

export const getAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { companyId?: string | null } | undefined) => ({ companyId: data?.companyId ?? null }))
  .handler(async ({ data, context }) => {
    const account = await loadAccount(context.supabase, context.userId, data.companyId);
    if (data.companyId && account.isAdmin && account.company) {
      await context.supabase.from("audit_logs").insert({
        user_id: context.userId,
        action: "admin.impersonate",
        entity: "companies",
        entity_id: account.company.id,
        details: { company: account.company.name },
      });
    }
    return account;
  });

export const getPlateByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => ({ code: String(data.code).trim().toUpperCase() }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plate } = await supabaseAdmin
      .from("plates")
      .select("id, serial, qr_code, size, status, company_id")
      .eq("qr_code", data.code)
      .maybeSingle();
    if (!plate) return { found: false as const };
    const mine = plate.company_id
      ? !!(
          await context.supabase.from("companies").select("id").eq("id", plate.company_id).maybeSingle()
        ).data
      : false;
    return {
      found: true as const,
      serial: plate.serial,
      code: plate.qr_code,
      size: plate.size,
      status: plate.status,
      available: plate.status === "available",
      mine,
    };
  });

export const linkPlate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string; companyName: string; googleReviewUrl?: string; contact: Contact; accepted: boolean; annualPrice: number }) => data)
  .handler(async ({ data, context }) => {
    const contact = parseContact(data.contact);
    if (!data.accepted) throw new Error("Confirme o aceite da anuidade.");
    const { data: result, error } = await context.supabase.rpc("activate_registered_plate", {
      _code: data.code.trim().toUpperCase(), _company_name: data.companyName.trim(),
      _review_url: data.googleReviewUrl?.trim() || "", _contact: contact,
      _accepted: data.accepted, _annual_price: data.annualPrice,
    });
    if (error) throw new Error(error.message);
    return result as { ok: true; companyId: string; pageId: string };
  });

export const saveAccountContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { companyId: string; contact: Contact }) => data)
  .handler(async ({ data, context }) => {
    const contact = parseContact(data.contact);
    const { data: company, error } = await context.supabase.from("companies").update({ contact }).eq("id", data.companyId).select("id").single();
    if (error || !company) throw new Error("Não foi possível salvar o cadastro.");
    return { ok: true };
  });

export const getQrOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: plate } = await context.supabase.from("plates").select("company_id").eq("qr_code", data.code).maybeSingle();
    if (!plate?.company_id) return { owner: false };
    const { data: company } = await context.supabase.from("companies").select("id").eq("id", plate.company_id).eq("owner_id", context.userId).maybeSingle();
    return { owner: !!company };
  });
