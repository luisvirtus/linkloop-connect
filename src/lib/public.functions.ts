import { createServerFn } from "@tanstack/react-start";
import { normalizeLinkValue, normalizeOptionalWebUrl } from "@/lib/link-channels";

export type PublicLink = { id: string; kind: string; label: string; url: string };

export type PublicPage = {
  state: "ok" | "blocked" | "notfound" | "unlinked" | "expired";
  companyName?: string;
  title?: string;
  subtitle?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  googleReviewUrl?: string | null;
  links: PublicLink[];
  annualPrice?: number | undefined;
  plateLabel?: string | null;
  menu?: { c: string; n: string; d?: string; p: number }[] | null;
  orderPhone?: string | null;
};

export const getPublicPage = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string }) => ({ code: String(data.code).trim().toUpperCase() }))
  .handler(async ({ data }): Promise<PublicPage> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();
    const { data: probe, error: probeError } = await supabase.rpc("public_plate_state", { _code: data.code });
    if (probeError) throw new Error("Não foi possível consultar a plaquinha.");
    const state = probe as { state: PublicPage["state"]; annualPrice?: number };
    if (state.state !== "ok") return { state: state.state, annualPrice: state.annualPrice, links: [] };

    const { data: plate } = await supabase
      .from("plates")
      .select("id, status, company_id, blocked_by_client, blocked_by_admin, label")
      .eq("qr_code", data.code)
      .maybeSingle();

    if (!plate) {
      // Row is hidden by policy when blocked or not linked; distinguish via admin-free probe.
      return { state: "notfound", links: [] };
    }
    if (!plate.company_id) return { state: "unlinked", links: [] };

    // Unified page by default: the plate's own page when customized, else the company's first page.
    const cols = "id, title, subtitle, logo_url, google_review_url, company_id, menu_enabled, menu";
    let { data: page } = await supabase.from("pages").select(cols).eq("plate_id", plate.id).maybeSingle();
    if (!page) {
      ({ data: page } = await supabase.from("pages").select(cols).eq("company_id", plate.company_id).order("created_at", { ascending: true }).limit(1).maybeSingle());
    }

    const { data: companyRows, error: companyError } = await supabase.rpc("public_company_by_code", {
      _code: data.code,
    });
    if (companyError) throw new Error("Não foi possível carregar esta empresa.");
    const company = companyRows?.[0];

    // Subscription rows are private. This narrowly scoped function exposes only
    // whether this company's public page may show its configured links.
    const { data: subscriptionActive } = await supabase.rpc("is_company_subscription_active", {
      _company_id: plate.company_id,
    });

    const expired = subscriptionActive !== true;
    const { data: addonState } = await supabase.rpc("company_addons", { _company_id: plate.company_id });
    const addons = (addonState ?? {}) as { waiter?: { active: boolean }; menu?: { active: boolean } };

    let links: PublicLink[] = [];
    if (page) {
      const { data: rows } = await supabase
        .from("page_links")
        .select("id, kind, label, url")
        .eq("page_id", page.id)
        .eq("active", true)
        .order("position", { ascending: true });
      const label = plate.label?.trim();
      links = (rows ?? []).flatMap((link) => {
        if (link.kind === "waiter" && !addons.waiter?.active) return [];
        try {
          let url = normalizeLinkValue(link.kind, link.url);
          if (link.kind === "waiter") url += `?text=${encodeURIComponent(`Olá! ${label || "Um cliente"} está solicitando atendimento.`)}`;
          return [{ ...link, url }];
        } catch {
          return [];
        }
      });
    }

    return {
      state: expired ? "expired" : "ok",
      companyName: company?.name ?? "Empresa",
      title: page?.title ?? company?.name ?? "Empresa",
      subtitle: page?.subtitle ?? null,
      logoUrl: page?.logo_url ?? company?.logo_url ?? null,
      websiteUrl: normalizeOptionalWebUrl(company?.website_url),
      googleReviewUrl: normalizeOptionalWebUrl(page?.google_review_url),
      links,
      plateLabel: plate.label ?? null,
      menu: addons.menu?.active && page?.menu_enabled && Array.isArray(page.menu) && page.menu.length ? (page.menu as NonNullable<PublicPage["menu"]>) : null,
      orderPhone: (() => {
        const l = links.find((x) => x.kind === "waiter") ?? links.find((x) => x.kind === "whatsapp");
        return l?.url.match(/wa\.me\/(\d+)/)?.[1] ?? null;
      })(),
    };
  });
