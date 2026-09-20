import { createServerFn } from "@tanstack/react-start";

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
};

export const getPublicPage = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string }) => ({ code: String(data.code).trim().toUpperCase() }))
  .handler(async ({ data }): Promise<PublicPage> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();

    const { data: plate } = await supabase
      .from("plates")
      .select("id, status, company_id, blocked_by_client, blocked_by_admin")
      .eq("qr_code", data.code)
      .maybeSingle();

    if (!plate) {
      // Row is hidden by policy when blocked or not linked; distinguish via admin-free probe.
      return { state: "notfound", links: [] };
    }
    if (!plate.company_id) return { state: "unlinked", links: [] };

    const { data: page } = await supabase
      .from("pages")
      .select("id, title, subtitle, logo_url, google_review_url, company_id")
      .eq("plate_id", plate.id)
      .maybeSingle();

    const { data: company } = await supabase
      .from("companies")
      .select("name, website_url, logo_url")
      .eq("id", plate.company_id)
      .maybeSingle();

    // Subscription rows are private. This narrowly scoped function exposes only
    // whether this company's public page may show its configured links.
    const { data: subscriptionActive } = await supabase.rpc("is_company_subscription_active", {
      _company_id: plate.company_id,
    });

    const expired = subscriptionActive !== true;

    if (expired) {
      return {
        state: "expired",
        companyName: company?.name ?? page?.title ?? "Empresa",
        title: page?.title ?? company?.name ?? "Empresa",
        logoUrl: page?.logo_url ?? company?.logo_url ?? null,
        websiteUrl: company?.website_url ?? null,
        links: [],
      };
    }

    let links: PublicLink[] = [];
    if (page) {
      const { data: rows } = await supabase
        .from("page_links")
        .select("id, kind, label, url")
        .eq("page_id", page.id)
        .eq("active", true)
        .order("position", { ascending: true });
      links = rows ?? [];
    }

    return {
      state: "ok",
      companyName: company?.name ?? "Empresa",
      title: page?.title ?? company?.name ?? "Empresa",
      subtitle: page?.subtitle ?? null,
      logoUrl: page?.logo_url ?? company?.logo_url ?? null,
      websiteUrl: company?.website_url ?? null,
      googleReviewUrl: page?.google_review_url ?? null,
      links,
    };
  });
